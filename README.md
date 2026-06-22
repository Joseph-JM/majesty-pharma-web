# Next.js Minimal RBAC Admin

A minimalist and professional Next.js App Router starter with only the requested features:

- Login
- Forgot Password
- Reset Password
- Profile
- RBAC
- Admin Dashboard
- Settings
- Theme using provided colors

## Theme Colors

| Token | Hex |
|---|---|
| Bright Red | `#E40909` |
| Gold | `#E3BB4B` |
| Dark Gray | `#565656` |
| White | `#FFFFFF` |

## Demo Login

Use any password.

- Admin: `admin@company.com`
- User: `user@company.com`

Admin can access Admin page. User cannot access Admin page.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Suggested API Integration Later

Replace the mock auth in:

```bash
components/AuthProvider.tsx
lib/auth.ts
```

with your actual backend authentication, session, JWT, or cookie-based implementation.
