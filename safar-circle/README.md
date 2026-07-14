# Safar Circle (Standalone)

Collaborative travel OS — the Safar Circle experience extracted from the
Safar Curated monorepo into its own independent Next.js 14 application.

Both apps share the **same backend, database, authentication cookies, APIs and
data** hosted on `safarcurated.com`. This project is UI-only and delegates every
`/api/*` call to the parent domain via `NEXT_PUBLIC_API_BASE_URL`.

- **Production URL:** `https://circle.safarcurated.com`
- **Curated (parent) URL:** `https://safarcurated.com`

---

## Folder structure

```
safar-circle/
├── app/
│   ├── layout.js              # Root layout (fonts, AuthProvider, Toaster)
│   ├── globals.css
│   ├── circle.css             # Circle-specific styles (aurora, glass, nav)
│   ├── page.js                # Landing (/)
│   ├── discover/page.js       # Browse public journeys (/discover)
│   ├── create/page.js         # Journey wizard (/create)
│   ├── studio/
│   │   ├── page.js            # Host studio dashboard (/studio)
│   │   └── _tabs.jsx          # Lazy-loaded studio tabs
│   ├── passport/page.js       # Traveller passport (/passport)
│   └── j/[slug]/
│       ├── page.js            # Journey preview (/j/[slug])
│       ├── members/page.js    # Members admin  (/j/[slug]/members)
│       └── plan/
│           ├── page.js        # Workspace     (/j/[slug]/plan)
│           └── _tabs.js       # Lazy planning tabs (itinerary/chat/polls/…)
├── components/circle/
│   ├── CircleNav.jsx          # Top nav + bottom nav + mobile drawer
│   ├── CompassIcon.jsx
│   └── ShareSheet.jsx
├── lib/
│   ├── auth-context.js        # Shared React auth context (calls Curated /api/auth/*)
│   ├── circle-api.js          # Circle client SDK (proxies to Curated /api/circle/*)
│   └── utils.js               # cn()
├── hooks/
│   ├── use-mobile.jsx
│   └── use-toast.js
├── public/                    # (add favicon/og etc. — copy from Curated)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── .env.example
├── .gitignore
└── package.json
```

---

## Install & Build

```bash
# Install
yarn install

# Local dev (port 3000)
yarn dev

# Production build
yarn build

# Start production server
yarn start
```

`yarn build` has been verified once and completes without errors.

---

## Required Environment Variables

Copy `.env.example` → `.env.local` for local dev, and set the same variables
in the Vercel project dashboard for production.

| Variable | Value (production) | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `https://circle.safarcurated.com` | Canonical origin used in `<link rel="canonical">`, sitemap, OG images and the `signInHref()` absolute return URL. |
| `NEXT_PUBLIC_API_BASE_URL` | `https://safarcurated.com` | Prepended to every `/api/*` fetch (auth + Circle). |
| `NEXT_PUBLIC_CURATED_URL` | `https://safarcurated.com` | Where the sign-in modal lives. Circle redirects unauthenticated users here. |

> **Auth cookie note**  
> For SSO to work seamlessly across `safarcurated.com` and
> `circle.safarcurated.com`, the Curated backend must issue the `safar_token`
> cookie with `Domain=.safarcurated.com; Secure; SameSite=Lax`. This is a
> one-line change on the backend (`lib/auth.js`) and does **not** modify
> business logic.

---

## Vercel Deployment Steps

1. **Push this folder to a new empty GitHub repo** (e.g. `safar/safar-circle`).
   ```bash
   cd safar-circle
   git init
   git checkout -b main
   git add .
   git commit -m "chore: initial commit — Safar Circle standalone"
   git remote add origin git@github.com:<org>/safar-circle.git
   git push -u origin main
   ```
2. In Vercel → **New Project → Import Git Repository** → select the new repo.
3. Framework Preset: **Next.js** (auto-detected).
4. Build & Output settings — leave defaults:
   - Install Command: `yarn install`
   - Build Command: `yarn build`
   - Output Directory: `.next`
5. Environment Variables → add:
   - `NEXT_PUBLIC_BASE_URL=https://circle.safarcurated.com`
   - `NEXT_PUBLIC_API_BASE_URL=https://safarcurated.com`
   - `NEXT_PUBLIC_CURATED_URL=https://safarcurated.com`
6. **Deploy**.
7. In Vercel → project → **Settings → Domains** add `circle.safarcurated.com`
   and follow the CNAME instructions.
8. On the Curated app project, add the following env var so its Navbar link
   points at the correct subdomain (defaults to `https://circle.safarcurated.com`
   if absent):
   - `NEXT_PUBLIC_CIRCLE_URL=https://circle.safarcurated.com`

---

## Manual Steps Required (backend side)

Both changes are on the **existing Safar Curated backend** and are one-liners:

1. **Cookie domain** — When issuing/deleting the `safar_token` cookie in
   `/app/lib/auth.js`, add `Domain=.safarcurated.com` in production so both
   subdomains see the same session cookie.
2. **CORS** — The Curated backend already sets
   `Access-Control-Allow-Origin: *` in `next.config.js`. To lock it down,
   change `process.env.CORS_ORIGINS || '*'` to
   `https://circle.safarcurated.com`. All `credentials:'include'` fetches
   from Circle will then require `Access-Control-Allow-Credentials: true`.

Neither change modifies business logic; they only enable the seamless
cross-subdomain SSO the task requires.
