# Next.js 16 + Convex + Clerk Architecture Guide

Patterns for building a full-stack app with Next.js 16 (App Router), Convex as the backend/database, and Clerk for authentication.

## Stack

| Layer        | Tech                                    | Role                                           |
| ------------ | --------------------------------------- | ---------------------------------------------- |
| Frontend     | Next.js 16 (App Router), React 19      | SSR, streaming, static shells                  |
| Backend + DB | Convex                                  | Real-time queries, mutations, actions, storage |
| Auth         | Clerk + `convex/react-clerk`            | Auth via Clerk, bridged to Convex via JWT      |
| Billing      | Polar + `@convex-dev/polar`             | Subscription billing via Polar MoR, synced to Convex |
| Data Layer   | TanStack Query + `@convex-dev/react-query` | Client-side query integration                |
| URL State    | nuqs                                    | Type-safe URL search param state management  |

### Key dependencies

```
@clerk/nextjs
convex
convex/react-clerk
@convex-dev/react-query
@convex-dev/polar
@tanstack/react-query
nuqs
svix
```

---

## 1. Authentication Setup

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

`convex/http.ts` — Syncs Clerk user events to the Convex `users` table:

```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { polar } from "./polar";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occurred", { status: 400 });
    }
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;
      case "user.deleted": {
        const clerkUserId = event.data.id;
        if (!clerkUserId) {
          console.error("Clerk user.deleted event missing user ID");
          return new Response("Missing user ID", { status: 400 });
        }
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }
    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return null;
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing svix headers");
    return null;
  }

  const payloadString = await req.text();
  const wh = new Webhook(webhookSecret);
  try {
    return wh.verify(payloadString, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

// Polar webhook route — creates /polar/events POST endpoint
polar.registerRoutes(http as any);

export default http;
```

Set `CLERK_WEBHOOK_SECRET` on the Convex dashboard. Configure the webhook endpoint in the Clerk Dashboard pointing to `<CONVEX_SITE_URL>/clerk-users-webhook`.

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
import { redirect } from "next/navigation";

export async function getAuthToken() {
  return (await (await auth()).getToken({ template: "convex" })) ?? undefined;
}

export const verifySession = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return { userId };
});
```

- `getAuthToken()` — Gets a Convex-specific JWT from Clerk for use with `preloadQuery()`.
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

## 2. Auth Protection Patterns (3-Layer Defense)

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

// app/(main)/dashboard/page.tsx — defense-in-depth
export default async function DashboardPage() {
  await verifySession(); // Redirects if not signed in
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardBundles /> {/* Preloads data with auth token */}
    </Suspense>
  );
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

## 3. Provider Setup

### Provider nesting order

`ClerkProvider` must wrap `ConvexProviderWithClerk` — Convex needs access to Clerk's context.

```
app/layout.tsx (Server Component)
  └─ <Providers>                              (app/providers.tsx, "use client")
       └─ NuqsAdapter                        (enables shallow URL state updates)
            └─ ClerkProvider
                 └─ ConvexClientProvider      (app/ConvexClientProvider.tsx)
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

## 4. Client-Side Auth State

Use Convex's auth components and hooks — **not** Clerk's — for UI that depends on auth state. This ensures the JWT has been fetched **and** validated by Convex before rendering authenticated content.

### Components from `convex/react`

| Convex component    | Replaces (Clerk)     | Renders when                         |
| ------------------- | -------------------- | ------------------------------------ |
| `<Authenticated>`   | `<ClerkLoaded>` + auth check | User is authenticated with Convex |
| `<Unauthenticated>` | `<ClerkLoaded>` + no auth    | User is not authenticated          |
| `<AuthLoading>`     | `<ClerkLoading>`     | Auth state is still loading          |

### Hook: `useConvexAuth()` vs `useAuth()`

| Hook             | From              | Returns                         | Use when                                |
| ---------------- | ----------------- | -------------------------------- | --------------------------------------- |
| `useConvexAuth()`| `convex/react`    | `{ isAuthenticated, isLoading }` | Checking auth state in components       |
| `useAuth()`      | `@clerk/nextjs`   | `{ isSignedIn, userId, ... }`    | **Only** as a prop to `ConvexProviderWithClerk` |

