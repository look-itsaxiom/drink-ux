# Drink-UX API

TypeScript/Express backend API for the Drink-UX platform, providing a unified interface for POS system integration and order management.

## Features

- **POS Abstraction Layer** - Support multiple POS systems (Square, Toast, Clover) through a unified interface
- **Client Company Management** - Manage coffee shop businesses and their configurations
- **Order Management** - Handle drink orders with customizations
- **Type-Safe API** - Full TypeScript support with shared types
- **Comprehensive Testing** - Unit and integration tests with >85% coverage

## Architecture

The API follows a layered architecture pattern:

```
Routes → Managers → Services/Repositories → External APIs/Database
```

- **Routes** - HTTP endpoint handlers (Express routers)
- **Managers** - Business logic and orchestration
- **Services** - Specialized functionality (e.g., POS providers)
- **Repositories** - Data access layer (Prisma ORM)

### POS Abstraction Layer

The POS abstraction layer enables easy integration with multiple point-of-sale systems:

```
IPOSProvider (Interface)
    ↓
BasePOSAdapter (Abstract Class)
    ↓
├── SquarePOSProvider
├── ToastPOSProvider
└── CloverPOSProvider
```

**Key Benefits:**
- Unified API for all POS systems
- Easy to add new providers
- Provider-agnostic business logic
- Comprehensive error handling

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3001
DATABASE_URL="file:./dev.db"

# POS Provider Credentials (for testing)
SQUARE_ACCESS_TOKEN=
TOAST_API_KEY=
CLOVER_API_KEY=
```

## API Endpoints

### POS Integration

```
GET    /api/pos/providers                  - List supported POS providers
GET    /api/pos/integration/:companyId     - Get POS integration
POST   /api/pos/test-connection            - Test POS credentials
POST   /api/pos/integration                - Create/update integration
POST   /api/pos/sync/:companyId            - Sync menu from POS
POST   /api/pos/menu                       - Fetch menu items
POST   /api/pos/order                      - Submit order to POS
GET    /api/pos/order/:orderId/status      - Get order status
DELETE /api/pos/integration/:companyId     - Deactivate integration
```

### Client Companies

```
GET    /api/clientCompanies                - List all companies
GET    /api/clientCompanies/stats          - Get statistics
GET    /api/clientCompanies/:id            - Get company by ID
POST   /api/clientCompanies                - Create company
PATCH  /api/clientCompanies/:id            - Update company
DELETE /api/clientCompanies/:id            - Delete company
```

### Orders

```
GET    /api/orders                         - List all orders
POST   /api/orders                         - Create order
```

### Drinks

```
GET    /api/drinks                         - List all drinks
```

### Health Check

```
GET    /health                             - API health status
```

## Project Structure

```
src/
├── routes/              # HTTP endpoint handlers
│   ├── pos.ts          # POS integration endpoints
│   ├── clientCompany.ts
│   ├── orders.ts
│   └── drinks.ts
├── managers/            # Business logic layer
│   ├── pos.manager.ts
│   └── clientCompany.manager.ts
├── repositories/        # Data access layer
│   ├── posIntegration.repository.ts
│   └── clientCompany.repository.ts
├── services/            # Specialized services
│   └── pos/            # POS abstraction layer
│       ├── interfaces/
│       ├── adapters/
│       ├── providers/
│       └── POSProviderFactory.ts
├── __tests__/          # Test utilities
├── database.ts         # Prisma client
└── index.ts           # Express app entry point

prisma/
├── schema.prisma       # Database schema
└── migrations/         # Database migrations

generated/
└── prisma/            # Generated Prisma client
```

## Database

We use Prisma ORM with SQLite for development:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Open Prisma Studio
npx prisma studio
```

### Schema

```prisma
model ClientCompany {
  id             String   @id @default(cuid())
  name           String
  pointOfContact String
  theme          ClientTheme?
  posIntegration POSIntegration?
}

model POSIntegration {
  id        String   @id @default(cuid())
  provider  String   // POSProvider enum
  isActive  Boolean  @default(true)
  company   ClientCompany @relation(...)
}
```

## Testing

The API has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- pos.manager.test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
src/
├── managers/__tests__/
│   ├── pos.manager.test.ts
│   └── clientCompany.manager.test.ts
├── repositories/__tests__/
│   ├── posIntegration.repository.test.ts
│   └── clientCompany.repository.test.ts
├── routes/__tests__/
│   └── clientCompany.routes.test.ts
└── services/pos/__tests__/
    ├── POSProviderFactory.test.ts
    └── SquarePOSProvider.test.ts
```

## Adding a New POS Provider

1. Add to `POSProvider` enum in `@drink-ux/shared`
2. Create provider class extending `BasePOSAdapter`
3. Implement required methods: `testConnection`, `fetchMenu`, `submitOrder`, `syncMenu`, `getOrderStatus`
4. Register in `POSProviderFactory`
5. Add tests
6. Update documentation

See [POS Architecture Documentation](../../docs/api/POS_ARCHITECTURE.md) for details.

## Type Safety

All types are shared across packages via `@drink-ux/shared`:

```typescript
import {
  POSProvider,
  POSCredentials,
  POSConfig,
  POSMenuItem,
  POSOrder,
  ApiResponse,
} from "@drink-ux/shared";
```

This ensures type consistency between API, mobile app, and admin portal.

## Error Handling

All endpoints follow a consistent error response format:

```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details?: any  // Optional additional information
  }
}
```

Common error codes:
- `BAD_REQUEST` - Invalid request parameters
- `NOT_FOUND` - Resource not found
- `INTERNAL_SERVER_ERROR` - Server error
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions

## Performance

- **Singleton Providers** - POS providers are cached for efficiency
- **Database Connection Pooling** - Prisma connection pooling
- **Async/Await** - Non-blocking I/O throughout
- **Type Validation** - Input validation at route level

## Security

- **Credential Protection** - Never expose POS credentials in responses
- **Input Validation** - Validate all request parameters
- **HTTPS Only** - Production uses HTTPS exclusively
- **Rate Limiting** - (TODO) Implement rate limiting
- **Authentication** - (TODO) Implement JWT authentication

## Documentation

- [POS Architecture](../../docs/api/POS_ARCHITECTURE.md) - Detailed architecture documentation
- [POS Integration Guide](../../docs/api/POS_INTEGRATION.md) - Setup and configuration
- [Development Guide](../../docs/DEVELOPMENT.md) - General development workflow

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation
4. Follow TypeScript best practices
5. Use meaningful commit messages

## License

MIT
