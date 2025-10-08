# GitHub Pages Deployment Guide

## Overview

The mobile client (drink builder PWA) is automatically deployed to GitHub Pages whenever changes are pushed to the `main` branch that affect:
- `packages/mobile/**`
- `packages/shared/**`
- `.github/workflows/deploy-mobile-pwa.yml`

## Live URL

The deployed PWA is available at: [https://look-itsaxiom.github.io/drink-ux/](https://look-itsaxiom.github.io/drink-ux/)

## How It Works

### Workflow Trigger

The GitHub Action workflow (`.github/workflows/deploy-mobile-pwa.yml`) triggers automatically on:
1. Push to `main` branch with relevant file changes
2. Manual trigger via GitHub Actions UI (workflow_dispatch)

### Build Process

1. **Checkout code** - Gets the latest code from the repository
2. **Setup Node.js** - Installs Node.js 18 with npm caching
3. **Install dependencies** - Runs `npm ci` to install all dependencies
4. **Build shared package** - Builds `@drink-ux/shared` (required by mobile)
5. **Build mobile package** - Builds `@drink-ux/mobile` with `GITHUB_PAGES=true` environment variable
6. **Configure Pages** - Sets up GitHub Pages configuration
7. **Upload artifact** - Uploads the `packages/mobile/dist` directory
8. **Deploy** - Deploys the artifact to GitHub Pages

### Configuration

The mobile app uses special configuration for GitHub Pages deployment:

#### Vite Configuration (`packages/mobile/vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/drink-ux/' : '/',
  // ...
});
```

When `GITHUB_PAGES=true`, Vite builds with `/drink-ux/` as the base path.

#### Router Configuration (`packages/mobile/src/App.tsx`)

```typescript
<IonReactRouter basename={import.meta.env.BASE_URL}>
```

The router uses Vite's `BASE_URL` to ensure navigation works correctly in subdirectories.

#### PWA Manifest (`packages/mobile/public/manifest.json`)

```json
{
  "start_url": "./",
  "scope": "./",
  "icons": [
    { "src": "icon-192.png", ... },
    { "src": "icon-512.png", ... }
  ]
}
```

Uses relative paths to work in subdirectories.

## Manual Deployment

### Via GitHub UI

1. Go to [Actions tab](https://github.com/look-itsaxiom/drink-ux/actions)
2. Select "Deploy Mobile PWA to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

### Local Build

To build the mobile app with GitHub Pages configuration locally:

```bash
cd packages/mobile
GITHUB_PAGES=true npm run build
```

The production-ready files will be in `packages/mobile/dist/`.

## Testing Locally

To test the production build locally:

```bash
cd packages/mobile
GITHUB_PAGES=true npm run build
npx serve dist -s
```

Then navigate to `http://localhost:3000/drink-ux/` (note the subdirectory path).

## GitHub Pages Setup

The repository must have GitHub Pages enabled with the following settings:

1. Go to repository **Settings** → **Pages**
2. **Source**: GitHub Actions
3. No custom domain needed

The workflow handles everything else automatically.

## Troubleshooting

### Build Fails

- Check that all dependencies are correctly specified in `package.json`
- Ensure the shared package builds successfully first
- Review the workflow logs in the Actions tab

### 404 Errors on Deployed Site

- Verify the `base` configuration in `vite.config.ts` matches the repository name
- Check that the router `basename` is set correctly
- Ensure manifest.json uses relative paths

### Assets Not Loading

- Confirm `GITHUB_PAGES=true` is set in the workflow
- Check that public assets (icons, manifest) are in `packages/mobile/public/`
- Verify the build output includes all necessary files

## File Structure

```
packages/mobile/
├── dist/                    # Build output (not committed)
│   ├── assets/              # JS and CSS bundles
│   ├── index.html           # Main HTML file
│   ├── manifest.json        # PWA manifest
│   ├── favicon.png          # Browser favicon
│   ├── icon-192.png         # PWA icon
│   └── icon-512.png         # PWA icon
├── public/                  # Static assets
│   ├── manifest.json
│   ├── favicon.png
│   ├── icon-192.png
│   └── icon-512.png
├── src/                     # Source code
├── index.html               # HTML template
└── vite.config.ts           # Vite configuration
```

## Progressive Web App Features

The deployed site is a fully functional PWA with:

- **Installable** - Can be installed on mobile devices and desktops
- **Offline Capable** - Service worker support (via Vite PWA plugin if added)
- **App-like** - Full-screen mode with custom theme colors
- **Responsive** - Works on all device sizes
- **Fast** - Optimized production build with code splitting

## Updating the Deployment

To update the deployed version:

1. Make changes to the mobile or shared packages
2. Commit and push to `main` branch
3. The workflow will automatically trigger and deploy the updates
4. Changes will be live in a few minutes

## Security

The workflow uses GitHub's OIDC authentication:
- No secrets needed in repository settings
- Secure, temporary tokens
- Limited permissions (read contents, write pages, id-token)
