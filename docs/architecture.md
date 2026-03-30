# Next.js 16 + Convex + Clerk Architecture Guide

Patterns for building a full-stack app with Next.js 16 (App Router), Convex as the backend/database, and Clerk for authentication.

## Stack

| Layer        | Tech                                    | Role                                           |
| ------------ | --------------------------------------- | ---------------------------------------------- |
| Frontend     | Next.js 16 (App Router), React 19      | SSR, streaming, static shells, PPR             |
| Backend + DB | Convex                                  | Real-time queries, mutations, actions, storage |
| Auth         | Clerk (Core 3) + `convex/react-clerk`   | Auth via Clerk, bridged to Convex via JWT      |
| Billing      | Polar + `@convex-dev/polar`             | Subscription billing via Polar MoR, synced to Convex |
| Data Layer   | TanStack Query + `@convex-dev/react-query` | Client-side query integration                |
| URL State    | nuqs                                    | Type-safe URL search param state management  |

### Key dependencies

```
@clerk/nextjs        # Core 3
@clerk/backend       # Core 3
convex
convex/react-clerk
@convex-dev/react-query
@convex-dev/polar
@tanstack/react-query
nuqs
svix
```

---

## 1. Cache Components & Partial Prerendering (PPR)

### Overview

`cacheComponents: true` in `next.config.ts` enables Partial Prerendering — routes produce a **static HTML shell** at build time, with dynamic content streaming in via `<Suspense>` at request time.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
};
```

### How PPR works

At build time, Next.js prerenders the component tree. Components that access dynamic data (`cookies()`, `headers()`, `searchParams`, network requests) cannot complete during prerendering. They must be either:

1. **Wrapped in `<Suspense>`** — deferred to request time, fallback becomes part of static shell
2. **Marked with `"use cache"`** — cached result included in static shell

If neither is done, the build fails with: `Uncached data was accessed outside of <Suspense>`.

### Route types in build output

| Symbol | Type | Meaning |
| ------ | ---- | ------- |
| `○` | Static | Fully prerendered, no dynamic content |
| `◐` | Partial Prerender | Static shell + dynamic streaming |
| `ƒ` | Dynamic | Fully server-rendered per request |

### The `<body>` Suspense catch-all

The root layout wraps `<body>` in `<Suspense>` as a runtime catch-all. This prevents blank page flashes when dynamic access isn't caught by an inner boundary.

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Suspense>
        <body>
          <Providers>{children}</Providers>
        </body>
      </Suspense>
    </html>
  );
}
```

**Why `<body>` not `<html>`?** Wrapping above `<html>` causes the browser to receive an empty response initially (no `<html>` element to render into), resulting in a visible blank flash. Wrapping `<body>` keeps `<html>` and `<head>` (scripts, fonts) in the static shell.

**Important:** The `<body>` Suspense is a runtime catch-all only. The build prerenderer still requires per-page Suspense boundaries for pages with dynamic access. Both are needed.

### `use cache` directive

Replaces the old `force-static` + `revalidate` route segment config:

```tsx
// Before (incompatible with cacheComponents)
export const dynamic = "force-static";
export const revalidate = 86400;

// After
export default async function Page({ params }) {
  "use cache";
  cacheLife("days");
  // ...
}
```

Works for pages, components, functions, and API route handlers.

### Constraints

