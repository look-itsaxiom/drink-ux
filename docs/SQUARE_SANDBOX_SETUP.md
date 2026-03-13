# Square Sandbox Setup Guide

This guide walks through setting up a Square sandbox environment for drink-ux development and demos.

## Prerequisites

- A Square account (free to create)
- Access to the drink-ux API package

## Step 1: Create a Square Developer Account

1. Go to [Square Developer Dashboard](https://developer.squareup.com/)
2. Sign in with your Square account or create a new one
3. Accept the Developer Terms of Service

## Step 2: Create a Sandbox Application

1. In the Developer Dashboard, click **Applications** in the left sidebar
2. Click **Create your first application** (or **+** if you have existing apps)
3. Enter an application name (e.g., "drink-ux-sandbox")
4. Click **Create Application**

## Step 3: Get Sandbox Credentials

1. Select your newly created application
2. In the left sidebar, click **Credentials**
3. Make sure you're on the **Sandbox** tab (not Production)
4. Copy the following values:
   - **Sandbox Application ID** → `SQUARE_APPLICATION_ID`
   - **Sandbox Application Secret** → `SQUARE_APPLICATION_SECRET`

## Step 4: Configure OAuth Redirect URL

1. In the left sidebar, click **OAuth**
2. Under **Sandbox Redirect URL**, add:
   ```
   http://localhost:3001/api/pos/oauth/callback
   ```
3. Click **Save**

**Note**: For production deployments, you'll add your production URL under **Production Redirect URL**.

## Step 5: Set Up Environment Variables

Copy the `.env.example` file to `.env` in the API package:

```bash
cd packages/api
cp .env.example .env
```

Edit `.env` and replace the placeholder values:

```env
SQUARE_APPLICATION_ID=sandbox-sq0idb-YOUR_ACTUAL_APP_ID
SQUARE_APPLICATION_SECRET=sandbox-sq0csb-YOUR_ACTUAL_SECRET
SQUARE_ENVIRONMENT=sandbox
SQUARE_OAUTH_CALLBACK_URL=http://localhost:3001/api/pos/oauth/callback
```

## Step 6: Create Test Catalog (Optional)

For demos, you can create a test catalog in the Square Sandbox Dashboard:

1. Go to [Square Sandbox Seller Dashboard](https://squareupsandbox.com/)
2. Log in with your sandbox test account (find credentials in Developer Dashboard → Sandbox → Sandbox Test Accounts)
3. Navigate to **Items** → **Item Library**
4. Create sample drinks:

### Suggested Demo Catalog

| Category | Item Name | Price | Variations |
|----------|-----------|-------|------------|
| Coffee | Espresso | $3.00 | Single, Double |
| Coffee | Americano | $3.50 | Small, Medium, Large |
| Coffee | Latte | $4.50 | Small, Medium, Large |
| Tea | Green Tea | $3.00 | Small, Medium, Large |
| Tea | Chai Latte | $4.50 | Small, Medium, Large |
| Specialty | Mocha | $5.00 | Small, Medium, Large |
| Specialty | Caramel Macchiato | $5.50 | Small, Medium, Large |

### Suggested Modifiers

| Modifier Group | Options | Price |
|----------------|---------|-------|
| Milk Options | Whole, Skim, Oat, Almond | +$0.75 for alt milks |
| Extra Shots | Extra Shot | +$0.75 |
| Sweeteners | Vanilla, Caramel, Hazelnut | +$0.50 |
| Toppings | Whipped Cream, Chocolate Drizzle | +$0.25 |

## Step 7: Verify Setup

Start the API server and test the Square connection:

```bash
cd packages/api
npm run dev
```

The Square OAuth flow should now work when you:
1. Start the onboarding flow in the admin UI
2. Select Square as the POS provider
3. Complete the OAuth authorization

## Troubleshooting

### "OAuth token exchange failed"

- Verify your `SQUARE_APPLICATION_SECRET` is correct
- Make sure you're using sandbox credentials with `SQUARE_ENVIRONMENT=sandbox`
- Check that the redirect URL matches exactly

### "Invalid redirect_uri"

- Ensure the URL in your `.env` matches what's configured in the Square Developer Dashboard
- The URL must match exactly, including protocol (http vs https) and port

### "Not authenticated" errors

- The OAuth flow needs to complete before catalog operations work
- Check that tokens are being stored correctly in the database

## Sandbox vs Production

| Setting | Sandbox | Production |
|---------|---------|------------|
| `SQUARE_ENVIRONMENT` | `sandbox` | `production` |
| API Base URL | `connect.squareupsandbox.com` | `connect.squareup.com` |
| Credentials prefix | `sandbox-sq0...` | `sq0...` |
| Real payments | No | Yes |

## Security Notes

- Never commit `.env` files with real credentials
- Keep sandbox and production credentials separate
- Rotate credentials if they're ever exposed
- Use environment variables in CI/CD, not hardcoded values

## Additional Resources

- [Square API Documentation](https://developer.squareup.com/docs)
- [Square OAuth Guide](https://developer.squareup.com/docs/oauth-api/overview)
- [Square Catalog API](https://developer.squareup.com/docs/catalog-api/what-it-does)
- [Square Sandbox Testing](https://developer.squareup.com/docs/devtools/sandbox/overview)
