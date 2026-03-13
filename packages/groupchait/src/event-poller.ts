/**
 * Polls Paperclip API for changes and emits typed events.
 *
 * Tracks state snapshots (issue statuses, agent statuses, comment counts)
 * and emits events when differences are detected. Uses watermark-based
 * dedup to avoid reprocessing old data.
 */

import { PaperclipClient, PaperclipAgent } from './paperclip-client';

// ── Event types ──

export interface IssueStatusChangedEvent {
  type: 'issue.status_changed';
  issueId: string;
  identifier: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  assigneeAgentId: string | null;
  projectId: string | null;
}

export interface IssueCommentAddedEvent {
  type: 'issue.comment_added';
  issueId: string;
  identifier: string;
  issueTitle: string;
  commentId: string;
  body: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  projectId: string | null;
}

export interface AgentStatusChangedEvent {
  type: 'agent.status_changed';
  agentId: string;
  name: string;
  title: string;
  urlKey: string;
  oldStatus: string;
  newStatus: string;
}

export interface ApprovalCreatedEvent {
  type: 'approval.created';
  approvalId: string;
  approvalType: string;
  requestedByAgentId: string | null;
  requestedByUserId: string | null;
  status: string;
  payload: Record<string, unknown>;
}

export type BridgeEvent =
  | IssueStatusChangedEvent
  | IssueCommentAddedEvent
  | AgentStatusChangedEvent
  | ApprovalCreatedEvent;

export type EventHandler = (event: BridgeEvent) => Promise<void>;

// ── Poller ──

interface IssueSnapshot {
  id: string;
  identifier: string;
  title: string;
  status: string;
  assigneeAgentId: string | null;
  projectId: string | null;
  updatedAt: string;
}

interface CommentSnapshot {
  id: string;
  body: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  createdAt: string;
}

export class EventPoller {
  private pc: PaperclipClient;
  private companyId: string;
  private intervalMs: number;
  private handler: EventHandler;
  private timer: ReturnType<typeof setInterval> | null = null;

  // State snapshots for change detection
  private issueStatuses = new Map<string, IssueSnapshot>();
  private agentStatuses = new Map<string, { status: string; agent: PaperclipAgent }>();
  private issueCommentIds = new Map<string, Set<string>>(); // issueId → set of comment IDs
  private seenApprovalIds = new Set<string>();
  private initialized = false;

  constructor(
    pc: PaperclipClient,
    companyId: string,
    handler: EventHandler,
    intervalMs = 15_000,
  ) {
    this.pc = pc;
    this.companyId = companyId;
    this.handler = handler;
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    console.log(`[poller] Starting event poller (interval: ${this.intervalMs}ms)`);

    // Seed initial state (no events emitted for existing data)
    await this.seedState();
    this.initialized = true;

    // Start polling loop
    this.timer = setInterval(() => {
      this.poll().catch(err => console.error('[poller] Poll error:', err));
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[poller] Stopped');
  }

  private async seedState(): Promise<void> {
    console.log('[poller] Seeding initial state...');

    // Seed issues
    const issues = await this.pc.listAllIssues(this.companyId);
    for (const issue of issues) {
      this.issueStatuses.set(issue.id, {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: issue.status,
        assigneeAgentId: issue.assigneeAgentId,
        projectId: issue.projectId,
        updatedAt: issue.updatedAt,
      });
    }

    // Seed agents
    const agents = await this.pc.listAgents(this.companyId);
    for (const agent of agents) {
      this.agentStatuses.set(agent.id, { status: agent.status, agent });
    }

    // Seed approvals
    const approvals = await this.pc.listApprovals(this.companyId);
    for (const approval of approvals) {
      this.seenApprovalIds.add(approval.id);
    }

    // Seed comments for active issues (in_progress, blocked, todo)
    const activeIssues = issues.filter(i =>
      ['in_progress', 'blocked', 'todo'].includes(i.status)
    );
    for (const issue of activeIssues) {
      const comments = await this.pc.listComments(issue.id);
      this.issueCommentIds.set(issue.id, new Set(comments.map(c => c.id)));
    }

    console.log(`[poller] Seeded: ${issues.length} issues, ${agents.length} agents, ${approvals.length} approvals`);
  }

  private async poll(): Promise<void> {
    await Promise.all([
      this.pollIssues(),
      this.pollAgents(),
      this.pollApprovals(),
    ]);
  }

  private async pollIssues(): Promise<void> {
    const issues = await this.pc.listAllIssues(this.companyId);

    for (const issue of issues) {
      const prev = this.issueStatuses.get(issue.id);

      // Status change detection
      if (prev && prev.status !== issue.status) {
        await this.emit({
          type: 'issue.status_changed',
          issueId: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          oldStatus: prev.status,
          newStatus: issue.status,
          assigneeAgentId: issue.assigneeAgentId,
          projectId: issue.projectId,
        });
      }

      // Update snapshot
      this.issueStatuses.set(issue.id, {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: issue.status,
        assigneeAgentId: issue.assigneeAgentId,
        projectId: issue.projectId,
        updatedAt: issue.updatedAt,
      });

      // Check for new comments on updated issues
      if (prev && issue.updatedAt !== prev.updatedAt) {
        await this.pollCommentsForIssue(issue);
      }

      // New issue — seed its comments
      if (!prev) {
        const comments = await this.pc.listComments(issue.id);
        this.issueCommentIds.set(issue.id, new Set(comments.map(c => c.id)));
      }
    }
  }

  private async pollCommentsForIssue(issue: IssueSnapshot): Promise<void> {
    const comments = await this.pc.listComments(issue.id);
    const knownIds = this.issueCommentIds.get(issue.id) || new Set();

    for (const comment of comments) {
      if (!knownIds.has(comment.id)) {
        await this.emit({
          type: 'issue.comment_added',
          issueId: issue.id,
          identifier: issue.identifier,
          issueTitle: issue.title,
          commentId: comment.id,
          body: comment.body,
          authorAgentId: comment.authorAgentId,
          authorUserId: comment.authorUserId,
          projectId: issue.projectId,
        });
        knownIds.add(comment.id);
      }
    }

    this.issueCommentIds.set(issue.id, knownIds);
  }

  private async pollAgents(): Promise<void> {
    const agents = await this.pc.listAgents(this.companyId);

    for (const agent of agents) {
      const prev = this.agentStatuses.get(agent.id);

      if (prev && prev.status !== agent.status) {
        await this.emit({
          type: 'agent.status_changed',
          agentId: agent.id,
          name: agent.name,
          title: agent.title,
          urlKey: agent.urlKey,
          oldStatus: prev.status,
          newStatus: agent.status,
        });
      }

      this.agentStatuses.set(agent.id, { status: agent.status, agent });
    }
  }

  private async pollApprovals(): Promise<void> {
    const approvals = await this.pc.listApprovals(this.companyId);

    for (const approval of approvals) {
      if (!this.seenApprovalIds.has(approval.id)) {
        await this.emit({
          type: 'approval.created',
          approvalId: approval.id,
          approvalType: approval.type,
          requestedByAgentId: approval.requestedByAgentId,
          requestedByUserId: approval.requestedByUserId,
          status: approval.status,
          payload: approval.payload,
        });
        this.seenApprovalIds.add(approval.id);
      }
    }
  }

  private async emit(event: BridgeEvent): Promise<void> {
    try {
      await this.handler(event);
    } catch (err) {
      console.error(`[poller] Handler error for ${event.type}:`, err);
    }
  }
}
