# Development Guide

## Setup

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Git
- Code editor (VS Code recommended)

### First Time Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/look-itsaxiom/drink-ux.git
   cd drink-ux
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build shared package first:
   ```bash
   cd packages/shared
   npm run build
   cd ../..
   ```

## Development Workflow

### Running Multiple Services

Open 3 terminal windows:

**Terminal 1 - API Server:**
```bash
cd packages/api
npm run dev
```

**Terminal 2 - Mobile App:**
```bash
cd packages/mobile
npm run dev
```

**Terminal 3 - Admin Portal:**
```bash
cd packages/admin
npm run dev
```

### Making Changes

1. Make changes to source files
2. Changes will hot-reload automatically
3. Test your changes in browser/app
4. Commit when ready

## Project Structure

### Mobile App (`packages/mobile`)

```
src/
├── pages/           # Page components
│   ├── Home.tsx
│   ├── DrinkBuilder.tsx
│   └── Cart.tsx
├── components/      # Reusable components
├── services/        # API services
└── App.tsx          # Main app component
```

### Admin Portal (`packages/admin`)

```
src/
├── pages/           # Page components
│   ├── Dashboard.tsx
│   ├── MenuManagement.tsx
│   └── POSIntegration.tsx
├── components/      # Reusable components
└── App.tsx          # Main app component
```

### API (`packages/api`)

```
src/
├── routes/          # API route handlers
│   ├── drinks.ts
│   ├── orders.ts
│   ├── pos.ts
│   └── business.ts
├── services/        # Business logic
├── middleware/      # Express middleware
└── index.ts         # Server entry point
```

### Shared (`packages/shared`)

```
src/
├── types.ts         # TypeScript type definitions
└── index.ts         # Package exports
```

## Adding Features

### Adding a New API Endpoint

1. Create route handler in `packages/api/src/routes/`
2. Import types from `@drink-ux/shared`
3. Add route to `packages/api/src/index.ts`
4. Test endpoint

Example:
```typescript
// packages/api/src/routes/example.ts
import { Router } from 'express';
import { ApiResponse } from '@drink-ux/shared';

const router = Router();

router.get('/', (req, res) => {
  const response: ApiResponse<string> = {
    success: true,
    data: 'Hello World',
  };
  res.json(response);
});

export const exampleRoutes = router;
```

### Adding a New Mobile Page

1. Create component in `packages/mobile/src/pages/`
2. Add route in `packages/mobile/src/App.tsx`
3. Add navigation link

Example:
```tsx
// packages/mobile/src/pages/NewPage.tsx
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const NewPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>New Page</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Page content */}
      </IonContent>
    </IonPage>
  );
};

export default NewPage;
```

### Adding Shared Types

1. Add types to `packages/shared/src/types.ts`
2. Rebuild shared package: `cd packages/shared && npm run build`
3. Types are now available in all packages

## Testing

### Manual Testing

1. Start all services
2. Open browser to test UI
3. Use browser DevTools for debugging
4. Check API responses in Network tab

### Mobile Testing

**iOS (requires macOS):**
```bash
cd packages/mobile
npx cap add ios
npx cap sync
npx cap open ios
```

**Android:**
```bash
cd packages/mobile
npx cap add android
npx cap sync
npx cap open android
```

## Code Style

### TypeScript

- Use strict mode
- Define types for all functions
- Avoid `any` type
- Use interfaces for objects

### React

- Functional components only
- Use hooks for state management
- Keep components small and focused
- Extract reusable logic to custom hooks

### File Naming

- Components: PascalCase (e.g., `DrinkBuilder.tsx`)
- Utilities: camelCase (e.g., `apiClient.ts`)
- Types: PascalCase (e.g., `types.ts`)

## Building for Production

### Build All Packages

```bash
npm run build
```

### Build Individual Packages

```bash
cd packages/mobile
npm run build

cd packages/admin
npm run build

cd packages/api
npm run build
```

## Troubleshooting

### Port Already in Use

If you see "Port already in use" errors:

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different ports in vite.config.ts
```

### Type Errors

If you see type errors after modifying shared types:

```bash
cd packages/shared
npm run build
```

### Module Not Found

If you see "Module not found" errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
npm install
```

## Git Workflow

1. Create feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create Pull Request on GitHub

## Environment Variables

### API (`packages/api/.env`)

```
PORT=3001
DATABASE_URL=
SQUARE_ACCESS_TOKEN=
TOAST_API_KEY=
CLOVER_API_KEY=
```

### Mobile (`packages/mobile/.env`)

```
VITE_API_URL=http://localhost:3001
```

### Admin (`packages/admin/.env`)

```
VITE_API_URL=http://localhost:3001
```

## VS Code Configuration

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Ionic
- React snippets

## Getting Help

- Check existing documentation
- Review code comments
- Search GitHub issues
- Ask team members
- Create new issue if needed