- Any `searchParams`, `cookies()`, `auth()` access must be inside `<Suspense>` or `use cache`
- Client components using `useSearchParams()` (including nuqs's `useQueryState` which uses it internally) may trigger the dynamic constraint during SSR prerendering. If this happens, either wrap the client component in `<Suspense>` or use a nuqs server loader to access `searchParams` beforehand.
- `Math.random()` cannot be called before accessing dynamic data — this means Convex's `preloadQuery` (which uses `Math.random()` internally for logger IDs) cannot run before `searchParams` or `cookies()` has been accessed. They must be sequential, not `Promise.all()`'d.
- Client components rendered during SSR that access auth state (e.g., via Clerk/Convex provider chain) also trigger the dynamic access constraint

---

## 2. Authentication Setup

### How the pieces connect

```
Browser                     Next.js Server              Convex Backend
───────                     ──────────────              ──────────────
User clicks "Sign in"
       │
       ├──► Clerk hosted UI / components
       │    User authenticates via Clerk
       │              │
       │              ◄── Session created, JWT issued
       ◄──────────────
ClerkProvider has session
       │
       ├──► ConvexProviderWithClerk
       │    calls useAuth() to get token
       │    passes JWT to ConvexReactClient
       │              │
       │              ├──► Convex validates JWT
       │              │    against Clerk's public key
       │              │    (issuer domain in auth.config.ts)
       │              │
       │              ◄── Auth confirmed, queries execute
       ◄──────────────

Separately (async):
Clerk ──► POST /clerk-users-webhook ──► Convex HTTP action
          Svix validates signature         upserts user in DB
```

### Convex auth config

`convex/auth.config.ts` — Tells Convex how to validate Clerk JWTs:

```ts
import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

Set `CLERK_JWT_ISSUER_DOMAIN` on the Convex dashboard. In development: `https://verb-noun-00.clerk.accounts.dev`. In production: `https://clerk.<your-domain>.com`.

### Clerk webhook handler

`convex/http.ts` — Syncs Clerk user events to the Convex `users` table. Handles `user.created`, `user.updated`, and `user.deleted` events, validated with Svix HMAC signatures. Set `CLERK_WEBHOOK_SECRET` on the Convex dashboard.

### User helpers in Convex

`convex/users.ts` — Two key helpers used across all Convex functions:

```ts
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  return await userByExternalId(ctx, identity.subject);
}

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}
```

- `ctx.auth.getUserIdentity()` — Convex's built-in auth. Validates the JWT and returns identity claims.
- `identity.subject` — Maps to Clerk's `userId` (e.g. `user_2abc...`), used to look up the user in the Convex `users` table via the `byExternalId` index.

### Server-side auth helpers

`lib/auth.ts` — Used in Server Components and server actions:

```ts
import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { ClerkOfflineError } from "@clerk/nextjs/errors";
import { redirect } from "next/navigation";

// Cached wrapper — dedupes multiple auth() calls within the same request
export const getAuth = cache(() => auth());

export async function getAuthToken() {
  try {
    return (await (await getAuth()).getToken({ template: "convex" })) ?? undefined;
  } catch (error) {
    if (error instanceof ClerkOfflineError) return undefined;
    throw error;
  }
}

export const verifySession = cache(async () => {
  const { userId } = await getAuth();
  if (!userId) redirect("/sign-in");
  return { userId };
});
```

- `getAuth()` — Cached wrapper around Clerk's `auth()`. Clerk's `auth()` does not deduplicate internally, so this ensures multiple calls in the same render pass (e.g., `HeaderAuth` in the layout + `verifySession()` in the page) only parse the cookie once.
- `getAuthToken()` — Gets a Convex-specific JWT from Clerk for use with `preloadQuery()`. Catches `ClerkOfflineError` (Core 3: `getToken()` throws when network is unavailable instead of returning `null`).
- `verifySession()` — Checks auth and redirects if not signed in. Wrapped in React `cache()` to deduplicate within a single request.

### Clerk middleware

`proxy.ts` — Route-level auth protection:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in", "/sign-in/sso-callback",
  "/sign-up", "/sign-up/sso-callback",
  "/stack/(.*)",
  "/explore",
  "/compare",
  "/pricing",
  "/:org/:repo/:skillId",
]);

