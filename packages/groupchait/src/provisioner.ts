/**
 * Auto-provisioning service for Rocket.Chat.
 *
 * Responsibilities:
 * 1. Create bot users for each Paperclip agent
 * 2. Create default channels (#board, #engineering, #designs, #general)
 * 3. Add bot users to appropriate channels based on role
 * 4. Sync agent status → Rocket.Chat presence
 */

import { RocketChatClient, RCUser, RCChannel } from './rocketchat-client';
import { PaperclipClient, PaperclipAgent } from './paperclip-client';

/** Maps channel names to which agent roles should be members. '*' means all agents. */
const CHANNEL_ROLE_MAP: Record<string, string[]> = {
  board: ['ceo'],
  engineering: ['ceo', 'cto', 'engineer'],
  designs: ['ceo', 'cto', 'designer'],
  general: ['*'],
};

/** Maps Paperclip agent status to Rocket.Chat presence status. */
const STATUS_MAP: Record<string, 'online' | 'busy' | 'away' | 'offline'> = {
  running: 'online',
  idle: 'away',
  paused: 'away',
  error: 'busy',
};

function agentToUsername(agent: PaperclipAgent): string {
  return agent.urlKey.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function agentToDisplayName(agent: PaperclipAgent): string {
  return `${agent.title} [Bot]`;
}

function agentToEmail(agent: PaperclipAgent): string {
  return `${agentToUsername(agent)}@bot.paperclip.local`;
}

/** Generate a deterministic but non-trivial password for bot accounts. */
function agentBotPassword(agent: PaperclipAgent): string {
  // Bot accounts are managed programmatically — password is only used for initial creation.
  // In production, consider using personal access tokens instead.
  return `pc-bot-${agent.id.slice(0, 8)}-${agent.urlKey}`;
}

export interface ProvisionResult {
  usersCreated: string[];
  usersExisted: string[];
  channelsCreated: string[];
  channelsExisted: string[];
  membershipsAdded: string[];
}

export class Provisioner {
  private rc: RocketChatClient;
  private pc: PaperclipClient;
  private companyId: string;

  constructor(rc: RocketChatClient, pc: PaperclipClient, companyId: string) {
    this.rc = rc;
    this.pc = pc;
    this.companyId = companyId;
  }

  /**
   * Run full provisioning: create bot users, channels, and memberships.
   */
  async provision(): Promise<ProvisionResult> {
    const result: ProvisionResult = {
      usersCreated: [],
      usersExisted: [],
      channelsCreated: [],
      channelsExisted: [],
      membershipsAdded: [],
    };

    // 1. Fetch all agents from Paperclip
    const agents = await this.pc.listAgents(this.companyId);
    console.log(`[provisioner] Found ${agents.length} Paperclip agents`);

    // 2. Create/verify bot users for each agent
    const userMap = new Map<string, RCUser>(); // agentId → RC user
    for (const agent of agents) {
      const username = agentToUsername(agent);
      let rcUser = await this.rc.getUserByUsername(username);

      if (!rcUser) {
        console.log(`[provisioner] Creating bot user: ${username} (${agentToDisplayName(agent)})`);
        rcUser = await this.rc.createUser({
          username,
          name: agentToDisplayName(agent),
          password: agentBotPassword(agent),
          email: agentToEmail(agent),
          roles: ['bot'],
          verified: true,
        });
        result.usersCreated.push(username);
      } else {
        result.usersExisted.push(username);
      }

      userMap.set(agent.id, rcUser);
    }

    // 3. Create/verify default channels
    const channelMap = new Map<string, RCChannel>(); // channel name → RC channel
    for (const channelName of Object.keys(CHANNEL_ROLE_MAP)) {
      let channel = await this.rc.getChannelByName(channelName);

      if (!channel) {
        console.log(`[provisioner] Creating channel: #${channelName}`);
        channel = await this.rc.createChannel(channelName);
        result.channelsCreated.push(channelName);
      } else {
        result.channelsExisted.push(channelName);
      }

      channelMap.set(channelName, channel);
    }

    // 4. Add agents to channels based on role mapping
    for (const [channelName, allowedRoles] of Object.entries(CHANNEL_ROLE_MAP)) {
      const channel = channelMap.get(channelName);
      if (!channel) continue;

      for (const agent of agents) {
        const shouldJoin = allowedRoles.includes('*') || allowedRoles.includes(agent.role);
        if (!shouldJoin) continue;

        const rcUser = userMap.get(agent.id);
        if (!rcUser) continue;

        // Check if already a member (by username in channel's usernames list)
        const username = agentToUsername(agent);
        if (channel.usernames?.includes(username)) continue;

        try {
          console.log(`[provisioner] Adding ${username} to #${channelName}`);
          await this.rc.inviteToChannel(channel._id, rcUser._id);
          result.membershipsAdded.push(`${username} → #${channelName}`);
        } catch (err) {
          // May fail if already a member (race condition) — not critical
          console.warn(`[provisioner] Could not add ${username} to #${channelName}: ${err}`);
        }
      }
    }

    return result;
  }

  /**
   * Sync all agent statuses from Paperclip to Rocket.Chat presence.
   */
  async syncAgentStatuses(): Promise<void> {
    const agents = await this.pc.listAgents(this.companyId);

    for (const agent of agents) {
      const username = agentToUsername(agent);
      const rcUser = await this.rc.getUserByUsername(username);
      if (!rcUser) continue;

      const targetStatus = STATUS_MAP[agent.status] || 'offline';
      const statusText = `${agent.status} — ${agent.title}`;

      try {
        await this.rc.setUserStatus(rcUser._id, targetStatus, statusText);
      } catch (err) {
        console.warn(`[provisioner] Could not set status for ${username}: ${err}`);
      }
    }
  }
}
