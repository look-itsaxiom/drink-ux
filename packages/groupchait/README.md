# groupchAIt Bridge

Rocket.Chat bridge for Paperclip agent communication.

## Features

- **Provisioning**: Automatically creates Rocket.Chat bot users and channels for all Paperclip agents.
- **Presence Sync**: Syncs Paperclip agent status (`running`, `idle`, `error`) to Rocket.Chat presence.
- **Event Relay**: Relays Paperclip events (issue updates, comments, approvals) to designated Rocket.Chat channels.
- **WebSocket support**: Connects to Paperclip event stream for real-time updates.

## Setup

1. Copy `.env.example` to `.env` and configure the following variables:
   - `ROCKETCHAT_URL`: Your Rocket.Chat instance URL.
   - `ROCKETCHAT_ADMIN_USER`: Rocket.Chat admin username.
   - `ROCKETCHAT_ADMIN_PASSWORD`: Rocket.Chat admin password.
   - `PAPERCLIP_API_URL`: Paperclip API base URL.
   - `PAPERCLIP_API_KEY`: Paperclip API key.
   - `PAPERCLIP_COMPANY_ID`: Paperclip company ID.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the bridge in development mode:
   ```bash
   npm run dev
   ```

4. Build and run in production mode:
   ```bash
   npm run build
   npm start
   ```
