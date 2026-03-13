/**
 * Formats Paperclip bridge events into Rocket.Chat messages.
 *
 * Each event type maps to a channel + formatted message.
 * Uses Rocket.Chat markdown for rich display.
 */

import {
  BridgeEvent,
  IssueStatusChangedEvent,
  IssueCommentAddedEvent,
  AgentStatusChangedEvent,
  ApprovalCreatedEvent,
} from './event-poller';
import { PaperclipAgent } from './paperclip-client';

export interface FormattedMessage {
  channel: string; // RC channel name (without #)
  text: string;
  alias?: string; // Display name override (for bot identity)
}

// Status emoji mapping for visual clarity
const STATUS_EMOJI: Record<string, string> = {
  backlog: ':inbox_tray:',
  todo: ':clipboard:',
  in_progress: ':hammer_and_wrench:',
  in_review: ':mag:',
  done: ':white_check_mark:',
  blocked: ':no_entry:',
  cancelled: ':x:',
};

const AGENT_STATUS_EMOJI: Record<string, string> = {
  running: ':green_circle:',
  idle: ':yellow_circle:',
  paused: ':orange_circle:',
  error: ':red_circle:',
};

export class MessageFormatter {
  private agentMap: Map<string, PaperclipAgent>;
  private projectChannels: Map<string, string>; // projectId → channel name

  constructor(agents: PaperclipAgent[], projectChannels?: Map<string, string>) {
    this.agentMap = new Map(agents.map(a => [a.id, a]));
    this.projectChannels = projectChannels || new Map();
  }

  updateAgents(agents: PaperclipAgent[]): void {
    this.agentMap = new Map(agents.map(a => [a.id, a]));
  }

  format(event: BridgeEvent): FormattedMessage[] {
    switch (event.type) {
      case 'issue.status_changed':
        return this.formatStatusChanged(event);
      case 'issue.comment_added':
        return this.formatCommentAdded(event);
      case 'agent.status_changed':
        return this.formatAgentStatusChanged(event);
      case 'approval.created':
        return this.formatApprovalCreated(event);
    }
  }

  private formatStatusChanged(event: IssueStatusChangedEvent): FormattedMessage[] {
    const emoji = STATUS_EMOJI[event.newStatus] || ':arrows_counterclockwise:';
    const agent = event.assigneeAgentId ? this.agentMap.get(event.assigneeAgentId) : null;
    const assignee = agent ? `@${agent.urlKey}` : 'unassigned';

    const text = [
      `${emoji} **${event.identifier}** ${event.title}`,
      `Status: \`${event.oldStatus}\` → \`${event.newStatus}\` (${assignee})`,
    ].join('\n');

    const messages: FormattedMessage[] = [];

    // Always post to #engineering
    messages.push({ channel: 'engineering', text });

    // Post blocked issues to #board for visibility
    if (event.newStatus === 'blocked') {
      messages.push({
        channel: 'board',
        text: `:no_entry: **BLOCKED** — ${event.identifier}: ${event.title}\nAssignee: ${assignee}\nNeeds attention from the board.`,
      });
    }

    // Post to project channel if mapped
    const projectChannel = event.projectId
      ? this.projectChannels.get(event.projectId)
      : null;
    if (projectChannel) {
      messages.push({ channel: projectChannel, text });
    }

    return messages;
  }

  private formatCommentAdded(event: IssueCommentAddedEvent): FormattedMessage[] {
    const author = this.resolveAuthor(event.authorAgentId, event.authorUserId);
    const alias = event.authorAgentId
      ? this.agentMap.get(event.authorAgentId)?.urlKey
      : undefined;

    // Truncate long comments for chat display
    const bodyPreview = event.body.length > 500
      ? event.body.slice(0, 497) + '...'
      : event.body;

    const text = [
      `:speech_balloon: **${author}** commented on **${event.identifier}** (${event.issueTitle}):`,
      `> ${bodyPreview.replace(/\n/g, '\n> ')}`,
    ].join('\n');

    const messages: FormattedMessage[] = [];

    // Post to #engineering
    messages.push({ channel: 'engineering', text, alias });

    // Post to project channel if mapped
    const projectChannel = event.projectId
      ? this.projectChannels.get(event.projectId)
      : null;
    if (projectChannel) {
      messages.push({ channel: projectChannel, text, alias });
    }

    return messages;
  }

  private formatAgentStatusChanged(event: AgentStatusChangedEvent): FormattedMessage[] {
    const emoji = AGENT_STATUS_EMOJI[event.newStatus] || ':grey_question:';
    const text = `${emoji} **${event.title}** (@${event.urlKey}) is now \`${event.newStatus}\` (was \`${event.oldStatus}\`)`;

    return [{ channel: 'engineering', text }];
  }

  private formatApprovalCreated(event: ApprovalCreatedEvent): FormattedMessage[] {
    const requester = this.resolveAuthor(event.requestedByAgentId, event.requestedByUserId);
    const payload = event.payload as Record<string, string>;
    const name = payload.name || payload.title || event.approvalType;

    const text = [
      `:raised_hand: **New Approval Request** — ${event.approvalType}`,
      `Requested by: **${requester}**`,
      `Subject: **${name}**`,
      `Status: \`${event.status}\``,
      '',
      `Approval ID: \`${event.approvalId}\``,
    ].join('\n');

    return [{ channel: 'board', text }];
  }

  private resolveAuthor(agentId: string | null, userId: string | null): string {
    if (agentId) {
      const agent = this.agentMap.get(agentId);
      return agent ? `${agent.title} (@${agent.urlKey})` : `agent:${agentId.slice(0, 8)}`;
    }
    if (userId) {
      return userId === 'local-board' ? 'Board' : `user:${userId}`;
    }
    return 'unknown';
  }
}
