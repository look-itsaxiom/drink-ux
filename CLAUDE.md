# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (from root)
npm install

# Build all packages (shared must build first)
npm run build

# Run all dev servers simultaneously
npm run dev

# Individual package dev servers
npm run dev --workspace=@drink-ux/mobile   # Port 3000
npm run dev --workspace=@drink-ux/admin    # Port 3002
npm run dev --workspace=@drink-ux/api      # Port 3001
```

### Testing (API package only)

```bash
cd packages/api
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm run test:verbose        # Verbose output
npm test -- path/to/test    # Single test file
```

### Database (Prisma)

```bash
cd packages/api
npx prisma generate         # Generate Prisma client (required before build)
npx prisma migrate dev      # Create/apply migrations
npx prisma studio           # Visual database browser
```

## Architecture

This is an **npm workspaces monorepo** with four packages:

- **`@drink-ux/shared`** - TypeScript type definitions (ES modules). Must build first as other packages depend on it.
- **`@drink-ux/mobile`** - Ionic/React/Capacitor PWA (drink builder UI)
- **`@drink-ux/admin`** - React dashboard (menu/POS management)
- **`@drink-ux/api`** - Express/TypeScript backend with Prisma ORM

### Package Dependencies

```
shared ← mobile
shared ← admin
shared ← api
```

When modifying types in `@drink-ux/shared`, rebuild it before other packages can see the changes.

### Key Architectural Patterns

**Drink Builder Flow** (`packages/mobile/src/components/DrinkBuilder/`):
- Step-based UI: Category → Type → Modifications
- `DrinkBuilderState` manages: category, drinkType, cupSize, isHot, milk, syrups, toppings, totalPrice
- `DrinkVisualizer` utility renders SVG cup with layered visualization (syrups → base → milk → foam)
- `LayeredCup` component displays visual drink composition

**Shared Type System** (`packages/shared/src/types.ts`):
- All cross-package types: `DrinkCustomization`, `Order`, `ApiResponse<T>`, `ApiError`
- Enums: `ComponentType`, `CupSize`, `CupType`, `DrinkCategory`
- Import via `@drink-ux/shared`

**API Structure** (`packages/api/src/`):
- Entry: `index.ts` sets up Express with CORS
- Routes in `routes/` directory
- Database: Prisma ORM with SQLite (dev), PostgreSQL/MySQL (production)
- Generated Prisma client: `packages/api/generated/prisma/`

### Deployment

- **Mobile PWA**: Auto-deploys to GitHub Pages on push to `main` (changes to `packages/mobile/` or `packages/shared/`)
- **Environment**: Set `GITHUB_PAGES=true` for GitHub Pages builds, changes base path to `/drink-ux/`
- **Vercel**: SPA routing configured via `packages/mobile/public/vercel.json`

### Port Assignments

| Package | Dev Port |
|---------|----------|
| mobile  | 3000     |
| api     | 3001     |
| admin   | 3002     |

## Git Flow

**All agents and contributors MUST follow these rules.**

### Branch Protection

- `main` is protected. No direct pushes. All changes go through pull requests.
- PRs require at least 1 approving review and CI must pass before merge.
- No force pushes to `main`. No branch deletions on `main`.

### Branch Naming

All branches follow: `{agent-name}/{SKI-ID}-{short-description}`

Examples:
- `backendengineer/SKI-9-subscription-flow`
- `productdesigner/SKI-34-drink-customizer-redesign`
- `devopsengineer/SKI-62-fix-ci-cd`

Rules:
- Lowercase, kebab-case
- Always include the Paperclip issue ID
- Agent name matches your Paperclip agent name (lowercase, no spaces)

### Workflow

1. **Create branch** from `main` before starting work
2. **Commit often** with descriptive messages: `type(scope): description` (e.g., `feat(api): add subscription expiry service`)
3. **Push branch** to origin when work is ready for review
4. **Open a PR** against `main` with a clear description of changes
5. **Request review** from another engineer — any engineer can review and approve PRs
6. **CI must pass** before merge — tests, builds, and linting
7. **Squash merge** preferred for feature branches to keep `main` history clean

### PR Reviews

- Engineers review each other's PRs. You do NOT need board or CTO approval for routine engineering work.
- The PR author must NOT approve their own PR — get a peer review.
- Board only reviews: pricing decisions, strategy changes, design approvals, public-facing content.

### What NOT to Do

- Never push directly to `main`
- Never force push to shared branches
- Never merge your own PR without a peer review
- Never commit secrets, `.env` files, or credentials
- Never leave stale branches — delete after merge
