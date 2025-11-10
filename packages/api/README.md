# Drink-UX API

TypeScript/Express backend API for the Drink-UX platform with Prisma ORM for database management.

## Features

- **TypeScript Express Server** - Type-safe REST API
- **Prisma ORM** - Modern database toolkit with type-safe queries
- **Shared Types** - Full integration with `@drink-ux/shared` types
- **CORS Enabled** - Ready for cross-origin requests
- **Environment Configuration** - Easy setup with `.env` files

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Default configuration:
```env
PORT=3001
DATABASE_URL="file:./dev.db"
```

### Database Setup

Initialize the database with Prisma:

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test
```

The API server will be available at `http://localhost:3001`

## Project Structure

```
src/
├── routes/          # API route handlers
│   └── example.ts   # Example routes
├── database.ts      # Prisma client instance
└── index.ts         # Express app entry point

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations
```

## API Endpoints

### Health Check

```
GET /health - API health status
```

### Example Endpoints

```
GET    /api/example          - Example endpoint
GET    /api/example/users    - Get all users
POST   /api/example/users    - Create a user
```

## Database Schema

The starter schema includes a simple `User` model:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Customize the schema in `prisma/schema.prisma` based on your needs.

## Adding Features

### Adding a New Route

1. Create a new route file in `src/routes/`
2. Import and use types from `@drink-ux/shared`
3. Register the route in `src/index.ts`

Example:

```typescript
// src/routes/myroute.ts
import { Router, Request, Response } from "express";
import { ApiResponse } from "@drink-ux/shared";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const response: ApiResponse<string> = {
    success: true,
    data: "Hello World",
  };
  res.json(response);
});

export const myRoutes = router;
```

```typescript
// src/index.ts
import { myRoutes } from "./routes/myroute";
// ...
app.use("/api/myroute", myRoutes);
```

### Adding Database Models

1. Update `prisma/schema.prisma` with your new model
2. Create a migration:
   ```bash
   npx prisma migrate dev --name add_my_model
   ```
3. Use the model in your routes:
   ```typescript
   import prisma from "../database";
   
   const items = await prisma.myModel.findMany();
   ```

### Using Shared Types

All types from `@drink-ux/shared` are available for import:

```typescript
import { ApiResponse, ApiError } from "@drink-ux/shared";
```

This ensures type consistency across the mobile app, admin portal, and API.

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

Common error codes:
- `BAD_REQUEST` - Invalid request parameters
- `NOT_FOUND` - Resource not found
- `INTERNAL_SERVER_ERROR` - Server error

## Prisma Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Format schema file
npx prisma format
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
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

The API is fully typed with TypeScript:
- Prisma provides type-safe database queries
- All routes use typed request/response objects
- Shared types ensure consistency with frontend apps

## Documentation

See the [main project README](../../README.md) for overall project documentation.

## License

MIT
