# Deployment Guide

This document provides comprehensive deployment instructions for the Drink-UX platform, covering all service components, environments, and operational procedures.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Docker Deployment](#docker-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Mobile PWA Deployment](#mobile-pwa-deployment)
6. [API Deployment](#api-deployment)
7. [Admin Portal Deployment](#admin-portal-deployment)
8. [Multi-Tenant Configuration](#multi-tenant-configuration)
9. [Square Integration Setup](#square-integration-setup)
10. [Monitoring and Operations](#monitoring-and-operations)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Security Checklist](#security-checklist)
13. [Rollback Procedures](#rollback-procedures)

---

## Deployment Overview

### Production Architecture

```
                                    ┌─────────────────────┐
                                    │   Load Balancer     │
                                    │   (SSL Termination) │
                                    └─────────┬───────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Mobile PWA            │   │   API Server            │   │   Admin Portal          │
│   (GitHub Pages/CDN)    │   │   (Node.js/Express)     │   │   (Static Hosting)      │
│                         │   │                         │   │                         │
│   *.drink-ux.com        │   │   api.drink-ux.com      │   │   admin.drink-ux.com    │
└─────────────────────────┘   └───────────┬─────────────┘   └─────────────────────────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                              ▼                       ▼
                  ┌─────────────────────┐ ┌─────────────────────┐
                  │   PostgreSQL        │ │   Square POS API    │
                  │   Database          │ │   (External)        │
                  └─────────────────────┘ └─────────────────────┘
```

### Service Components

| Component | Package | Purpose | Port (Dev) |
|-----------|---------|---------|------------|
| Mobile PWA | `@drink-ux/mobile` | Customer-facing drink builder | 3000 |
| API Server | `@drink-ux/api` | Backend REST API | 3001 |
| Admin Portal | `@drink-ux/admin` | Business management dashboard | 3002 |
| Shared Types | `@drink-ux/shared` | Common types and utilities | N/A |

### Environment Types

| Environment | Purpose | Database | POS Integration |
|-------------|---------|----------|-----------------|
| Development | Local development | SQLite | Square Sandbox |
| Staging | Pre-production testing | PostgreSQL | Square Sandbox |
| Production | Live system | PostgreSQL | Square Production |

---

## Docker Deployment

The entire Drink-UX ecosystem can be containerized for consistent testing and deployment.

### Quick Start with Docker

```bash
# Production-like environment
docker-compose up --build

# Development with hot reload
docker-compose -f docker-compose.dev.yml up

# Run tests in containers
docker-compose -f docker-compose.test.yml up --build
```

### Available Docker Compose Files

| File | Purpose | Use Case |
|------|---------|----------|
| `docker-compose.yml` | Production build | Staging, production deployment |
| `docker-compose.dev.yml` | Development with hot reload | Local development |
| `docker-compose.test.yml` | Test environment | CI/CD, automated testing |

### Container Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Network                                │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   mobile    │  │    api      │  │   admin     │  │     db     │ │
│  │  (nginx)    │  │  (node.js)  │  │  (nginx)    │  │ (postgres) │ │
│  │  :3000      │  │  :3001      │  │  :3002      │  │  :5432     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                           Internal Network                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Ports

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| mobile | 3000 | 3000 | Customer-facing PWA |
| api | 3001 | 3001 | REST API server |
| admin | 3002 | 3002 | Admin dashboard |
| db | 5432 | 5432 | PostgreSQL database |

### Environment Variables

Pass Square credentials via environment:

```bash
# Create .env file at project root
SQUARE_APPLICATION_ID=your_app_id
SQUARE_ACCESS_TOKEN=your_access_token
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_key
SESSION_SECRET=your-secure-session-secret-min-32-chars
ENCRYPTION_KEY=your-secure-encryption-key-32chars
```

Then run:
```bash
docker-compose --env-file .env up --build
```

### Building Individual Images

```bash
# Build API image
docker build -f packages/api/Dockerfile -t drink-ux-api .

# Build Mobile image
docker build -f packages/mobile/Dockerfile -t drink-ux-mobile .

# Build Admin image
docker build -f packages/admin/Dockerfile -t drink-ux-admin .
```

### Running Database Migrations in Docker

```bash
# Run migrations on the API container
docker-compose exec api npx prisma migrate deploy

# Open Prisma Studio (for debugging)
docker-compose exec api npx prisma studio
```

### Health Checks

All containers include health checks:

```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' drink-ux-api
```

### Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | Persistent database storage |

### Cleaning Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (WARNING: deletes database)
docker-compose down -v

# Remove all images
docker-compose down --rmi all
```

---

## Environment Configuration

### API Package Environment Variables

Create a `.env` file in `packages/api/` based on `.env.example`:

```bash
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3001
NODE_ENV=development  # development | staging | production

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
# Development (SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
# DATABASE_URL="postgresql://user:password@host:5432/drink_ux?schema=public"

# Production (MySQL)
# DATABASE_URL="mysql://user:password@host:3306/drink_ux"

# =============================================================================
# SQUARE POS INTEGRATION
# =============================================================================
SQUARE_APP_ID=your_square_app_id
SQUARE_APP_SECRET=your_square_app_secret
SQUARE_ENVIRONMENT=sandbox  # sandbox | production
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key
POS_OAUTH_CALLBACK_URL=https://api.drink-ux.com/api/pos/oauth/callback

# =============================================================================
# SECURITY
# =============================================================================
# Session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_session_secret_here

# Encryption key for POS tokens (generate with: openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY=your_encryption_key_here

# =============================================================================
# CORS CONFIGURATION
# =============================================================================
CORS_ORIGINS=https://drink-ux.com,https://admin.drink-ux.com,https://*.drink-ux.com

# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # Max requests per window

# Login-specific rate limits
LOGIN_RATE_LIMIT_MAX=5            # Max login attempts
LOGIN_RATE_LIMIT_WINDOW_MS=900000 # 15 minutes

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info  # debug | info | warn | error
```

### Mobile Package Environment Variables

The mobile package uses build-time environment variables via Vite:

```bash
# packages/mobile/.env.local (not committed)
VITE_API_URL=http://localhost:3001
VITE_SQUARE_APPLICATION_ID=sandbox-sq0idb-...

# Production build
VITE_API_URL=https://api.drink-ux.com
```

### Admin Package Environment Variables

```bash
# packages/admin/.env.local (not committed)
VITE_API_URL=http://localhost:3001

# Production
VITE_API_URL=https://api.drink-ux.com
```

### Secrets Management

**Development:**
- Store secrets in local `.env` files (gitignored)
- Never commit secrets to version control

**Production:**
- Use environment variables from hosting platform
- Consider secrets managers:
  - AWS Secrets Manager
  - Google Cloud Secret Manager
  - HashiCorp Vault
  - Railway/Render built-in secrets

**Required Secrets:**
| Secret | Description | Rotation Frequency |
|--------|-------------|-------------------|
| `DATABASE_URL` | Database connection string | As needed |
| `SQUARE_APP_SECRET` | Square OAuth secret | Annually |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Webhook verification | As needed |
| `SESSION_SECRET` | Session signing key | Quarterly |
| `TOKEN_ENCRYPTION_KEY` | POS token encryption | Annually |

---

## Database Setup

### Development (SQLite)

SQLite is used for local development for simplicity.

```bash
cd packages/api

# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Open database browser
npx prisma studio
```

### Production (PostgreSQL)

#### Option 1: Managed PostgreSQL Services

Recommended services:
- **Railway** - Easy setup, automatic backups
- **Render** - Free tier available
- **Supabase** - PostgreSQL with extras
- **AWS RDS** - Enterprise-grade
- **Google Cloud SQL** - Enterprise-grade

#### Option 2: Self-Hosted

```bash
# Example Docker setup
docker run -d \
  --name drink-ux-postgres \
  -e POSTGRES_USER=drink_ux \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=drink_ux \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15
```

### Prisma Schema Changes

The schema is defined at `packages/api/prisma/schema.prisma`.

**Switching to PostgreSQL:**

1. Update the datasource in `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

2. Update `DATABASE_URL` environment variable:
```bash
DATABASE_URL="postgresql://user:password@host:5432/drink_ux?schema=public"
```

3. Generate new migrations:
```bash
npx prisma migrate dev --name init
```

### Database Migrations

**Development:**
```bash
# Create a new migration
npx prisma migrate dev --name descriptive_name

# Apply migrations
npx prisma migrate dev
```

**Production:**
```bash
# Apply migrations (no prompts, safe for CI/CD)
npx prisma migrate deploy
```

### Backup Strategy

**Automated Backups:**
```bash
# PostgreSQL backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER -d drink_ux > backup_$DATE.sql

# Compress and upload to S3
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://drink-ux-backups/
```

**Backup Schedule:**
| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full backup | Daily | 30 days |
| Transaction logs | Continuous | 7 days |
| Monthly snapshot | Monthly | 1 year |

---

## Mobile PWA Deployment

### GitHub Pages (Current Setup)

The mobile PWA automatically deploys to GitHub Pages on push to `main`.

**Live URL:** `https://look-itsaxiom.github.io/drink-ux/`

**Workflow:** `.github/workflows/deploy-mobile-pwa.yml`

**Trigger Conditions:**
- Push to `main` branch
- Changes in `packages/mobile/**` or `packages/shared/**`
- Manual trigger via GitHub Actions

**Build Configuration:**
```typescript
// packages/mobile/vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/drink-ux/' : '/',
  server: {
    port: 3000,
  },
});
```

### Vercel Deployment

Vercel offers automatic deployments with preview URLs for PRs.

**Setup Steps:**

1. Connect repository to Vercel
2. Configure build settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `packages/mobile`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. Add `vercel.json` for SPA routing (already exists at `packages/mobile/public/vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

4. Set environment variables in Vercel dashboard

### Custom Domain Setup

**For GitHub Pages:**
1. Add CNAME file to `packages/mobile/public/CNAME`:
   ```
   app.drink-ux.com
   ```
2. Configure DNS:
   ```
   Type: CNAME
   Name: app
   Value: look-itsaxiom.github.io
   ```
3. Enable HTTPS in repository settings

**For Vercel:**
1. Add domain in Vercel dashboard
2. Configure DNS as instructed by Vercel
3. SSL is automatic

### PWA Configuration

**Manifest:** `packages/mobile/public/manifest.json`
```json
{
  "name": "Drink-UX",
  "short_name": "Drink-UX",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "theme_color": "#3880ff",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Capacitor Native Build (Future)

For native iOS/Android apps:

```bash
cd packages/mobile

# Build web assets
npm run build

# Sync with native projects
npx cap sync

# Open native IDE
npx cap open ios
npx cap open android
```

**Capacitor Config:** `packages/mobile/capacitor.config.json`
```json
{
  "appId": "com.drinkux.app",
  "appName": "Drink-UX",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

---

## API Deployment

### Node.js Hosting Options

#### Railway (Recommended for Simplicity)

1. Connect GitHub repository
2. Select `packages/api` as root directory
3. Configure:
   - **Start Command:** `npm run start`
   - **Build Command:** `npm run build`
4. Add environment variables
5. Deploy

#### Render

1. Create new Web Service
2. Connect repository
3. Configure:
   - **Root Directory:** `packages/api`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run start`
4. Add environment variables

#### AWS (EC2/ECS/Lambda)

**EC2 with PM2:**
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and build
git clone https://github.com/look-itsaxiom/drink-ux.git
cd drink-ux
npm install
npm run build

# Start with PM2
cd packages/api
pm2 start dist/index.js --name drink-ux-api
pm2 save
pm2 startup
```

### Docker Containerization

**Dockerfile for API:**
```dockerfile
# packages/api/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/api/package*.json ./packages/api/

# Install dependencies
RUN npm ci --workspace=@drink-ux/shared --workspace=@drink-ux/api

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Build
RUN npm run build --workspace=@drink-ux/shared
RUN cd packages/api && npx prisma generate
RUN npm run build --workspace=@drink-ux/api

# Production image
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/generated ./generated
COPY --from=builder /app/packages/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/drink_ux
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=drink_ux
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Process Management (PM2)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'drink-ux-api',
    script: 'dist/index.js',
    cwd: 'packages/api',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

```bash
# Start
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# Logs
pm2 logs drink-ux-api

# Restart
pm2 restart drink-ux-api

# Stop
pm2 stop drink-ux-api
```

### Health Checks

The API provides comprehensive health check endpoints:

| Endpoint | Purpose | Response Codes |
|----------|---------|----------------|
| `GET /api/health` | Overall health | 200 (healthy), 503 (unhealthy) |
| `GET /api/health/pos` | POS connectivity | 200 (connected), 503 (disconnected) |
| `GET /api/health/ready` | Kubernetes readiness | 200 (ready), 503 (not ready) |
| `GET /api/health/live` | Kubernetes liveness | 200 (always) |

**Response Example:**
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "services": {
      "database": true,
      "pos": true
    },
    "lastChecked": "2024-01-15T10:30:00.000Z"
  }
}
```

**Load Balancer Configuration:**
```nginx
upstream drink_ux_api {
    server api1:3001;
    server api2:3001;
}

server {
    location /api/health {
        proxy_pass http://drink_ux_api;
        proxy_connect_timeout 5s;
        proxy_read_timeout 5s;
    }
}
```

---

## Admin Portal Deployment

### Static Hosting Options

The admin portal is a static React SPA that can be hosted on any static hosting service.

#### Vercel
```bash
cd packages/admin
npm run build
# Deploy via Vercel CLI or Git integration
```

#### Netlify
```toml
# netlify.toml
[build]
  base = "packages/admin"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### AWS S3 + CloudFront
```bash
# Build and upload
npm run build --workspace=@drink-ux/admin
aws s3 sync packages/admin/dist s3://drink-ux-admin --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id XXXX --paths "/*"
```

### Build Configuration

```typescript
// packages/admin/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

## Multi-Tenant Configuration

### Subdomain DNS Setup

Drink-UX uses subdomain-based multi-tenancy where each business gets their own subdomain.

**DNS Configuration:**
```
# Wildcard A record for tenant subdomains
*.drink-ux.com    A    <load_balancer_ip>

# Specific records for main services
api.drink-ux.com     A    <api_server_ip>
admin.drink-ux.com   A    <admin_server_ip>
www.drink-ux.com     A    <marketing_site_ip>
```

### Wildcard SSL Certificates

**Let's Encrypt with Certbot:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get wildcard certificate (requires DNS challenge)
certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d "*.drink-ux.com" \
  -d "drink-ux.com"
```

**AWS ACM (for CloudFront/ALB):**
1. Request certificate for `*.drink-ux.com` and `drink-ux.com`
2. Add DNS validation records
3. Attach to CloudFront distribution or ALB

### Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/drink-ux

# API Server
server {
    listen 443 ssl http2;
    server_name api.drink-ux.com;

    ssl_certificate /etc/letsencrypt/live/drink-ux.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drink-ux.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Tenant Subdomains (Mobile PWA)
server {
    listen 443 ssl http2;
    server_name ~^(?<tenant>.+)\.drink-ux\.com$;

    ssl_certificate /etc/letsencrypt/live/drink-ux.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drink-ux.com/privkey.pem;

    root /var/www/drink-ux-mobile;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Tenant $tenant;
    }
}

# Admin Portal
server {
    listen 443 ssl http2;
    server_name admin.drink-ux.com;

    ssl_certificate /etc/letsencrypt/live/drink-ux.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drink-ux.com/privkey.pem;

    root /var/www/drink-ux-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name *.drink-ux.com drink-ux.com;
    return 301 https://$host$request_uri;
}
```

### Tenant Middleware

The API uses tenant middleware to resolve business from subdomain:

```typescript
// packages/api/src/middleware/tenant.ts
// Extracts tenant slug from subdomain and attaches business to request
```

**Accessible Account States:**
- `ACTIVE` - Fully operational
- `SETUP_COMPLETE` - Finished onboarding
- `ONBOARDING` - In setup wizard

---

## Square Integration Setup

### Application Registration

1. Create application at [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Configure OAuth settings:
   - **Redirect URL (Sandbox):** `http://localhost:3001/api/pos/oauth/callback`
   - **Redirect URL (Production):** `https://api.drink-ux.com/api/pos/oauth/callback`

### OAuth Scopes Required

```typescript
const SQUARE_SCOPES = [
  'MERCHANT_PROFILE_READ',  // Read merchant info
  'ITEMS_READ',             // Read catalog items
  'ITEMS_WRITE',            // Write catalog items
  'ORDERS_READ',            // Read orders
  'ORDERS_WRITE',           // Create orders
  'PAYMENTS_READ',          // Read payment info
];
```

### Environment Configuration

**Sandbox (Development/Staging):**
```bash
SQUARE_APP_ID=sandbox-sq0idb-xxxxxxxxxxxxxxxxxxxx
SQUARE_APP_SECRET=sandbox-sq0csb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SQUARE_ENVIRONMENT=sandbox
POS_OAUTH_CALLBACK_URL=http://localhost:3001/api/pos/oauth/callback
```

**Production:**
```bash
SQUARE_APP_ID=sq0idp-xxxxxxxxxxxxxxxxxxxx
SQUARE_APP_SECRET=sq0csp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SQUARE_ENVIRONMENT=production
POS_OAUTH_CALLBACK_URL=https://api.drink-ux.com/api/pos/oauth/callback
```

### Webhook Configuration

1. In Square Developer Dashboard, create webhook subscription
2. Configure endpoint URL: `https://api.drink-ux.com/webhooks/square/subscription`
3. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `invoice.payment_made`
4. Copy signature key to `SQUARE_WEBHOOK_SIGNATURE_KEY`

### Token Security

POS tokens are encrypted before storage:
- Access tokens (short-lived)
- Refresh tokens (long-lived)

Encryption uses the `TOKEN_ENCRYPTION_KEY` environment variable.

---

## Monitoring and Operations

### Health Check Endpoints

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `GET /api/health` | Overall system health | Load balancer health checks |
| `GET /api/health/ready` | Readiness probe | Kubernetes readiness |
| `GET /api/health/live` | Liveness probe | Kubernetes liveness |
| `GET /api/health/pos` | POS connectivity | POS monitoring |

### Logging

**Log Levels:**
- `error` - Errors requiring immediate attention
- `warn` - Warnings that should be investigated
- `info` - General operational information
- `debug` - Detailed debugging information

**Structured Logging Example:**
```typescript
console.error('Error:', {
  method: req.method,
  path: req.path,
  code: error.code,
  message: error.message,
  statusCode: error.statusCode,
});
```

**Recommended Logging Services:**
- **Datadog** - Full observability platform
- **LogDNA/Mezmo** - Log aggregation
- **AWS CloudWatch** - AWS native logging
- **Papertrail** - Simple log management

### Error Tracking

**Recommended Services:**
- **Sentry** - Real-time error tracking
- **Bugsnag** - Error monitoring with release tracking
- **Rollbar** - Error tracking and debugging

**Integration Example (Sentry):**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Performance Monitoring

**Key Metrics to Track:**
- Response time (p50, p95, p99)
- Request throughput
- Error rate
- Database query performance
- POS API latency

**APM Services:**
- **New Relic** - Full-stack APM
- **Datadog APM** - Distributed tracing
- **Elastic APM** - Open-source option

### Uptime Monitoring

**Services:**
- **UptimeRobot** - Free tier available
- **Pingdom** - Enterprise-grade
- **StatusCake** - Multiple check types

**Health Check Configuration:**
```
URL: https://api.drink-ux.com/api/health
Method: GET
Interval: 1 minute
Expected Status: 200
Alert Threshold: 2 consecutive failures
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### Verify Build (`.github/workflows/verify-build.yml`)

Runs on all PRs and pushes to main/develop branches.

**Steps:**
1. Checkout code
2. Setup Node.js (18.x and 20.x matrix)
3. Install dependencies
4. Generate Prisma client
5. Setup test database
6. Build all packages (shared, api, admin, mobile)
7. Run tests
8. Verify build outputs

#### Deploy Mobile PWA (`.github/workflows/deploy-mobile-pwa.yml`)

Deploys mobile PWA to GitHub Pages.

**Trigger:**
- Push to `main` with changes to `packages/mobile/**` or `packages/shared/**`
- Manual trigger

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Build shared package
5. Build mobile package with `GITHUB_PAGES=true`
6. Deploy to GitHub Pages

### Recommended Additional Workflows

#### Deploy API (Example)
```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'packages/api/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run build --workspace=@drink-ux/shared
      - run: npx prisma generate --schema=packages/api/prisma/schema.prisma
      - run: npm run build --workspace=@drink-ux/api
      - run: npm test --workspace=@drink-ux/api

      # Deploy to Railway/Render/etc.
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service api
```

#### Database Migration (Example)
```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - run: npm ci
      - run: npx prisma generate --schema=packages/api/prisma/schema.prisma

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy
```

### Deployment Triggers

| Event | Action |
|-------|--------|
| PR opened/updated | Run verify-build workflow |
| Push to main (mobile/shared changes) | Deploy mobile PWA |
| Push to main (api changes) | Deploy API (manual or automatic) |
| Manual trigger | Deploy any component |

---

## Security Checklist

### Environment Variable Protection

- [ ] All secrets stored in environment variables, not in code
- [ ] `.env` files added to `.gitignore`
- [ ] Production secrets stored in secure secrets manager
- [ ] Different secrets for each environment
- [ ] Regular secret rotation schedule

### HTTPS Enforcement

- [ ] All production endpoints served over HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] HSTS headers enabled
- [ ] SSL certificates auto-renewed

### CORS Configuration

```typescript
// packages/api/src/index.ts
app.use(cors({
  origin: [
    'https://drink-ux.com',
    'https://admin.drink-ux.com',
    /\.drink-ux\.com$/,  // Tenant subdomains
  ],
  credentials: true,
}));
```

- [ ] CORS origins explicitly whitelisted
- [ ] Credentials only allowed for trusted origins
- [ ] No wildcard `*` origins in production

### Rate Limiting

Current configuration in `packages/api/src/middleware/rateLimit.ts`:

| Endpoint Type | Max Requests | Window |
|---------------|--------------|--------|
| Login | 5 | 15 minutes |
| Signup | 3 | 60 minutes |
| Password Reset | 3 | 60 minutes |
| General API | 100 | 15 minutes |

- [ ] Rate limiting enabled on all endpoints
- [ ] Stricter limits on authentication endpoints
- [ ] Rate limit headers included in responses

### Token Security

- [ ] Session tokens are HTTP-only cookies
- [ ] Secure flag enabled in production
- [ ] SameSite attribute set to 'lax'
- [ ] POS tokens encrypted at rest
- [ ] Session expiration enforced (30 days default)

### Input Validation

- [ ] All user inputs validated
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (React's built-in escaping)
- [ ] Request body size limits

### Authentication

- [ ] Password hashing with bcrypt
- [ ] Email verification required for sensitive actions
- [ ] Session invalidation on password change
- [ ] Account lockout after failed attempts

### Webhook Security

- [ ] Square webhook signatures verified
- [ ] Webhook endpoint protected from replay attacks
- [ ] Event payload validation

---

## Rollback Procedures

### Database Rollback

**Using Prisma Migrate:**
```bash
# View migration history
npx prisma migrate status

# Rollback last migration (development only)
npx prisma migrate reset

# Manual rollback (production)
# 1. Identify problematic migration
# 2. Create new migration to reverse changes
npx prisma migrate dev --name revert_problematic_change
```

**Point-in-Time Recovery (PostgreSQL):**
```bash
# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d drink_ux backup_20240115.dump

# Or restore specific tables
pg_restore -h $DB_HOST -U $DB_USER -d drink_ux -t orders backup_20240115.dump
```

### Code Rollback

**Using Git:**
```bash
# Identify last working commit
git log --oneline

# Revert to specific commit
git revert HEAD~3..HEAD  # Revert last 3 commits

# Or hard reset (use with caution)
git reset --hard <commit_hash>
git push --force origin main
```

**Using Deployment Platforms:**

- **Railway:** Click "Rollback" on previous deployment
- **Render:** Use "Manual Deploy" with previous commit
- **Vercel:** Instant rollback from deployment history

### Incident Response

**Severity Levels:**

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Complete outage | 15 minutes | API down, no orders |
| P2 | Major degradation | 1 hour | POS sync failing |
| P3 | Minor impact | 4 hours | UI bug |
| P4 | Low priority | Next business day | Documentation issue |

**Response Steps:**

1. **Detect** - Monitoring alerts or user reports
2. **Assess** - Determine severity and impact
3. **Communicate** - Notify stakeholders
4. **Mitigate** - Apply temporary fix or rollback
5. **Resolve** - Implement permanent fix
6. **Review** - Post-incident review and documentation

**Communication Template:**
```
[INCIDENT] P1 - API Service Degradation

Status: Investigating
Impact: Orders cannot be submitted
Started: 2024-01-15 10:30 UTC
ETA: Investigating

Updates will be posted every 15 minutes.
```

### Emergency Contacts

Document emergency contacts for:
- On-call engineers
- Database administrators
- Square support (for POS issues)
- Hosting provider support

---

## Quick Reference

### Build Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Build specific package
npm run build --workspace=@drink-ux/api

# Run all dev servers
npm run dev

# Run tests
npm test
```

### Database Commands

```bash
cd packages/api

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name description

# Apply migrations (production)
npx prisma migrate deploy

# Open database browser
npx prisma studio
```

### Deployment URLs

| Environment | Mobile PWA | API | Admin |
|-------------|------------|-----|-------|
| Development | localhost:3000 | localhost:3001 | localhost:3002 |
| Staging | staging.drink-ux.com | api.staging.drink-ux.com | admin.staging.drink-ux.com |
| Production | *.drink-ux.com | api.drink-ux.com | admin.drink-ux.com |
