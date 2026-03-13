# Drink-UX API

Express/TypeScript backend API with Prisma ORM for the Drink-UX platform. Provides RESTful endpoints for drink ordering, multi-tenant business management, and Square POS integration.

## Features

- **RESTful API Endpoints** - Type-safe Express routes with consistent response formats
- **Session-based Authentication** - Secure user authentication and session management
- **Multi-tenant Business Support** - Support for multiple businesses with isolated data
- **Square POS Integration** - OAuth, catalog sync, and order management
- **Subscription Management** - Square Subscriptions API integration
- **Webhook Handling** - Signature verification and event processing
- **Rate Limiting** - Protection against abuse
- **Health Checks** - Monitoring and deployment verification

## Quick Start

```bash
cd packages/api
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The API server will be available at `http://localhost:3001`

## Environment Variables

Create a `.env` file with the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string (SQLite for dev, PostgreSQL for prod) | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `SQUARE_ACCESS_TOKEN` | Square API access token | For POS features |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` | For POS features |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Key for verifying Square webhook signatures | For webhooks |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data | Yes |
| `PORT` | Server port (default: 3001) | No |

Example `.env`:
```env
PORT=3001
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-session-secret"
ENCRYPTION_KEY="your-encryption-key"
SQUARE_ENVIRONMENT="sandbox"
```

## Project Structure

```
src/
├── routes/           # API route handlers
├── services/         # Business logic
├── middleware/       # Auth, rate limiting, subscription gate
├── adapters/         # POS adapters (Square, etc.)
└── utils/            # Utilities (encryption, errors)

prisma/
├── schema.prisma     # Database schema
└── migrations/       # Database migrations

generated/
└── prisma/           # Generated Prisma client
```

## Key Services

| Service | Description |
|---------|-------------|
| **AuthService** | User authentication, password hashing, and session management |
| **AccountStateService** | Account lifecycle management and state transitions |
| **SubscriptionService** | Square subscription creation, updates, and cancellation |
| **WebhookService** | Webhook signature verification and event processing |
| **SquareAdapter** | POS integration for catalog sync, orders, and payments |

## Testing

The API package has comprehensive test coverage with 1300+ tests.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run with verbose output
npm run test:verbose

# Run a single test file
npm test -- path/to/test
```

## Database Commands

```bash
# Generate Prisma Client (required before build)
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio (visual database browser)
npx prisma studio

# Format schema file
npx prisma format
```

## Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## API Documentation

See [docs/API.md](../../docs/API.md) for the full endpoint reference.

### Quick Reference

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/auth/*` | Authentication endpoints |
| `GET /api/catalog/*` | Menu and catalog data |
| `POST /api/orders/*` | Order management |
| `POST /api/webhooks/square` | Square webhook handler |

## Error Handling

All endpoints follow a consistent error response format:

```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details?: any
  }
}
```

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Type Safety

- Prisma provides type-safe database queries
- All routes use typed request/response objects
- Shared types from `@drink-ux/shared` ensure consistency with frontend apps

## License

MIT
