/**
 * Lightweight Rocket.Chat REST API client.
 * Uses header-based auth (X-Auth-Token / X-User-Id) after login.
 */

export interface RCAuthCredentials {
  authToken: string;
  userId: string;
}

export interface RCUser {
  _id: string;
  username: string;
  name: string;
  status: string;
  roles: string[];
}

export interface RCChannel {
  _id: string;
  name: string;
  t: string; // 'c' = channel, 'p' = private group
  usernames: string[];
}

export class RocketChatClient {
  private baseUrl: string;
  private auth: RCAuthCredentials | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.auth) {
      headers['X-Auth-Token'] = this.auth.authToken;
      headers['X-User-Id'] = this.auth.userId;
    }

    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      const errMsg = (data as { error?: string }).error || res.statusText;
      throw new Error(`Rocket.Chat API ${method} ${path} failed (${res.status}): ${errMsg}`);
    }
    return data as T;
  }

  async login(user: string, password: string): Promise<RCAuthCredentials> {
    const data = await this.request<{ data: { authToken: string; userId: string } }>(
      'POST', '/login', { user, password }
    );
    this.auth = { authToken: data.data.authToken, userId: data.data.userId };
    return this.auth;
  }

  // ── User management ──

  async createUser(opts: {
    username: string;
    name: string;
    password: string;
    email: string;
    roles?: string[];
    verified?: boolean;
  }): Promise<RCUser> {
    const data = await this.request<{ user: RCUser }>('POST', '/users.create', {
      ...opts,
      verified: opts.verified ?? true,
    });
    return data.user;
  }

  async getUserByUsername(username: string): Promise<RCUser | null> {
    try {
      const data = await this.request<{ user: RCUser }>('GET', `/users.info?username=${encodeURIComponent(username)}`);
      return data.user;
    } catch {
      return null;
    }
  }

  async listUsers(): Promise<RCUser[]> {
    const data = await this.request<{ users: RCUser[] }>('GET', '/users.list?count=100');
    return data.users;
  }

  async setUserStatus(userId: string, status: 'online' | 'busy' | 'away' | 'offline', statusText?: string): Promise<void> {
    // Admin can set another user's status via users.setStatus
    await this.request('POST', '/users.setStatus', {
      userId,
      status,
      message: statusText || '',
    });
  }

  async setUserActiveStatus(userId: string, activeStatus: boolean): Promise<void> {
    await this.request('POST', '/users.setActiveStatus', {
      userId,
      activeStatus,
    });
  }

  // ── Channel management ──

  async createChannel(name: string, members?: string[], readOnly?: boolean): Promise<RCChannel> {
    const data = await this.request<{ channel: RCChannel }>('POST', '/channels.create', {
      name,
      members: members || [],
      readOnly: readOnly || false,
    });
    return data.channel;
  }

  async getChannelByName(name: string): Promise<RCChannel | null> {
    try {
      const data = await this.request<{ channel: RCChannel }>('GET', `/channels.info?roomName=${encodeURIComponent(name)}`);
      return data.channel;
    } catch {
      return null;
    }
  }

  async inviteToChannel(channelId: string, userId: string): Promise<void> {
    await this.request('POST', '/channels.invite', {
      roomId: channelId,
      userId,
    });
  }

  async listChannels(): Promise<RCChannel[]> {
    const data = await this.request<{ channels: RCChannel[] }>('GET', '/channels.list?count=100');
    return data.channels;
  }

  async sendMessage(channelId: string, text: string, alias?: string): Promise<void> {
    await this.request('POST', '/chat.sendMessage', {
      message: { rid: channelId, msg: text, alias },
    });
  }
}
