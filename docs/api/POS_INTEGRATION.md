# POS Integration Guide

## Overview

Drink-UX provides seamless integration with major POS systems. This guide covers setup and configuration for each supported provider.

## Supported POS Systems

### Square

Square is a popular POS system for small businesses with robust API capabilities.

#### Prerequisites
- Square Developer Account
- Application created in Square Developer Dashboard
- OAuth credentials

#### Setup Steps

1. Create a Square Application:
   - Visit https://developer.squareup.com
   - Create a new application
   - Note your Application ID and Access Token

2. Configure in Drink-UX Admin:
   - Navigate to POS Integration
   - Select "Square" as provider
   - Enter your Access Token
   - Enter your Location ID
   - Test the connection

3. Menu Sync:
   - Click "Sync Menu Now" to import items from Square
   - Drink-UX will map Square catalog items to drink customizations

#### API Endpoints Used
- Catalog API - For menu items
- Orders API - For order submission
- Locations API - For location management

### Toast

Toast is a restaurant-focused POS system with comprehensive APIs.

#### Prerequisites
- Toast Developer Account
- API Key from Toast
- Restaurant GUID

#### Setup Steps

1. Obtain Toast API Credentials:
   - Contact Toast support for API access
   - Obtain your Restaurant GUID and API Key

2. Configure in Drink-UX Admin:
   - Select "Toast" as provider
   - Enter API Key
   - Enter Restaurant GUID
   - Configure menu mapping

3. Webhook Setup:
   - Configure webhook URL in Toast dashboard
   - Use: `https://your-api.com/api/pos/webhook/toast`

#### API Endpoints Used
- Menu API - For item management
- Orders API - For order creation
- Modifiers API - For customizations

### Clover

Clover provides flexible POS solutions with extensive customization.

#### Prerequisites
- Clover Developer Account
- Merchant ID
- API Token

#### Setup Steps

1. Create Clover App:
   - Visit https://www.clover.com/developers
   - Create a new application
   - Request required permissions

2. Configure in Drink-UX Admin:
   - Select "Clover" as provider
   - Enter Merchant ID
   - Enter API Token
   - Configure item mapping

3. Install App:
   - Install your Clover app on test merchant
   - Verify permissions
   - Test order flow

#### API Endpoints Used
- Inventory API - For menu items
- Orders API - For order management
- Modifiers API - For customizations

## Menu Synchronization

### Automatic Sync

Configure automatic menu synchronization in the admin portal:

```
Sync Interval: 60 minutes (configurable)
Auto Sync: Enabled
```

### Manual Sync

Force a manual sync at any time:
1. Navigate to POS Integration
2. Click "Sync Menu Now"
3. Review sync results

### Menu Mapping

Drink-UX automatically maps POS items to drink types:

- **Base Drinks**: Mapped from POS catalog items
- **Customizations**: Mapped from POS modifiers
- **Pricing**: Synced with POS prices
- **Availability**: Reflects POS inventory status

## Order Flow

### Customer Order Process

1. Customer creates order in Drink-UX mobile app
2. Order validated locally
3. Order sent to Drink-UX API
4. API formats order for POS system
5. Order submitted to POS via API
6. Confirmation returned to customer

### Error Handling

If POS submission fails:
- Order saved locally with "pending" status
- Automatic retry attempted
- Admin notification sent
- Manual intervention option available

## Testing Integration

### Test Mode

Enable test mode in admin portal:
```
Test Mode: Enabled
Use Sandbox: Yes
```

### Test Checklist

- [ ] Connection test successful
- [ ] Menu sync working
- [ ] Order submission successful
- [ ] Price calculations correct
- [ ] Customizations mapped properly
- [ ] Error handling functional

## Security

### API Keys

- Store API keys securely in environment variables
- Never commit credentials to source control
- Rotate keys regularly
- Use different keys for dev/prod

### Authentication

All POS API calls use secure authentication:
- OAuth 2.0 (Square)
- API Key authentication (Toast, Clover)
- HTTPS only
- Token refresh handling

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to POS
**Solutions**:
- Verify API credentials
- Check API key permissions
- Ensure network connectivity
- Review POS system status

### Sync Issues

**Problem**: Menu not syncing
**Solutions**:
- Check sync interval settings
- Verify location/merchant ID
- Review API rate limits
- Check POS catalog structure

### Order Submission Issues

**Problem**: Orders not submitting to POS
**Solutions**:
- Verify order format
- Check item mappings
- Review modifier configurations
- Test with simple order first

## API Rate Limits

Be aware of POS provider rate limits:

- **Square**: 10 requests per second
- **Toast**: 100 requests per minute
- **Clover**: 60 requests per minute

Drink-UX automatically handles rate limiting with exponential backoff.

## Support

For integration support:
- Check provider documentation
- Review Drink-UX logs
- Contact support team
- Open GitHub issue
