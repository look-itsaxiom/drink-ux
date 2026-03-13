# Drink-UX

A complete multi-tenant SaaS platform for coffee businesses, featuring a visual drink builder with Square POS integration and subscription billing.

## Overview

Drink-UX transforms the coffee ordering experience by replacing default POS menus with an interactive, visual drink builder. The platform handles the full business lifecycle from client onboarding through subscription management, with deep Square POS integration for catalog sync, order submission, and payment processing.

**Live Demo**: [https://look-itsaxiom.github.io/drink-ux/](https://look-itsaxiom.github.io/drink-ux/)

## Key Features

- **Multi-Tenant Architecture** - Subdomain-based routing with tenant isolation and business-specific configurations
- **Square POS Integration** - OAuth authentication, bi-directional catalog sync, real-time order submission, and payment processing
- **Subscription Billing** - Square Subscriptions API integration with plan management and usage tracking
- **Visual Drink Builder** - Interactive cup visualization with real-time rendering of ingredients and layers
- **Admin Dashboard** - Business onboarding wizard, menu builder, and POS configuration
- **Account Lifecycle** - Full state machine (onboarding, active, paused, suspended, churned) with automated transitions
- **Coming Soon Pages** - Branded placeholder pages for businesses completing onboarding
- **Security** - Rate limiting, request validation, and secure credential handling

## Architecture

npm workspaces monorepo with four packages:

| Package | Description |
|---------|-------------|
| `@drink-ux/mobile` | Ionic/React/Capacitor PWA - Visual drink builder interface |
| `@drink-ux/admin` | React dashboard - Business management and onboarding |
| `@drink-ux/api` | Express/TypeScript backend - REST API with Prisma ORM |
| `@drink-ux/shared` | TypeScript types and utilities shared across packages |

```
shared <- mobile, admin, api
```

## Tech Stack

- **Frontend**: React, Ionic, Capacitor, TypeScript
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: SQLite (dev), PostgreSQL (production)
- **POS Integration**: Square SDK (OAuth, Catalog, Orders, Payments, Subscriptions)
- **Build Tools**: Vite, TypeScript, npm workspaces
- **Testing**: Jest (API), Vitest (mobile/shared)
- **Deployment**: GitHub Actions, GitHub Pages (PWA), Vercel-ready

## Quick Start

```bash
# Clone and install
git clone https://github.com/look-itsaxiom/drink-ux.git
cd drink-ux
npm install

# Generate Prisma client
cd packages/api && npx prisma generate && cd ../..

# Build all packages
npm run build

# Run all dev servers (mobile:3000, api:3001, admin:3002)
npm run dev
```

For detailed setup including Square OAuth configuration, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Test Coverage

- **API**: 1300+ tests covering routes, services, middleware, and utilities
- **Mobile**: 430+ tests for components, hooks, and drink builder logic
- **Shared**: Type validation and utility function tests

Run tests:
```bash
cd packages/api && npm test      # API tests
cd packages/mobile && npm test   # Mobile tests
```

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, and component interactions |
| [API.md](docs/API.md) | REST API reference with endpoints and schemas |
| [TESTING.md](docs/TESTING.md) | Testing patterns, coverage requirements, and examples |
| [CLIENT_ONBOARDING.md](docs/CLIENT_ONBOARDING.md) | Business onboarding flow and setup wizard |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment and environment configuration |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local development setup and workflow |

## Project Status

This is a complete implementation with:
- Full Square POS integration (OAuth, catalog, orders, payments)
- Multi-tenant architecture with subdomain routing
- Subscription billing with plan management
- Visual drink builder with real-time cup rendering
- Admin dashboard with onboarding wizard
- Account lifecycle state machine
- Comprehensive test coverage

## Contributing

Contributions are welcome. Please review the documentation before submitting a Pull Request.

## License

MIT
