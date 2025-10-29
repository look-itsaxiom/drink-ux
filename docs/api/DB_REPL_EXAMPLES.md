# Database REPL - Common Queries

This file contains useful Prisma queries you can run in the DB REPL (`npm run db:repl`).

## Getting Started

```bash
npm run db:repl
```

## Common Queries

### View All Partners

```javascript
await prisma.partner.findMany({
  include: {
    theme: true,
    posIntegration: true,
  },
});
```

### Create a Test Partner

```javascript
await models.partner.create({
  data: {
    name: "Test Coffee Shop",
    pointOfContact: "test@example.com",
    theme: {
      create: {
        primaryColor: "#FF6B6B",
        secondaryColor: "#4ECDC4",
        logoUrl: "https://example.com/logo.png",
      },
    },
  },
  include: { theme: true },
});
```

### Add POS Integration to Existing Partner

```javascript
// First, get a partner ID
const partner = await prisma.partner.findFirst();

// Then add POS integration
await prisma.pOSIntegration.create({
  data: {
    provider: "SQUARE",
    isActive: true,
    partnerId: partner.id,
  },
});
```

### Find Partner by Name

```javascript
await prisma.partner.findFirst({
  where: {
    name: {
      contains: "Coffee",
    },
  },
  include: {
    theme: true,
    posIntegration: true,
  },
});
```

### Update Partner Theme

```javascript
await prisma.partnerTheme.update({
  where: {
    partnerId: "your-partner-id-here",
  },
  data: {
    primaryColor: "#00FF00",
    secondaryColor: "#0000FF",
  },
});
```

### Delete a Partner (cascades to theme and POS integration)

```javascript
await prisma.partner.delete({
  where: {
    id: "partner-id-here",
  },
});
```

### Count All Records

```javascript
// Use the built-in command
.count

// Or manually
const counts = {
  partners: await prisma.partner.count(),
  themes: await prisma.partnerTheme.count(),
  integrations: await prisma.pOSIntegration.count()
}
console.table(counts)
```

### Get All Active POS Integrations

```javascript
await prisma.pOSIntegration.findMany({
  where: {
    isActive: true,
  },
  include: {
    partner: {
      include: {
        theme: true,
      },
    },
  },
});
```

### Create Complete Partner Setup

```javascript
await prisma.partner.create({
  data: {
    name: "Awesome Coffee Co.",
    pointOfContact: "owner@awesomecoffee.com",
    theme: {
      create: {
        primaryColor: "#8B4513",
        secondaryColor: "#D2691E",
        logoUrl: "https://example.com/awesome-logo.png",
        backgroundUrl: "https://example.com/bg.jpg",
      },
    },
    posIntegration: {
      create: {
        provider: "SQUARE",
        isActive: true,
      },
    },
  },
  include: {
    theme: true,
    posIntegration: true,
  },
});
```

### Raw SQL Queries (if needed)

```javascript
// Execute raw SQL
await prisma.$queryRaw`SELECT * FROM Partner WHERE name LIKE ${"%Coffee%"}`;

// Execute raw SQL with parameters
await prisma.$executeRaw`UPDATE Partner SET pointOfContact = ${"new@email.com"} WHERE id = ${"some-id"}`;
```

## Built-in REPL Commands

- `.schema` - Show all available models
- `.count` - Show record counts for all tables
- `.clear` - Clear the console
- `.help` - Show all REPL commands
- `.exit` - Exit the REPL (or Ctrl+D)

## Tips

1. **Auto-complete**: Press Tab to see available methods
2. **Previous commands**: Use up/down arrows
3. **Multi-line**: The REPL supports multi-line input
4. **Async/await**: All queries must use `await`
5. **Pretty print**: Objects are automatically formatted
6. **Shortcuts**: Use `db` or `models` for quicker access

## Debugging

Check the last query result:

```javascript
const result = await prisma.partner.findMany();
console.log(JSON.stringify(result, null, 2));
```

Check Prisma client info:

```javascript
prisma._clientVersion;
```
