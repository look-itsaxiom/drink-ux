# Agent Instructions

This project is managed by **Paperclip** — an AI agent orchestration platform. All work assignments, status updates, and coordination happen through the Paperclip API.

## Paperclip API

Base URL: `http://localhost:3100`

### Getting Your Assignment

When you wake up, you'll receive your agent ID and issue ID. Fetch your current task:

```bash
# Get your assigned issue
curl -s http://localhost:3100/api/issues/{issueId} | jq .

# Get issue comments (for context from other agents or the board)
curl -s http://localhost:3100/api/issues/{issueId}/comments | jq .
```

### Status Updates

```bash
# Mark issue as in_progress when you start
curl -X PATCH http://localhost:3100/api/issues/{issueId} \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'

# Post progress comments
curl -X POST http://localhost:3100/api/issues/{issueId}/comments \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"{yourAgentId}","content":"Description of progress..."}'

# Mark done when complete
curl -X PATCH http://localhost:3100/api/issues/{issueId} \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}'

# Mark in_review if you need human sign-off
curl -X PATCH http://localhost:3100/api/issues/{issueId} \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_review"}'
```

### Creating Sub-issues

If your work naturally breaks down into sub-tasks, create child issues:

```bash
curl -X POST http://localhost:3100/api/issues \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "{companyId}",
    "projectId": "{projectId}",
    "parentId": "{parentIssueId}",
    "title": "Sub-task description",
    "priority": "high",
    "assigneeAgentId": "{yourAgentId}"
  }'
```

## Landing the Plane (Session Completion)

**When ending a work session**, complete ALL steps below. Work is NOT complete until `git push` succeeds.

1. **Post final comment** on your issue summarizing what was done
2. **Run quality gates** (if code changed) — tests, lints, builds
3. **Update issue status** — `done`, `in_review`, or `blocked` with reason
4. **PUSH TO REMOTE**:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **File issues for remaining work** if needed
6. **Verify** — all changes committed AND pushed

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing — that leaves work stranded locally
- If push fails, resolve and retry until it succeeds
- Always work on a feature branch, never commit directly to `main`

## Branch Strategy & Git Flow

### Protected Branches

- **`main`** — production, auto-deploys mobile PWA to GitHub Pages. **No direct pushes.** All changes via PR only.

### Branch Naming

All branches: `{agent-name}/{SKI-ID}-{short-description}` (lowercase, kebab-case)

Examples:
- `backendengineer/SKI-9-subscription-flow`
- `productdesigner/SKI-34-drink-customizer-redesign`
- `devopsengineer/SKI-62-fix-ci-cd`

### Merge Workflow

1. Create branch from `main` before starting work
2. Commit with conventional messages: `type(scope): description` (e.g., `feat(api): add subscription expiry`)
3. Push branch to origin when ready
4. **Open a PR** against `main` — include issue ID in title (e.g., "SKI-62: Fix CI/CD pipeline")
5. **Request a peer review** from another engineer — any engineer can review and approve
6. CI must pass and at least 1 peer review approval required before merge
7. Squash merge preferred for clean history

### PR Reviews

- Engineers review each other's PRs. You do NOT need board or CTO approval for routine work.
- The PR author must NOT approve their own PR.
- Board only reviews: pricing, strategy, design approvals, public-facing content.

### Rules

- **NEVER push directly to `main`** — your push will be rejected
- Never force push to shared branches
- Never merge your own PR without a peer review
- Never commit secrets or `.env` files
- Delete your branch after merge
- Always work on a feature branch, never commit directly to `develop` or `main`

## Branch Strategy

- `main` — production, auto-deploys mobile PWA to GitHub Pages
- `develop` — integration branch, merge features here
- Feature branches: `{agent-name}/{issue-id}-short-description` (e.g., `frontend-engineer/SKI-10-marketing-site`)

## Role-Specific Guidance

### FrontendEngineer

You build user-facing UI. Key principles:
- **Design quality matters** — avoid generic, template-looking output. Create distinctive, polished interfaces
- Use the existing theming system (`packages/mobile/src/theme/`) — CSS variables, not hardcoded colors
- Follow Ionic/React patterns already in the codebase
- Test on mobile viewports — this is a mobile-first PWA
- Reference `docs/mobile/THEMING.md` for the theme system
- Marketing site work goes in a new `packages/marketing/` directory (Vite + React, no Ionic dependency)

### BackendEngineer

You own API and data layer work:
- Express/TypeScript patterns in `packages/api/src/`
- Prisma ORM for all database access — `packages/api/prisma/schema.prisma`
- Run `npm test` in `packages/api/` before pushing — 1300+ existing tests
- Square SDK integration: check `packages/api/src/adapters/` for existing patterns
- Payment and subscription flows must be tested against Square sandbox

### DevOpsEngineer

You handle infrastructure, CI/CD, and deployment:
- Current deployment: GitHub Pages for mobile PWA (see `.github/workflows/deploy-mobile-pwa.yml`)
- API needs production hosting — PostgreSQL, not SQLite
- Environment config in `.env` files per package
- Domain, SSL, monitoring, and backup setup
- Reference `docs/DEPLOYMENT.md` for existing deployment docs

### QA Engineers (Claude, Codex, Gemini)

You own testing and quality assurance. Your toolkit:
- **Playwright** — E2E browser testing (`npx playwright install` for browser binaries)
- **Gherkin/Cucumber** — BDD specs for business-critical flows
- **Jest** — API tests in `packages/api/` (1300+ existing tests)
- **Vitest** — Mobile/shared tests
- **Supertest** — API endpoint integration tests
- **Lighthouse CI** — Performance and accessibility audits
- **Artillery/k6** — Load testing

Key responsibilities:
- Square sandbox testing: credentials are in `packages/api/.env`
- Create diverse sandbox seller accounts (simple shop, complex shop, edge cases)
- Test across mobile viewports — this is a mobile-first PWA
- Report bugs as Paperclip issues with clear reproduction steps
- E2E flows to validate: OAuth onboarding → catalog sync → AI categorization → drink ordering → payment → subscription
- Always test on the `develop` branch

### Junior Engineers (Codex, Gemini)

You handle focused, well-scoped tasks assigned by the CTO:
- Always read the full issue description and comments before starting
- Ask for clarification via issue comments if requirements are unclear
- Your work will be reviewed — focus on correctness over speed
- Run all existing tests before pushing
- If you're unsure about an architectural decision, post a comment and set status to `blocked`
