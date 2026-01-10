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
