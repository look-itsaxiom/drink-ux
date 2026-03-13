/**
 * groupchAIt Bridge — Rocket.Chat ↔ Paperclip
 *
 * Long-running process that:
 * 1. Provisions bot users and channels in Rocket.Chat
 * 2. Syncs agent statuses to RC presence
 * 3. Polls Paperclip for events and relays them to RC channels
 *
 * Environment variables:
 *   ROCKETCHAT_URL           - Rocket.Chat instance URL (e.g. https://chat.skibeness.com)
 *   ROCKETCHAT_ADMIN_USER    - Admin username for Rocket.Chat
 *   ROCKETCHAT_ADMIN_PASSWORD - Admin password for Rocket.Chat
 *   PAPERCLIP_API_URL        - Paperclip API URL
 *   PAPERCLIP_API_KEY        - Paperclip API key
 *   PAPERCLIP_COMPANY_ID     - Paperclip company ID
 *   POLL_INTERVAL_MS         - Poll interval in ms (default: 15000)
 */

import { loadConfig } from './config';
import { RocketChatClient } from './rocketchat-client';
import { PaperclipClient } from './paperclip-client';
import { Provisioner } from './provisioner';
import { Bridge } from './bridge';

async function main() {
  console.log('[bridge] groupchAIt bridge starting...');

  const config = loadConfig();
  const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || '15000', 10);
  console.log(`[bridge] Rocket.Chat: ${config.rocketchat.url}`);
  console.log(`[bridge] Paperclip:   ${config.paperclip.apiUrl}`);
  console.log(`[bridge] Poll interval: ${pollIntervalMs}ms`);

  // 1. Initialize clients
  const rc = new RocketChatClient(config.rocketchat.url);
  const pc = new PaperclipClient(config.paperclip.apiUrl, config.paperclip.apiKey);

  // 2. Authenticate with Rocket.Chat
  console.log('[bridge] Logging in to Rocket.Chat...');
  await rc.login(config.rocketchat.adminUser, config.rocketchat.adminPassword);
  console.log('[bridge] Logged in successfully');

  // 3. Run provisioning (create bot users, channels, memberships)
  const provisioner = new Provisioner(rc, pc, config.paperclip.companyId);

  console.log('[bridge] Running provisioning...');
  const result = await provisioner.provision();

  console.log('[bridge] Provisioning complete:');
  console.log(`  Users created:  ${result.usersCreated.length} (${result.usersCreated.join(', ') || 'none'})`);
  console.log(`  Users existed:  ${result.usersExisted.length}`);
  console.log(`  Channels created: ${result.channelsCreated.length} (${result.channelsCreated.join(', ') || 'none'})`);
  console.log(`  Channels existed: ${result.channelsExisted.length}`);
  console.log(`  Memberships added: ${result.membershipsAdded.length}`);
  if (result.membershipsAdded.length > 0) {
    result.membershipsAdded.forEach(m => console.log(`    ${m}`));
  }

  // 4. Sync agent statuses
  console.log('[bridge] Syncing agent statuses...');
  await provisioner.syncAgentStatuses();
  console.log('[bridge] Status sync complete');

  // 5. Start event bridge (long-running)
  console.log('[bridge] Starting event bridge...');
  const bridge = new Bridge(rc, pc, config.paperclip.companyId, { pollIntervalMs });
  await bridge.start();

  // Keep process alive and handle graceful shutdown
  const shutdown = () => {
    console.log('[bridge] Shutting down...');
    bridge.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('[bridge] Bridge running. Press Ctrl+C to stop.');
}

main().catch(err => {
  console.error('[bridge] Fatal error:', err);
  process.exit(1);
});