const isAuthRoute = createRouteMatcher(["/sign-in", "/sign-up"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  if (isAuthRoute(request) && userId) {
    return Response.redirect(new URL("/", request.url));
  }
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
```

---

## 3. Auth Protection Patterns (3-Layer Defense)

| Layer              | Where                       | How                                              | Behavior                 |
| ------------------ | --------------------------- | ------------------------------------------------ | ------------------------ |
| Route protection   | `proxy.ts` (middleware)     | `auth.protect()` on non-public routes            | Redirects to Clerk login |
| Page protection    | Server Components           | `verifySession()` + `redirect()`                 | Redirects to `/sign-in`  |
| Data protection    | Convex functions            | `getCurrentUserOrThrow(ctx)` + ownership checks  | Throws / returns `null`  |

**Why three layers?**

- Middleware alone isn't sufficient — it can be bypassed. The Next.js docs recommend defense-in-depth.
- `verifySession()` in pages provides a server-side fallback.
- Convex functions are the final gate — even if someone bypasses the frontend, data access requires a valid JWT.

**Example: protected page with all three layers**

```tsx
// proxy.ts — /dashboard is NOT in public routes, so middleware blocks unauthenticated users

// app/(main)/dashboard/page.tsx — defense-in-depth with PPR
export default function DashboardPage() {
  return (
    <main>
      <h1>Your bundles</h1> {/* Static shell */}
      <Suspense fallback={<BundleGridSkeleton />}>
        <DashboardLoader />
      </Suspense>
    </main>
  );
}

async function DashboardLoader() {
  const [, token] = await Promise.all([verifySession(), getAuthToken()]);
  const preloadedBundles = await preloadQuery(api.bundles.listByUser, {}, { token });
  return <DashboardContent preloadedBundles={preloadedBundles} />;
}

// convex/bundles.ts — data-level protection
export const listByUser = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db.query("bundles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});
```

---

## 4. Provider Setup

### Provider nesting order

`ClerkProvider` must wrap `ConvexProviderWithClerk` — Convex needs access to Clerk's context.

```
app/layout.tsx (Server Component)
  └─ <Suspense>                               (wraps <body>, catch-all for cacheComponents)
       └─ <Providers>                          (app/providers.tsx, "use client")
            └─ NuqsAdapter                     (enables shallow URL state updates)
                 └─ ClerkProvider
                      └─ ConvexClientProvider   (app/ConvexClientProvider.tsx)
                           └─ ConvexProviderWithClerk  (bridges Clerk auth → Convex)
                                └─ QueryClientProvider (TanStack Query)
                                     └─ ThemeProvider
                                          └─ ToastProvider
                                               └─ {children}
```

### ConvexClientProvider

`app/ConvexClientProvider.tsx` — Bridges Clerk to Convex and sets up TanStack Query:

```tsx
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ConvexProviderWithClerk>
  );
}
```

> **Note:** `useAuth` from `@clerk/nextjs` is passed as a **prop** to `ConvexProviderWithClerk`. This is the one correct use of Clerk's `useAuth`. Everywhere else, use `useConvexAuth()` from `convex/react`.

---

## 5. Auth in the App Header (Hybrid Server/Client Pattern)

The header uses a hybrid approach: the server decides signed-in vs signed-out (cheap cookie read), then the client handles user data (reactive, free via Clerk).

### Architecture

`AppHeader` is a **server component** that composes client sub-components, each wrapped in its own `<Suspense>` for PPR:

```
AppHeader (SERVER — static shell: <header>, logo)
├── ⏳ Suspense → <MobileNav />       (CLIENT: useState, usePathname)
├── Logo                                (static HTML)
├── ⏳ Suspense → <DesktopNav />       (CLIENT: usePathname)
├── ⏳ Suspense → <ThemeSwitcher />    (CLIENT: useTheme)
└── ⏳ Suspense → <HeaderAuth />       (SERVER: async, getAuth())
                   ├── signed out → <Link> "Sign in" button
                   └── signed in → <UserMenu /> (CLIENT: useUser, useClerk)
```

### Key files

- `components/app-header.tsx` — Server component, renders static header shell with Suspense boundaries
- `components/header-auth.tsx` — Async server component, calls `getAuth()` to decide what to render
- `components/header-nav.tsx` — Client component, desktop nav links with active state via `usePathname()`
- `components/mobile-nav.tsx` — Client component, hamburger + drawer with `useState`
- `components/auth/user-menu.tsx` — Client component, uses Clerk's `useUser()` for user data, `useClerk()` for sign out

### Why this split?

With `cacheComponents`, client components that access auth state during SSR trigger the "uncached data" constraint. By making `HeaderAuth` an async server component:

- **Signed-out users** get a plain `<Link>` button — zero JS for auth, no Clerk hooks loaded
- **Signed-in users** get `<UserMenu>` which uses `useUser()` client-side (reactive, free via Clerk)
- The server auth check (`getAuth()`) is a cached cookie parse — very fast, deduped with other auth calls in the same request

### Tradeoffs considered

| Approach | Skeleton | Server cost | Client JS | Reactivity |
| -------- | -------- | ----------- | --------- | ---------- |
| **Hybrid (current)** | Suspense fallback while `getAuth()` resolves | Cheap cookie parse per request | UserMenu only for signed-in users | `useUser()` reactive |
| Pure client (`useConvexAuth`) | Client skeleton while Convex auth hydrates | None | All users download auth + dropdown JS | `useConvexAuth()` reactive |
| Full server (preloadQuery) | Suspense fallback | Cookie + Convex query per request | Minimal | Real-time via `usePreloadedQuery` |

The hybrid approach was chosen for the balance of: no unnecessary JS for signed-out users, no Convex billing cost for the header, and `useUser()` being free and reactive.

---

## 6. Client-Side Auth State

For components other than the header, use Convex's auth hooks — **not** Clerk's — for UI that depends on auth state. This ensures the JWT has been fetched **and** validated by Convex before rendering authenticated content.

### Hook: `useConvexAuth()` vs `useAuth()`

| Hook             | From              | Returns                         | Use when                                |
| ---------------- | ----------------- | -------------------------------- | --------------------------------------- |
| `useConvexAuth()`| `convex/react`    | `{ isAuthenticated, isLoading }` | Checking auth state in components       |
| `useAuth()`      | `@clerk/nextjs`   | `{ isSignedIn, userId, ... }`    | **Only** as a prop to `ConvexProviderWithClerk` |

### Skipping queries for unauthenticated users

Use `useConvexAuth()` to conditionally skip Convex queries when the user isn't signed in:

```tsx
import { useQuery, useConvexAuth } from "convex/react";

const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
const result = useQuery(api.plans.currentPlan, isAuthenticated ? {} : "skip");
```

Passing `"skip"` tells Convex not to run the query at all — no subscription, no server round-trip.

### Avoiding stale state during auth hydration

When auth is loading, `isAuthenticated` is `false` but the user may be signed in. Defaulting to unauthenticated state can cause a flash of wrong content (e.g., "Free plan" before "Pro plan" loads). Check `isLoading` from `useConvexAuth()` to show a skeleton during the transition:

```tsx
// hooks/use-user-plan.ts
export function useUserPlan() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const result = useQuery(api.plans.currentPlan, isAuthenticated ? {} : "skip");

  return {
    plan: (result?.plan ?? "free") as Plan,
    limits: result?.limits ?? null,
    gatingEnabled: result?.gatingEnabled ?? false,
    isLoading: authLoading || (isAuthenticated && result === undefined),
  };
}
```

---

## 7. Data Fetching Patterns

### Pattern: Static shell + Suspense loader + preload

The core PPR pattern. The page component is sync (renders the static shell), an async loader inside Suspense preloads data on the server, and the client hydrates it into a live subscription.

```tsx
// app/(main)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main>
      <h1>Your bundles</h1>                    {/* Static shell */}
      <Suspense fallback={<BundleGridSkeleton />}>
        <DashboardLoader />                     {/* Streams when ready */}
      </Suspense>
    </main>
  );
}

