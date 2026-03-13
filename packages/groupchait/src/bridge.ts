/**
 * Event Relay — orchestrates the Paperclip → Rocket.Chat message pipeline.
 *
 * Connects: EventPoller → MessageFormatter → RocketChatClient
 *
 * Also handles agent presence sync on status changes and resolves
 * project IDs to channel names for targeted posting.
 */

import { RocketChatClient } from './rocketchat-client';
import { PaperclipClient } from './paperclip-client';
import { EventPoller, BridgeEvent } from './event-poller';
import { MessageFormatter } from './message-formatter';

export interface BridgeOptions {
  pollIntervalMs?: number;
}

export class Bridge {
  private rc: RocketChatClient;
  private pc: PaperclipClient;
  private companyId: string;
  private poller: EventPoller;
  private formatter: MessageFormatter;
  private channelIdCache = new Map<string, string>(); // channel name → RC channel _id
  private stopStream: (() => void) | null = null;

  constructor(
    rc: RocketChatClient,
    pc: PaperclipClient,
    companyId: string,
    opts: BridgeOptions = {},
  ) {
    this.rc = rc;
    this.pc = pc;
    this.companyId = companyId;

    // Formatter gets initialized with empty agents — populated in start()
    this.formatter = new MessageFormatter([]);

    this.poller = new EventPoller(
      pc,
      companyId,
      (event) => this.handleEvent(event),
      opts.pollIntervalMs ?? 15_000,
    );
  }

  async start(): Promise<void> {
    console.log('[bridge] Starting event bridge...');

    // Pre-populate formatter with current agent roster
    const agents = await this.pc.listAgents(this.companyId);
    this.formatter.updateAgents(agents);

    // Pre-cache channel IDs for posting
    await this.cacheChannelIds();

    // 1. Start polling (fallback/background sync)
    await this.poller.start();

    // 2. Start WebSocket stream (real-time)
    try {
      this.stopStream = this.pc.connectStream((event) => this.handleEvent(event));
    } catch (err) {
      console.warn('[bridge] Failed to connect WebSocket stream, falling back to polling only:', err);
    }

    console.log('[bridge] Event bridge running');
  }

  stop(): void {
    this.poller.stop();
    if (this.stopStream) {
      this.stopStream();
      this.stopStream = null;
    }
    console.log('[bridge] Event bridge stopped');
  }


  private async handleEvent(event: BridgeEvent): Promise<void> {
    console.log(`[relay] Event: ${event.type}`, this.eventSummary(event));

    // Format into RC messages
    const messages = this.formatter.format(event);

    // Post each message to Rocket.Chat
    for (const msg of messages) {
      const channelId = await this.resolveChannelId(msg.channel);
      if (!channelId) {
        console.warn(`[relay] Channel #${msg.channel} not found, skipping message`);
        continue;
      }

      try {
        await this.rc.sendMessage(channelId, msg.text, msg.alias);
      } catch (err) {
        console.error(`[relay] Failed to post to #${msg.channel}:`, err);
      }
    }

    // Side effects: sync agent presence on status changes
    if (event.type === 'agent.status_changed') {
      await this.syncAgentPresence(event.agentId, event.newStatus, event.urlKey);
    }

    // Refresh agent roster periodically when agents change
    if (event.type === 'agent.status_changed') {
      const agents = await this.pc.listAgents(this.companyId);
      this.formatter.updateAgents(agents);
    }
  }

  private async syncAgentPresence(
    _agentId: string,
    newStatus: string,
    urlKey: string,
  ): Promise<void> {
    const statusMap: Record<string, 'online' | 'busy' | 'away' | 'offline'> = {
      running: 'online',
      idle: 'away',
      paused: 'away',
      error: 'busy',
    };

    const rcUser = await this.rc.getUserByUsername(urlKey);
    if (!rcUser) return;

    const target = statusMap[newStatus] || 'offline';
    try {
      await this.rc.setUserStatus(rcUser._id, target, newStatus);
    } catch (err) {
      console.warn(`[relay] Could not sync presence for @${urlKey}:`, err);
    }
  }

  private async cacheChannelIds(): Promise<void> {
    const channels = await this.rc.listChannels();
    for (const ch of channels) {
      this.channelIdCache.set(ch.name, ch._id);
    }
    console.log(`[relay] Cached ${channels.length} channel IDs`);
  }

  private async resolveChannelId(channelName: string): Promise<string | null> {
    // Check cache first
    const cached = this.channelIdCache.get(channelName);
    if (cached) return cached;

    // Try to look up and cache
    const channel = await this.rc.getChannelByName(channelName);
    if (channel) {
      this.channelIdCache.set(channelName, channel._id);
      return channel._id;
    }

    return null;
  }

  private eventSummary(event: BridgeEvent): string {
    switch (event.type) {
      case 'issue.status_changed':
        return `${event.identifier} ${event.oldStatus}→${event.newStatus}`;
      case 'issue.comment_added':
        return `${event.identifier} comment by ${event.authorAgentId || event.authorUserId}`;
      case 'agent.status_changed':
        return `${event.urlKey} ${event.oldStatus}→${event.newStatus}`;
      case 'approval.created':
        return `${event.approvalType} (${event.approvalId.slice(0, 8)})`;
    }
  }
}