### Skipping queries for unauthenticated users

Use `useConvexAuth()` to conditionally skip Convex queries when the user isn't signed in. This prevents wasteful subscriptions for anonymous visitors:

```tsx
import { useQuery, useConvexAuth } from "convex/react";

const { isAuthenticated } = useConvexAuth();
const result = useQuery(api.plans.currentPlan, isAuthenticated ? {} : "skip");
```

Passing `"skip"` tells Convex not to run the query at all — no subscription, no server round-trip. Used in `useUserPlan()` hook and `ForkBundleButton`.

### Example: Header with auth state

```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export function AppHeader() {
  return (
    <header>
      <nav>
        <NavLink href="/explore">Explore</NavLink>
        <NavLink href="/dashboard">Dashboard</NavLink>
      </nav>
      <div>
        <AuthLoading>
          <Skeleton className="h-8 w-16 rounded-md" />
        </AuthLoading>
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <Link href="/sign-in">Sign in</Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
```

---

## 5. Billing / Subscriptions

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

### Polar client

`convex/polar.ts` — Central billing configuration:

- `getUserInfo` query — resolves current user's ID and email for Polar (defined in the same file to avoid circular references with the generated API)
- `products` — maps product keys (`proMonthly`, `proYearly`) to Polar product IDs
- Exports API functions: `generateCheckoutLink`, `generateCustomerPortalUrl`, `changeCurrentSubscription`, `cancelCurrentSubscription`, `getConfiguredProducts`, `listAllProducts`, `listAllSubscriptions`

### Plan resolution

`convex/lib/plans.ts` — Server-side plan logic:

- `getUserPlan(ctx)` — calls `polar.getCurrentSubscription()`, maps `productKey` to `"free"` or `"pro"`
- `getPlanLimits(plan)` — returns feature limits per plan (bundle count, private bundles, etc.)
- `FEATURE_GATING_ENABLED` — master switch. When `false` (MVP), all users get pro-level access. Flip to `true` to enforce limits.

`convex/plans.ts` — exposes `currentPlan` query to the frontend.

`hooks/use-user-plan.ts` — client-side hook returning `{ plan, limits, gatingEnabled, isLoading }`.

### Feature gating

Two-layer enforcement: server-side mutations/actions reject unauthorized operations, client-side UI disables controls and shows upgrade prompts.

**Server-side enforcement** (`convex/bundles.ts`, `convex/github.ts`):