async function DashboardLoader() {
  const [, token] = await Promise.all([verifySession(), getAuthToken()]);
  const preloadedBundles = await preloadQuery(api.bundles.listByUser, {}, { token });
  return <DashboardContent preloadedBundles={preloadedBundles} />;
}
```

```tsx
// Client component — data is instant, then subscribes for real-time updates
"use client";

export function DashboardContent({
  preloadedBundles,
}: {
  preloadedBundles: Preloaded<typeof api.bundles.listByUser>;
}) {
  const bundles = usePreloadedQuery(preloadedBundles);
  // bundles is immediately available, and auto-updates via WebSocket
}
```

### Pattern: `use cache` for static-ish pages

For pages with stable data that don't need auth, use `"use cache"` + `cacheLife()` instead of Suspense. Replaces the old `force-static` + `revalidate` config.

```tsx
// app/(main)/[org]/[repo]/[skillId]/page.tsx
export default async function SkillPage({ params }) {
  "use cache";
  cacheLife("days");

  const { org, repo, skillId } = await params;
  const skill = await getSkill(`${org}/${repo}`, skillId);
  if (!skill) notFound();

  return <SkillPageContent skill={skill} />;
}
```

Also works for API routes:

```tsx
// app/api/skill-summaries/route.ts
async function getSkillSearchIndex() {
  "use cache";
  cacheLife("days");
  // ... fetch and build search index
  return data;
}

