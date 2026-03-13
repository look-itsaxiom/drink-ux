# Admin Auth MVP Design

**Date:** 2026-01-30
**Status:** Approved
**Related Issues:** drink-ux-uum, drink-ux-z0f

## Goal

Add authentication UI to admin portal for demo-ready MVP. Simple, functional, extensible for future IdP integration.

## Decisions

- All auth UI lives in admin app (no separate marketing site)
- Signup → auto-login → straight to onboarding
- Login → smart redirect based on onboarding state
- Keep auth simple but behind an interface for future IdP swap

## Route Structure

| Route | Purpose | Auth |
|-------|---------|------|
| `/login` | Login form | Public |
| `/signup` | Signup form | Public |
| `/onboarding` | Setup wizard | Protected |
| `/dashboard` | Main dashboard | Protected |
| `/menu`, `/pos` | Other admin pages | Protected |

## Auth Flow

1. Unauthenticated users hitting protected route → redirect to `/login`
2. `/login` has "Don't have an account? Sign up" link
3. `/signup` collects: email, password, business name
4. After signup: call login API, redirect to `/onboarding`
5. After login: check `accountState` → route to `/onboarding` or `/dashboard`

## AuthContext Interface

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

MVP implementation calls existing API endpoints. Future: swap internals for Auth0/Clerk/Firebase.

## Onboarding State Routing

| accountState | Meaning | Route to |
|--------------|---------|----------|
| `ONBOARDING` | Fresh signup | `/onboarding` |
| `ACTIVE` | Setup complete | `/dashboard` |

Smart routing in ProtectedRoute checks `business.accountState`.

## UI Components

**LoginPage (`/login`):**
- Centered card, email + password fields
- "Log in" button, link to signup
- Error display for invalid credentials

**SignupPage (`/signup`):**
- Centered card, business name + email + password
- "Create account" button, link to login
- Basic validation

No marketing fluff - just functional forms.

## API Endpoints Used

All existing:
- `POST /api/auth/signup` → `{ email, password, businessName }`
- `POST /api/auth/login` → `{ email, password }` + sets session cookie
- `GET /api/auth/me` → validates session, returns user
- `POST /api/auth/logout` → clears session

New needed:
- `PUT /api/business/:id/activate` → sets accountState to ACTIVE

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Auth state management |
| `src/components/ProtectedRoute.tsx` | Route guard with smart redirect |
| `src/pages/Login.tsx` | Login form |
| `src/pages/Signup.tsx` | Signup form |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add AuthProvider, route structure |
| `src/pages/Onboarding/index.tsx` | Call activate on completion |

## What We Skip for MVP

- Email verification enforcement
- Password reset UI
- Remember me options
- Marketing landing page