- `createBundle` / `forkBundle` — check `limits.maxBundles` via `getUserPlanWithLimits(ctx)`
- `createBundle` / `updateBundleVisibility` — check `limits.canMakePrivate`
- `detectTechnologies` action — checks `limits.canAutoDetect` via `ctx.runQuery(internal.plans.internalCurrentPlan)` (actions can't access `ctx.db` directly)
- `countByUser` query — returns current user's bundle count for frontend limit checks

**Client-side gating**:

| Component | Gate | UX |
| --- | --- | --- |
| `SaveBundleDialog` | `maxBundles` | Shows `UpgradeBanner` instead of form when at limit |
| `SaveBundleDialog` | `canMakePrivate` | Switch disabled + "Pro" badge + tooltip |
| `VisibilityToggle` (bundle-view) | `canMakePrivate` | Switch disabled + tooltip |
| Dashboard "Make private" | `canMakePrivate` | Toast on click |
| `ForkBundleButton` | `maxBundles` | Toast on click |
| `RepoUrlInput` | `canAutoDetect` | Button disabled + "Pro" badge + upgrade link |

**Master switch**: `FEATURE_GATING_ENABLED` in `convex/lib/plans.ts`. When `false`, `getPlanLimits()` returns pro limits for all users regardless of plan. When `true`, limits are enforced per plan.

**Reusable component**: `components/upgrade-banner.tsx` — inline banner with upgrade message and link to `/pricing`.

### Subscription details

`convex/subscriptions.ts` — query returning rich subscription data (status, billing period, cancellation state) for the billing settings UI.

### Billing UI

- **Pricing page** (`app/(main)/pricing/`) — static marketing page. Signed-out users see "Get started" → sign up. Signed-in free users see "Upgrade to Pro" → Polar checkout. Signed-in pro users see "Manage subscription" → billing settings.
- **Billing tab** (`components/auth/settings/billing-tab.tsx`) — in account settings, shows current plan, billing period, renewal/cancellation dates, and "Manage subscription" button that opens Polar's customer portal.

### Webhook routes

`convex/http.ts` registers two webhook endpoints:

- `POST /clerk-users-webhook` — Clerk user sync (Svix validated)
- `POST /polar/events` — Polar subscription/product sync (registered via `polar.registerRoutes()`)

### Environment variables (Convex dashboard)

```
POLAR_ORGANIZATION_TOKEN   # Polar API token
POLAR_WEBHOOK_SECRET       # Webhook signature verification
POLAR_SERVER               # "sandbox" or "production"
```

---

## 6. URL State Management (nuqs)

### Two-layer pattern

nuqs provides type-safe URL search parameter state that stays in sync between server and client.

**Server side** — `lib/search-params.server.ts`:

`createLoader()` validates and parses URL params in server components. Must be called before client components can read the params via `useQueryState`.

```tsx
// lib/search-params.server.ts
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const loadHomeSearchParams = createLoader({
  q: parseAsString.withDefault(""),
  tab: parseAsStringLiteral(["browse", "search"] as const).withDefault("browse"),
  tech: parseAsArrayOf(parseAsString).withDefault([]),
});

// app/(main)/page.tsx — call loader in server component
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await loadHomeSearchParams(searchParams);
  return <HomeContent />;
}
```

**Client side** — `lib/search-params.ts`:

Parsers are defined separately and used with `useQueryState()` for reactive URL state with shallow updates (no full page re-render).

```tsx
// lib/search-params.ts
export const tabParser = parseAsStringLiteral(["browse", "search"] as const).withDefault("browse");

// In a client component:
const [tab, setTab] = useQueryState("tab", tabParser);
```

**Provider**: `NuqsAdapter` wraps the app (outermost in the provider chain) to enable shallow URL updates.

### Current usage

| Page | Params | Purpose |
| ---- | ------ | ------- |
| Home (`/`) | `tab`, `q`, `tech` | Browse/search toggle, search query, technology filter |
| Explore (`/explore`) | `q` | Search query |
| Settings (`/settings/custom`) | `tab` | Profile/Security/Billing tab switcher |

---

## 7. Data Fetching Patterns

### Pattern: Preload in RSC, hydrate on client

The core flow: **async server component preloads data with auth token → passes `Preloaded<T>` as a prop → client component hydrates it into a live subscription**.

```
Server Component (RSC)                     Client Component
──────────────────────                     ────────────────
verifySession()                            usePreloadedQuery(preloaded)
getAuthToken()                             └─ returns live, reactive data
preloadQuery(api.x.list, {}, { token })
  └─ returns Preloaded<T>
passes as prop ──────────────────────────►
```

**Server component:**

```tsx
// app/(main)/dashboard/dashboard-bundles.tsx
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth";

export async function DashboardBundles() {
  const token = await getAuthToken();
  const preloadedBundles = await preloadQuery(
    api.bundles.listByUser,
    {},
    { token },
  );
  return <DashboardContent preloadedBundles={preloadedBundles} />;
}
```

**Client component:**

```tsx
"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";

export function DashboardContent({
  preloadedBundles,
}: {
  preloadedBundles: Preloaded<typeof api.bundles.listByUser>;
}) {
  const bundles = usePreloadedQuery(preloadedBundles);
  // bundles is now a live, reactive subscription
}
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
      : "skip", // Skip query when no techs selected
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

### Pattern: Convex query with auth + row-level security

Every Convex query/mutation that accesses user data should verify ownership:

```ts
// convex/bundles.ts
export const deleteBundle = mutation({
  args: { bundleId: v.id("bundles") },
  handler: async (ctx, { bundleId }) => {
    const user = await getCurrentUserOrThrow(ctx); // Throws if not authenticated
    const bundle = await ctx.db.get(bundleId);

    if (!bundle || bundle.userId !== user._id) {
      throw new Error("Bundle not found or unauthorized");
    }

    await ctx.db.delete(bundleId);
  },
});
```

---

## 8. Full Request Lifecycle

What happens when a user visits an authenticated page:

```
1. Middleware (proxy.ts)
   └─ Clerk checks session cookie
   └─ /dashboard is not public → auth.protect()
   └─ If no session → redirect to Clerk sign-in

2. Root Layout (server)
   └─ Renders <Providers> wrapper
   └─ ClerkProvider initializes with session
   └─ ConvexProviderWithClerk bridges auth to Convex

3. Page (server)
   └─ verifySession() — defense-in-depth auth check
   └─ Static content (headings) renders immediately
   └─ Suspense boundary wraps async data component:
      └─ getAuthToken() fetches Convex JWT from Clerk
      └─ preloadQuery() fetches data with auth token
      └─ Client component receives Preloaded<T> as prop

4. Client hydration
   └─ ConvexProviderWithClerk fetches auth token via useAuth
   └─ Convex validates JWT against Clerk's public key
   └─ usePreloadedQuery() hydrates from server data
   └─ Convex subscribes for real-time updates via WebSocket
```

---

## 9. User Sync Flow

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

---

## File Structure Reference

```text
lib/
  auth.ts                   # Server-side auth helpers (getAuthToken, verifySession)
  plans.ts                  # Frontend plan display data (names, prices, features)
  search-params.ts          # nuqs client-side parsers (tab, tech, search, settings tab)
  search-params.server.ts   # nuqs server-side loaders (createLoader)
  utils.ts                  # cn() helper (clsx + tailwind-merge)

hooks/
  use-user-plan.ts          # useUserPlan() hook — skips query for unauth users, returns plan/limits

convex/
  convex.config.ts          # App config, registers @convex-dev/polar component
  auth.config.ts            # Clerk JWT issuer domain config
  http.ts                   # Webhook handlers (Clerk + Polar)
  schema.ts                 # Database schema (users, skills, bundles)
  users.ts                  # User CRUD, getCurrentUser/getCurrentUserOrThrow
  polar.ts                  # Polar client, getUserInfo, product config, API exports
  plans.ts                  # currentPlan query (exposes plan to frontend)
  subscriptions.ts          # Subscription details query (billing UI)
  bundles.ts                # Bundle queries/mutations with auth
  skills.ts                 # Skill sync pipeline, queries
  crons.ts                  # Daily skill sync at 06:00 UTC
  lib/
    plans.ts                # getUserPlan(), PlanLimits, FEATURE_GATING_ENABLED

app/
  layout.tsx                # Root layout (Server Component)
  providers.tsx             # Provider chain (NuqsAdapter → Clerk → Convex → Theme → Toast)
  ConvexClientProvider.tsx   # ConvexProviderWithClerk + TanStack Query setup
  (main)/
    dashboard/
      page.tsx              # Protected page (verifySession + Suspense)
      dashboard-bundles.tsx  # Server component (preloadQuery with auth token)
      dashboard-content.tsx  # Client component (usePreloadedQuery + mutations)
    pricing/
      page.tsx              # Static pricing page (server component)
      pricing-content.tsx   # Pricing cards with checkout links (client component)
    settings/
      page.tsx              # Clerk UserProfile component
      custom/
        page.tsx            # Custom settings with Profile/Security/Billing tabs

components/
  app-header.tsx            # Uses <Authenticated>, <Unauthenticated>, <AuthLoading>
  bundle-bar.tsx            # Uses useConvexAuth() for auth state
  upgrade-banner.tsx        # Reusable upgrade CTA banner (used in SaveBundleDialog)
  explore/
    fork-bundle-button.tsx  # Fork button with bundle limit check + auth-conditional query
  auth/
    settings/
      billing-tab.tsx       # Billing tab — plan info, subscription details, manage link

proxy.ts                    # Clerk middleware (route protection)
```