export async function GET() {
  const data = await getSkillSearchIndex();
  return NextResponse.json(data);
}
```

### Pattern: Convex full-text search

For searching Convex data, define a search index in the schema and use `withSearchIndex` in queries:

```ts
// convex/schema.ts
bundles: defineTable({ ... })
  .searchIndex("search_name", {
    searchField: "name",
    filterFields: ["isPublic"],
  }),

// convex/bundles.ts
export const searchPublic = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query, limit = 20 }) => {
    const results = await ctx.db
      .query("bundles")
      .withSearchIndex("search_name", (q) =>
        q.search("name", query).eq("isPublic", true),
      )
      .take(limit);
    return Promise.all(results.map((bundle) => enrichBundle(ctx, bundle)));
  },
});
```

### Pattern: TanStack Query for dynamic client queries

For queries that depend on client-side state (e.g. user selections, search filters), use `convexQuery()` with TanStack Query's `useQuery`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

const { data: skills, isPending } = useQuery(
  convexQuery(
    api.skills.listByTechnologies,
    selectedTechnologies.length > 0
      ? { technologies: selectedTechnologies }
      : "skip",
  ),
);
```

### Pattern: Mutations with optimistic updates

```tsx
const deleteBundle = useMutation(
  api.bundles.deleteBundle,
).withOptimisticUpdate((localStore, { bundleId }) => {
  const current = localStore.getQuery(api.bundles.listByUser, {});
  if (current !== undefined) {
    localStore.setQuery(
      api.bundles.listByUser,
      {},
      current.filter((b) => b._id !== bundleId),
    );
  }
});
```

---

## 8. Billing / Subscriptions

### How Polar integrates

The `@convex-dev/polar` component is registered in `convex/convex.config.ts` and manages subscription data via webhooks. Polar acts as a Merchant of Record (MoR) — it handles payments, tax, and compliance.

```
User clicks "Upgrade to Pro"
       │
       ├──► CheckoutLink generates Polar checkout URL
       │    User completes payment on Polar
       │              │
       │              ├──► Polar sends webhook to /polar/events
       │              │    @convex-dev/polar processes event
       │              │    Stores subscription in Convex
       │              │
       │              ◄── Subscription active
       ◄──────────────
getUserPlan() returns "pro"
```

### Plan resolution

`convex/lib/plans.ts` — Server-side plan logic:

- `getUserPlan(ctx)` — calls `polar.getCurrentSubscription()`, maps `productKey` to `"free"` or `"pro"`
- `getPlanLimits(plan)` — returns feature limits per plan (bundle count, private bundles, etc.)
- `FEATURE_GATING_ENABLED` — master switch. When `false` (MVP), all users get pro-level access. Flip to `true` to enforce limits.

`convex/plans.ts` — exposes `currentPlan` query to the frontend.

`hooks/use-user-plan.ts` — client-side hook returning `{ plan, limits, gatingEnabled, isLoading }`.

### Feature gating

Two-layer enforcement: server-side mutations/actions reject unauthorized operations, client-side UI disables controls and shows upgrade prompts.

### Webhook routes

`convex/http.ts` registers two webhook endpoints:

- `POST /clerk-users-webhook` — Clerk user sync (Svix validated)
- `POST /polar/events` — Polar subscription/product sync (registered via `polar.registerRoutes()`)

---

## 9. URL State Management (nuqs)

### How it works

nuqs provides type-safe URL search parameter state. Client components use `useQueryState()` which internally calls Next.js's `useSearchParams()` to read URL params and `useRouter()` to update them via shallow navigation.

```tsx
// Client component — reads and writes URL state
const [tab, setTab] = useQueryState("tab", tabParser);
```

**Provider**: `NuqsAdapter` wraps the app (outermost in the provider chain) to enable shallow URL updates.

