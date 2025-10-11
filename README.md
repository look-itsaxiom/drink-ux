# Drink-UX

A comprehensive SaaS platform for small to mid-size coffee businesses, providing a custom drink builder with seamless POS integration.

## Overview

Drink-UX transforms the coffee ordering experience by replacing default POS menus (Square, Toast, Clover, etc.) with a GUI-driven, videogame-like custom drink builder. The platform integrates seamlessly with existing POS systems, making it easy for business partners to enhance their customer ordering experience.

## Architecture

This is a monorepo project built with modern web technologies:

### Packages

- **`@drink-ux/mobile`** - Ionic/React/Capacitor mobile app (PWA/Android/iOS)
  - Custom drink builder interface
  - Real-time order management
  - Responsive design for all devices

- **`@drink-ux/admin`** - React admin portal
  - Business dashboard
  - Menu management
  - POS integration configuration
  - Analytics and reporting

- **`@drink-ux/api`** - TypeScript Express API backend
  - RESTful API endpoints
  - POS integration services
  - Order management
  - Business logic

- **`@drink-ux/shared`** - Shared TypeScript types and utilities
  - Common type definitions
  - Business logic utilities
  - Cross-package consistency

## Tech Stack

- **Frontend**: React, Ionic, Capacitor
- **Backend**: Node.js, Express, TypeScript
- **Build Tools**: Vite, TypeScript
- **Target Platforms**: Web (PWA), iOS, Android

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/look-itsaxiom/drink-ux.git
   cd drink-ux
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

### Development

#### Running the Mobile App

```bash
cd packages/mobile
npm run dev
```

The mobile app will be available at `http://localhost:3000`

**Live Demo**: The mobile drink builder is also available as a PWA at [https://look-itsaxiom.github.io/drink-ux/](https://look-itsaxiom.github.io/drink-ux/)

#### Running the Admin Portal

```bash
cd packages/admin
npm run dev
```

The admin portal will be available at `http://localhost:3002`

#### Running the API

```bash
cd packages/api
npm run dev
```

The API server will be available at `http://localhost:3001`

### Building for Production

#### Mobile App

```bash
cd packages/mobile
npm run build
```

To build for iOS/Android:
```bash
npx cap add ios
npx cap add android
npx cap sync
```

#### Admin Portal

```bash
cd packages/admin
npm run build
```

#### API

```bash
cd packages/api
npm run build
npm start
```

## Deployment

### Mobile PWA (GitHub Pages)

The mobile client is automatically deployed to GitHub Pages when changes are pushed to the `main` branch (specifically changes to `packages/mobile/` or `packages/shared/`).

The PWA is available at: [https://look-itsaxiom.github.io/drink-ux/](https://look-itsaxiom.github.io/drink-ux/)

#### Manual Deployment

You can also manually trigger a deployment using GitHub Actions:

1. Go to the repository on GitHub
2. Navigate to "Actions" tab
3. Select "Deploy Mobile PWA to GitHub Pages" workflow
4. Click "Run workflow"

#### Local Build for GitHub Pages

To build the mobile app with GitHub Pages configuration locally:

```bash
cd packages/mobile
GITHUB_PAGES=true npm run build
```

The production-ready files will be in `packages/mobile/dist/`.

## POS Integration

Drink-UX features a **plug-and-play POS integration architecture** using the Decorator and Factory patterns, allowing seamless integration with multiple Point of Sale systems.

### Currently Supported
- **Square** - Full implementation with menu sync and order management

### Architecture
- **Extensible Design** - Easy to add new POS providers without modifying existing code
- **Universal Data Format** - Converts POS-specific formats to a common structure
- **Type-Safe** - Full TypeScript support with comprehensive interfaces
- **Well-Tested** - 100+ unit tests ensuring reliability

For detailed architecture documentation, see [POS Integration Architecture](docs/architecture/POS_INTEGRATION_ARCHITECTURE.md).

### Square Integration Features
- ✅ Connection testing and credential validation
- ✅ Menu synchronization (items, variations, modifiers)
- ✅ Order submission
- ✅ Location management
- ✅ Automatic sandbox/production detection

### Adding New Providers
The system is designed for easy extensibility. Future providers can be added by:
1. Creating a new adapter class that implements `IPOSAdapter`
2. Registering the adapter with the factory
3. No changes to existing code required!

Planned providers: Toast, Clover

### Configuration

1. Navigate to the Admin Portal
2. Go to "POS Integration" section
3. Select your POS provider
4. Enter your API credentials
5. Configure sync settings
6. Test the connection

## Features

### Mobile App (Live Demo Available)

The mobile drink builder is deployed as a Progressive Web App (PWA) at [https://look-itsaxiom.github.io/drink-ux/](https://look-itsaxiom.github.io/drink-ux/)

Test the drink builder directly in your browser - no installation required!

- **Visual Drink Builder**
  - Interactive, game-like interface with real-time visual feedback
  - Component-based drink construction (Cup → Base → Modifiers)
  - SVG-rendered cup that fills as ingredients are added
  - Smart intent clarification for ambiguous combinations
  - Cup size selection (Small, Medium, Large)
  - Base drink options (Espresso, Cold Brew, Tea, etc.)
  - Extensive modifiers (Milk types, Syrups, Ice, Toppings)
  - Real-time price calculation
  - Modern, sleek UI with smooth animations
  - Fully responsive mobile-first design

- **Order Management**
  - Real-time cart updates
  - Order history
  - Direct POS submission

### Admin Portal

- **Dashboard**
  - Order analytics
  - Revenue tracking
  - Performance metrics

- **Menu Management**
  - Add/edit drinks
  - Manage customization options
  - Set pricing
  - Toggle availability

- **POS Integration**
  - Provider configuration
  - API key management
  - Menu synchronization
  - Connection testing

## API Endpoints

### Drinks
- `GET /api/drinks` - List all drinks
- `GET /api/drinks/:id` - Get drink details

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order

### POS Integration
- `GET /api/pos/integration/:businessId` - Get integration status
- `POST /api/pos/integration` - Configure integration
- `POST /api/pos/integration/test` - Test POS connection
- `POST /api/pos/sync/:businessId` - Sync menu from POS
- `POST /api/pos/order/:businessId` - Submit order to POS
- `GET /api/pos/providers` - Get supported POS providers

### Business
- `GET /api/business/:id` - Get business details
- `PUT /api/business/:id` - Update business settings

## Project Structure

```
drink-ux/
├── packages/
│   ├── mobile/          # Ionic React mobile app
│   │   ├── src/
│   │   │   ├── pages/   # Page components
│   │   │   ├── components/
│   │   │   └── App.tsx
│   │   └── capacitor.config.json
│   ├── admin/           # React admin portal
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── App.tsx
│   │   └── vite.config.ts
│   ├── api/             # Express TypeScript API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   └── shared/          # Shared types
│       ├── src/
│       │   └── types.ts
│       └── tsconfig.json
├── package.json
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For support, please contact the Drink-UX team or open an issue on GitHub.