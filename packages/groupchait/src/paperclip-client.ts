/**
 * Paperclip API client for the bridge.
 * Fetches agents, issues, comments, and approvals.
 */

import WebSocket from 'ws';

export interface PaperclipAgent {
  id: string;
  name: string;
  role: string;
  title: string;
  icon: string;
  status: string; // 'running' | 'idle' | 'error' | 'paused'
  urlKey: string;
}

export interface PaperclipIssue {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  projectId: string | null;
  parentId: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PaperclipComment {
  id: string;
  issueId: string;
  body: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  createdAt: string;
}

export interface PaperclipApproval {
  id: string;
  type: string;
  status: string;
  requestedByAgentId: string | null;
  requestedByUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class PaperclipClient {
  private ws: WebSocket | null = null;

  constructor(
    private apiUrl: string,
    private apiKey: string,
  ) {}

  private async request<T>(method: string, path: string): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Paperclip API ${method} ${path} failed (${res.status}): ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async listAgents(companyId: string): Promise<PaperclipAgent[]> {
    return this.request<PaperclipAgent[]>('GET', `/api/companies/${companyId}/agents`);
  }

  async listAllIssues(companyId: string): Promise<PaperclipIssue[]> {
    return this.request<PaperclipIssue[]>(
      'GET',
      `/api/companies/${companyId}/issues?status=backlog,todo,in_progress,in_review,blocked,done&limit=200`,
    );
  }

  async listComments(issueId: string): Promise<PaperclipComment[]> {
    return this.request<PaperclipComment[]>('GET', `/api/issues/${issueId}/comments`);
  }

  async listApprovals(companyId: string): Promise<PaperclipApproval[]> {
    return this.request<PaperclipApproval[]>('GET', `/api/companies/${companyId}/approvals`);
  }

  /**
   * Connects to the Paperclip event WebSocket stream.
   * @param onEvent Callback function for incoming events.
   * @returns A function to close the connection.
   */
  connectStream(onEvent: (event: any) => void): () => void {
    const wsUrl = `${this.apiUrl.replace(/^http/, 'ws')}/api/stream?apiKey=${encodeURIComponent(this.apiKey)}`;
    console.log(`[paperclip] Connecting to WebSocket stream: ${wsUrl.split('?')[0]}...`);

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.on('open', () => {
      console.log('[paperclip] WebSocket stream connected');
    });

    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        onEvent(event);
      } catch (err) {
        console.error('[paperclip] Failed to parse WebSocket message:', err);
      }
    });

    ws.on('error', (err) => {
      console.error('[paperclip] WebSocket stream error:', err);
    });

    ws.on('close', () => {
      console.log('[paperclip] WebSocket stream closed');
      this.ws = null;
    });

    return () => {
      ws.close();
      this.ws = null;
    };
  }
}