### Why the server loader exists

`useQueryState` works without a server loader — it reads params client-side after hydration. The server loader (`createLoader`) serves two purposes:

1. **SSR correctness** — Without the loader, the server renders with default parser values (e.g., `tab = "browse"`). If the URL is `?tab=search`, the client corrects it on hydration, causing a flash of wrong content. The loader parses the URL params on the server so the SSR HTML matches the URL from the start.

2. **`preloadQuery` compatibility** — Convex's `preloadQuery` uses `Math.random()` internally. Under `cacheComponents`, `Math.random()` cannot run before dynamic data (like `searchParams`) has been accessed. The loader accesses `searchParams` first, "unlocking" `preloadQuery` to run after it. Without the loader, pages that use both nuqs and `preloadQuery` (like the explore page) will fail with a `Math.random()` error.

The loader has negligible cost — it parses a URL string with no network requests. Pages are already dynamic from other accesses (layout auth, etc.), so the loader doesn't change the route's static/dynamic classification.

**Server side** — `lib/search-params.server.ts`:

```tsx
export const loadHomeSearchParams = createLoader({
  q: parseAsString.withDefault(""),
  tab: parseAsStringLiteral(["browse", "search"] as const).withDefault("browse"),
  tech: parseAsArrayOf(parseAsString).withDefault([]),
});

// app/(main)/page.tsx
export default async function Home({ searchParams }) {
  await loadHomeSearchParams(searchParams);
  return <HomeContent />;
}
```

**Client side** — `lib/search-params.ts`:

Parsers are defined separately and used with `useQueryState()` for reactive URL state with shallow updates (no full page re-render).

```tsx
const [tab, setTab] = useQueryState("tab", tabParser);
```

### Current usage

| Page | Params | Server loader needed for `preloadQuery`? |
| ---- | ------ | ------- |
| Home (`/`) | `tab`, `q`, `tech` | No (no preloadQuery), but used for SSR correctness |
| Explore (`/explore`) | `q` | Yes — `preloadQuery` for trending bundles requires prior `searchParams` access |
| Settings (`/settings/custom`) | `tab` | No (no preloadQuery), page already dynamic from auth |

---

## 10. Full Request Lifecycle (PPR)

What happens when a user visits an authenticated page with `cacheComponents` enabled:

```
1. CDN / Edge
   └─ Static shell served immediately (prerendered HTML: <html>, <head>, headings, skeletons)
   └─ Browser starts parsing HTML, loading scripts/fonts

2. Middleware (proxy.ts)
   └─ Clerk checks session cookie
   └─ /dashboard is not public → auth.protect()
   └─ If no session → redirect to Clerk sign-in

3. Layout streams
   └─ AppHeader's static parts (logo) already in shell
   └─ HeaderAuth Suspense resolves → getAuth() reads cookie
   └─ Signed in → <UserMenu /> streams in
   └─ Nav links stream in (usePathname resolution)

4. Page streams
   └─ Static content (headings) already in shell
   └─ Suspense boundary's skeleton already in shell
   └─ DashboardLoader resolves:
      └─ verifySession() + getAuthToken() in parallel
      └─ preloadQuery() fetches data with auth token
      └─ <DashboardContent> streams in replacing skeleton

5. Client hydration
   └─ ConvexProviderWithClerk fetches auth token via useAuth
   └─ Convex validates JWT against Clerk's public key
   └─ usePreloadedQuery() hydrates from server data → instant
   └─ Convex subscribes for real-time updates via WebSocket
   └─ UserMenu: useUser() hydrates from Clerk → avatar appears
```

---

## 11. User Sync Flow

Clerk user data is synced to Convex via webhooks, not client-side:

```
Clerk (user signs up / updates profile / deletes account)
  │
  ├──► POST <CONVEX_SITE_URL>/clerk-users-webhook
  │    Headers: svix-id, svix-timestamp, svix-signature
  │
  └──► convex/http.ts
       ├─ Svix validates webhook signature
       ├─ user.created / user.updated → upsertFromClerk mutation
       │  Maps: first_name + last_name → name
       │        email_addresses.find(primary_email_address_id) → email
       │        image_url → image
       │        id → externalId
       └─ user.deleted → deleteFromClerk mutation
```

