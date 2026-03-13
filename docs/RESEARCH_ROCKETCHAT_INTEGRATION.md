# Rocket.Chat REST API and Bot Integration Research

This document summarizes the research into Rocket.Chat integration patterns for building a bridge service, as requested in SKI-52.

## 1. Authentication

Rocket.Chat supports two primary authentication methods for the REST API: session-based tokens (via login) and Personal Access Tokens (PAT). For bots, **Personal Access Tokens** are recommended as they do not expire.

### A. Session-Based Authentication (Login)
Used to obtain a temporary token.

```bash
curl -X POST http://localhost:3000/api/v1/login \
     -H "Content-type: application/json" \
     -d '{
       "user": "bot_username",
       "password": "bot_password"
     }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "n67vF5A699r49257C",
    "authToken": "79ryS87S9ar8a9S8r98S7r98S7r98S7r98S7r98S7r98"
  }
}
```

### B. Personal Access Tokens (PAT)
Recommended for long-lived bot integrations.

1. Create an authenticated session (Step A).
2. Generate a PAT:

```bash
curl -X POST http://localhost:3000/api/v1/users.generatePersonalAccessToken \
     -H "X-Auth-Token: YOUR_AUTH_TOKEN" \
     -H "X-User-Id: YOUR_USER_ID" \
     -H "Content-type: application/json" \
     -d '{ "tokenName": "bridge-service-token" }'
```

**Usage:**
Include `X-Auth-Token` (the PAT) and `X-User-Id` in all subsequent requests.

---

## 2. Channels and Messaging

### A. Create a Channel
```bash
curl -X POST http://localhost:3000/api/v1/channels.create \
     -H "X-Auth-Token: YOUR_PAT" \
     -H "X-User-Id: YOUR_USER_ID" \
     -H "Content-type: application/json" \
     -d '{ "name": "project-alpha" }'
```

### B. Post a Message
```bash
curl -X POST http://localhost:3000/api/v1/chat.postMessage \
     -H "X-Auth-Token: YOUR_PAT" \
     -H "X-User-Id: YOUR_USER_ID" \
     -H "Content-type: application/json" \
     -d '{
       "channel": "#project-alpha",
       "text": "Hello from Paperclip!"
     }'
```

### C. Read Messages (History)
```bash
curl -H "X-Auth-Token: YOUR_PAT" \
     -H "X-User-Id: YOUR_USER_ID" \
     -G http://localhost:3000/api/v1/channels.history \
     --data-urlencode "roomId=ROOM_ID"
```

### D. Listening for New Messages
There are two main patterns:
1. **Realtime API (WebSockets/DDP):** The bot maintains a persistent connection and "subscribes" to message events. This is the most responsive but requires a stateful service.
2. **Outgoing Webhooks:** Rocket.Chat pushes a POST request to your service whenever a message is sent in a specific channel or matches a trigger. Recommended for stateless bridge services.

---

## 3. Bot Frameworks

### Rocket.Chat Node.js SDK
The official [Rocket.Chat.js.SDK](https://github.com/RocketChat/Rocket.Chat.js.SDK) is the recommended way to build bots in Node.js/TypeScript. It abstracts both the REST API and the Realtime (DDP) API.

**Key Features:**
- Automatic reconnection management.
- Subscription helpers for listening to rooms.
- TypeScript support.

---

## 4. Webhooks

### Incoming Webhooks
Allow your service to post messages to Rocket.Chat without a full bot account.

```bash
curl -X POST http://localhost:3000/hooks/YOUR_WEBHOOK_TOKEN \
     -H "Content-Type: application/json" \
     -d '{ "text": "Alert: New issue created in Paperclip" }'
```

### Outgoing Webhooks
Rocket.Chat sends data to your service. You can configure:
- **Event:** `SendMessage`.
- **Target URL:** `http://your-bridge-service/api/rocket-chat/event`.
- **Post to Channel:** Optional, to limit scope.

---

## 5. Rich Messages

Rocket.Chat supports Markdown, images, and interactive buttons via the `attachments` field.

### A. Buttons (Action Links)
```bash
curl -X POST http://localhost:3000/api/v1/chat.postMessage \
     -H "X-Auth-Token: YOUR_PAT" \
     -H "X-User-Id: YOUR_USER_ID" \
     -H "Content-type: application/json" \
     -d '{
       "channel": "#general",
       "text": "Please approve this design:",
       "attachments": [
         {
           "title": "v1-dashboard-mockup.png",
           "image_url": "https://example.com/mockup.png",
           "actions": [
             {
               "type": "button",
               "text": "Approve",
               "msg": "/approve 123",
               "msg_in_chat_window": true
             },
             {
               "type": "button",
               "text": "Reject",
               "msg": "/reject 123",
               "style": "danger"
             }
           ]
         }
       ]
     }'
```

---

## 6. User Presence

Bots can update their status to reflect their activity level.

### Set Status
```bash
curl -X POST http://localhost:3000/api/v1/users.setStatus \
     -H "X-Auth-Token: YOUR_PAT" \
     -H "X-User-Id: YOUR_USER_ID" \
     -H "Content-type: application/json" \
     -d '{
       "status": "online",
       "message": "Ready to research"
     }'
```

Valid statuses: `online`, `away`, `busy`, `offline`.
