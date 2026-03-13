# Drink-UX Production Infrastructure Runbook

**Owner:** CIO
**Last Updated:** 2026-03-12
**Status:** Decisions finalized — board action required for account registration steps

---

## Infrastructure Decisions

### Cloud Provider: Railway ✅

**Chosen:** Railway ([railway.app](https://railway.app))
**Rationale:**
- Dockerfile-based deploy — zero config changes to existing code
- Managed PostgreSQL with automated daily backups included
- Auto-deploy from GitHub on merge to `main`
- Per-usage billing (no cold starts on paid plan)
- Railway CLI enables instant rollback to any prior deployment

**Rejected alternatives:**
- Render: Free tier has cold starts (60s+); paid tier $7/mo is slightly more expensive at this scale
- AWS/GCP: Operational overhead too high for single-engineer stage; revisit at 50+ shops

**Cost estimate (5–10 shops):**

| Resource | Plan | Monthly Cost |
|----------|------|-------------|
| API (Railway Starter) | Hobby → Pro as needed | $5–20 |
| PostgreSQL (Railway) | 1GB storage, daily backups | $5 |
| **Total API infra** | | **$10–25/mo** |

At 10 shops paying $49/mo each = $490 MRR → infra is ~5% of revenue. Acceptable.

---

### Domain: drink-ux.com ✅

**Registrar:** Namecheap (lowest cost, free WhoisGuard)
**Primary domain:** `drink-ux.com`
**Annual cost:** ~$12/year

**DNS configuration (after registration):**

```
# API
api.drink-ux.com    CNAME    <railway-domain>.railway.app

# Admin portal
admin.drink-ux.com  CNAME    <vercel-project>.vercel.app

# App (customer-facing PWA)
app.drink-ux.com    CNAME    look-itsaxiom.github.io
# (or CNAME to vercel if migrated)
```

**SSL:** Auto-provisioned by Railway (Let's Encrypt via their proxy). Zero manual cert management.

---

### Database: Railway PostgreSQL ✅

**Service:** Railway managed PostgreSQL
**Plan:** Hobby ($5/mo) → scales automatically
**Backups:** Daily automated, 7-day retention (included in Railway plan)
**Connection:** Internal Railway network (no public exposure needed for prod)

**Migration plan** (coordinate with CTO on SKI-7):
1. Provision Railway PostgreSQL service
2. Update `packages/api/prisma/schema.prisma`: change `provider = "sqlite"` → `"postgresql"`
3. Run `npx prisma migrate deploy` against the new DB in CI
4. Set `DATABASE_URL` in Railway environment variables

---

### Monitoring: UptimeRobot ✅

**Service:** UptimeRobot free tier
**URL to monitor:** `https://api.drink-ux.com/health`
**Check interval:** 5 minutes
**Alert:** Email on 2 consecutive failures (≈10 min downtime before alert)

**Setup steps:**
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: HTTP, URL = `https://api.drink-ux.com/health`, interval = 5 min
3. Add alert contact (board email + any on-call)

---

### Error Tracking: Sentry ✅

**Service:** Sentry free tier
**Free tier limits:** 5,000 errors/month, 50MB attachments — sufficient for pre-launch
**Projects to create:** `drink-ux-api`, `drink-ux-mobile`

**API integration** (add to `packages/api/src/index.ts`):
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Mobile integration** (add to `packages/mobile/src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

---

### Secrets Management: Railway Environment Variables ✅

**No external secrets manager needed at this stage.** Railway's environment variable store is encrypted at rest and not exposed in logs or build output.

**Production secrets required:**

| Variable | Description | How to generate |
|----------|-------------|-----------------|
| `DATABASE_URL` | Set automatically by Railway PostgreSQL plugin | Auto-injected |
| `NODE_ENV` | Set to `production` | Manual |
| `PORT` | Set to `3001` | Manual |
| `SESSION_SECRET` | Min 32 chars | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Exactly 32 hex chars | `openssl rand -hex 16` |
| `SQUARE_APPLICATION_ID` | From Square Developer Dashboard | Manual |
| `SQUARE_APPLICATION_SECRET` | From Square Developer Dashboard | Manual |
| `SQUARE_ENVIRONMENT` | `production` | Manual |
| `SQUARE_OAUTH_CALLBACK_URL` | `https://api.drink-ux.com/api/pos/oauth/callback` | Manual |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | From Square webhook config | Manual |
| `CORS_ORIGIN` | `https://app.drink-ux.com,https://admin.drink-ux.com` | Manual |
| `SENTRY_DSN` | From Sentry project settings | Manual |

**Do NOT commit any of these to the repository.**

---

## Board Action Items (Human Required)

These steps require the board to take action — agents cannot register accounts or pay for services.

### Step 1: Register Domain
- [ ] Register `drink-ux.com` at Namecheap (~$12/year)
- [ ] Enable WhoisGuard (free privacy protection)
- [ ] Note: do not configure DNS until API is deployed to Railway

### Step 2: Create Railway Account
- [ ] Sign up at [railway.app](https://railway.app) with GitHub
- [ ] Create new project: "Drink-UX"
- [ ] Add PostgreSQL plugin to project
- [ ] Add a new service from GitHub repo (`look-itsaxiom/drink-ux`)
  - Root path: `/` (uses Dockerfile at `packages/api/Dockerfile`)
  - Add `RAILWAY_DOCKERFILE_PATH=packages/api/Dockerfile` in Railway settings
- [ ] Set all environment variables listed in the table above
- [ ] Note the Railway-generated domain (e.g., `drink-ux-api.railway.app`)

### Step 3: Configure Custom Domain
- [ ] In Railway → service → Settings → Domains → Add custom domain: `api.drink-ux.com`
- [ ] Add DNS CNAME record at Namecheap:
  ```
  Type: CNAME  Name: api  Value: <railway-provided-cname>
  ```
- [ ] SSL provisions automatically within 5 minutes

### Step 4: Set Up UptimeRobot
- [ ] Create free account at [uptimerobot.com](https://uptimerobot.com)
- [ ] Add HTTP monitor: `https://api.drink-ux.com/health` every 5 minutes
- [ ] Add email alert contact

### Step 5: Set Up Sentry
- [ ] Create free account at [sentry.io](https://sentry.io)
- [ ] Create project: `drink-ux-api` (Node.js)
- [ ] Create project: `drink-ux-mobile` (React)
- [ ] Copy DSNs to Railway environment variables (`SENTRY_DSN`)
- [ ] Copy mobile DSN to GitHub secrets (`VITE_SENTRY_DSN`) for build

### Step 6: Enable Production Deploy CI/CD
- [ ] Add `RAILWAY_TOKEN` to GitHub repository secrets
  - Railway → Account → Tokens → Create token
  - GitHub repo → Settings → Secrets → New secret: `RAILWAY_TOKEN`
- [ ] The deploy workflow (`.github/workflows/deploy-api.yml`) is already configured and will activate on next push to `main`

---

## CI/CD Pipeline Summary

| Workflow | Trigger | Action |
|----------|---------|--------|
| `verify-build.yml` | All PRs, pushes to main/develop | Build + test all packages |
| `deploy-mobile-pwa.yml` | Push to main (mobile/shared changes) | Deploy to GitHub Pages |
| `deploy-api.yml` | Push to main (api/shared changes) | Deploy to Railway |

The `deploy-api.yml` workflow handles:
1. Build the monorepo
2. Run API tests
3. Deploy to Railway (zero-downtime via Railway's rolling deploy)
4. Run `prisma migrate deploy` post-deploy

---

## Ongoing Operations

### Checking API health
```bash
curl https://api.drink-ux.com/health
```

### Viewing logs
```bash
# Via Railway CLI
railway logs --service api
```

### Rolling back a deployment
- Railway dashboard → Deployments → click any prior build → "Redeploy"

### Database backups
- Railway automatically backs up daily; access via Railway dashboard → PostgreSQL plugin → Backups
- Manual backup: `railway connect postgres` then `pg_dump`

### Incident severity guide

| Level | Example | Target response |
|-------|---------|----------------|
| P1 | API completely down | 15 min |
| P2 | POS sync broken, orders failing | 1 hour |
| P3 | UI bug, non-critical feature broken | 4 hours |
| P4 | Docs/typo | Next session |

---

## Cost Projection

| Shops | MRR (@ $49/shop) | Infra cost | Infra % MRR |
|-------|-----------------|------------|-------------|
| 1–5 | $49–245 | $10–15 | 6–30% |
| 5–10 | $245–490 | $15–25 | 5–10% |
| 10–25 | $490–1225 | $25–50 | 4–5% |
| 25–50 | $1225–2450 | $50–100 | 4% |

Infrastructure cost is not a bottleneck at this scale. Revisit cloud provider choice at 50+ shops.