The `externalId` field (Clerk's `userId`) is how Convex functions link JWT identity to database records:
`ctx.auth.getUserIdentity().subject` === Clerk `userId` === `users.externalId`

The Convex `users` table contains `name`, `email`, `image` — a denormalized copy of Clerk data. This enables Convex queries to resolve user display info without calling Clerk's API. For user profile mutations (update name, set avatar, etc.), use Clerk's `useUser()` hook which provides the live `UserResource` with methods.

---

## File Structure Reference

```text
lib/
  auth.ts                   # Server-side auth helpers (getAuth, getAuthToken, verifySession)
  plans.ts                  # Frontend plan display data (names, prices, features)
  search-params.ts          # nuqs client-side parsers (tab, tech, search, settings tab)
  search-params.server.ts   # nuqs server-side loaders (createLoader)
  utils.ts                  # cn() helper, getClerkErrorMessage()

hooks/
  use-user-plan.ts          # useUserPlan() hook — skips query for unauth users, handles auth loading

convex/
  convex.config.ts          # App config, registers @convex-dev/polar component
  auth.config.ts            # Clerk JWT issuer domain config
  http.ts                   # Webhook handlers (Clerk + Polar)
  schema.ts                 # Database schema (users, skills, bundles, search indexes)
  users.ts                  # User CRUD, getCurrentUser/getCurrentUserOrThrow
  bundles.ts                # Bundle queries/mutations/search with auth
  polar.ts                  # Polar client, getUserInfo, product config, API exports
  plans.ts                  # currentPlan query (exposes plan to frontend)
  subscriptions.ts          # Subscription details query (billing UI)
  skills.ts                 # Skill sync pipeline, queries
  crons.ts                  # Daily skill sync at 06:00 UTC
  lib/
    plans.ts                # getUserPlan(), PlanLimits, FEATURE_GATING_ENABLED

app/
  layout.tsx                # Root layout — <Suspense> around <body> for PPR catch-all
  providers.tsx             # Provider chain (NuqsAdapter → Clerk → Convex → Theme → Toast)
  ConvexClientProvider.tsx  # ConvexProviderWithClerk + TanStack Query setup
  (main)/
    layout.tsx              # Main layout — renders AppHeader + children
    page.tsx                # Home — async, loads searchParams, renders HomeContent
    explore/
      page.tsx              # Explore — Suspense + preloadQuery for trending bundles
      explore-content.tsx   # Client — trending (preloaded) + search results (useQuery)
    dashboard/
      page.tsx              # Dashboard — Suspense + Promise.all(verifySession, getAuthToken)
      dashboard-content.tsx # Client — usePreloadedQuery + mutations
    stack/[id]/
      page.tsx              # Bundle view — Suspense + parallel preloads
      bundle-view.tsx       # Client — 2x usePreloadedQuery
    dev/
      page.tsx              # Dev dashboard — Suspense + verifySession
    settings/
      page.tsx              # Clerk UserProfile — Suspense + verifySession
      custom/
        page.tsx            # Custom settings — async, sessions promise
    [org]/[repo]/[skillId]/
      page.tsx              # Skill detail — "use cache" + cacheLife("days")
    pricing/
      page.tsx              # Static pricing page
    compare/
      page.tsx              # Compare — Suspense + client-side fetching

components/
  app-header.tsx            # Server component — static shell + Suspense per sub-component
  header-auth.tsx           # Server component — getAuth() for signed-in/signed-out decision
  header-nav.tsx            # Client component — desktop nav links with usePathname
  mobile-nav.tsx            # Client component — hamburger + drawer
  auth/
    user-menu.tsx           # Client component — useUser() for data, useClerk() for signOut
    settings/
      billing-tab.tsx       # Billing tab — plan info, subscription details, manage link
  bundle-bar.tsx            # Uses useConvexAuth() for auth state
  explore/
    trending-bundles.tsx    # Client — usePreloadedQuery for server-preloaded data
    fork-bundle-button.tsx  # Fork button with bundle limit check

proxy.ts                    # Clerk middleware (route protection)
next.config.ts              # cacheComponents: true
```
