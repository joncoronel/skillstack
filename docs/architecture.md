# Next.js 16 + Convex + Better Auth Pattern Guide

Patterns for building a full-stack app with Next.js 16 (App Router), Convex as the backend/database, and Better Auth for authentication. Copy these patterns into a new project.

## Stack

| Layer        | Tech                                        | Role                                           |
| ------------ | ------------------------------------------- | ---------------------------------------------- |
| Frontend     | Next.js 16 (App Router), React 19           | SSR, streaming, static shells                  |
| Backend + DB | Convex                                      | Real-time queries, mutations, actions, storage |
| Auth         | Better Auth + `@convex-dev/better-auth`     | Auth with Convex as the database               |
| Config       | `cacheComponents: true` in `next.config.ts` | Enables Next.js cache component behavior       |

### Key dependencies

```
better-auth
@convex-dev/better-auth
convex
next
```

---

## 1. Authentication Setup

### How the pieces connect

```
Browser                     Next.js Server              Convex Backend
───────                     ──────────────              ──────────────
authClient.signIn.email()
       │
       ├──► POST /api/auth/[...all]
       │    Forwards to `handler` from lib/auth-server.ts
       │              │
       │              ├──► Convex HTTP routes
       │              │    authComponent.registerRoutes()
       │              │              │
       │              │              ├──► betterAuth() with
       │              │              │    authComponent.adapter(ctx)
       │              │              │
       │              │              ◄── JWT token returned
       │              ◄──────────────
       ◄──────────────
Token stored in browser
```

### Files to create

**`lib/auth-client.ts`** -- Browser-side auth client

```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});
```

Use `authClient.signIn.email()`, `authClient.signUp.email()`, etc. in client components.

**`lib/auth-server.ts`** -- Server-side auth helpers

```ts
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler, // Next.js API route handler
  preloadAuthQuery, // Preload Convex query with auth token (for RSCs)
  isAuthenticated, // Check auth status server-side
  getToken, // Get JWT for client hydration
  fetchAuthQuery, // Fetch Convex query server-side
  fetchAuthMutation, // Run Convex mutation server-side
  fetchAuthAction, // Run Convex action server-side
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
  // Cache JWTs to avoid repeated auth checks during SSR
  jwtCache: {
    enabled: true,
    expirationToleranceSeconds: 60,
    isAuthError: (error) =>
      error instanceof Error && error.message === "Unauthenticated",
  },
});
```

**`convex/convex.config.ts`** -- Register the Better Auth component

```ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

**`convex/auth.config.ts`** -- Register Better Auth as a Convex auth provider

```ts
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

**`convex/auth.ts`** -- Convex auth component + user query

```ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx), // Convex as the DB
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    plugins: [convex({ authConfig })],
  });
};

// Reusable query to get the current user in any Convex function
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
```

**`convex/http.ts`** -- Register auth HTTP routes

```ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

export default http;
```

**`app/api/auth/[...all]/route.ts`** -- Next.js catch-all forwarding to Better Auth

```ts
import { handler } from "@/lib/auth-server";
export const { GET, POST } = handler;
```

### Auth protection patterns

| Where             | How                                             | Behavior                    |
| ----------------- | ----------------------------------------------- | --------------------------- |
| Server components | `isAuthenticated()` + `redirect()`              | Redirect to sign-in page    |
| Convex queries    | `authComponent.getAuthUser(ctx)` with try/catch | Return `null` / empty array |
| Convex mutations  | `authComponent.getAuthUser(ctx)` + throw        | Block execution             |
| Layout components | Async RSC that checks auth before rendering     | Redirect in layout          |

---

## 2. Provider Setup & Token Hydration

Fetch the JWT server-side in the root layout, pass it to the client so auth is available instantly on hydration (no flash, no extra round-trip).

**`app/layout.tsx`**

```tsx
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Suspense } from "react";

async function ConvexProviderWithToken({ children }) {
  const token = await getToken();
  return (
    <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <ConvexProviderWithToken>{children}</ConvexProviderWithToken>
        </Suspense>
      </body>
    </html>
  );
}
```

**`app/ConvexClientProvider.tsx`**

```tsx
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
```

---

## 3. Data Fetching Patterns

### Pattern: Preload in RSC, hydrate on client

The core flow: **async server component preloads data → passes `Preloaded<T>` as a prop → client component hydrates it into a live subscription**.

```
Server Component (RSC)                     Client Component
──────────────────────                     ────────────────
isAuthenticated()                          usePreloadedQuery(preloaded)
preloadAuthQuery(api.yourResource.list)    └─ returns live, reactive data
  └─ returns Preloaded<T>
passes as prop ──────────────────────────►
```

> **Note:** Use `usePreloadedQuery` from `convex/react` (not `usePreloadedAuthQuery` from `@convex-dev/better-auth`). The server-side `preloadAuthQuery` already fetches data with auth. On the client, `initialToken` provides the auth token immediately, so `usePreloadedQuery` hydrates synchronously and transitions to a live subscription without any gap. `usePreloadedAuthQuery` has a known bug where its internal subscription management causes `undefined` returns during client-side re-navigation.

**Server component (page):**

```tsx
import { Suspense } from "react";
import { isAuthenticated, preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

async function ItemsList() {
  const hasAuth = await isAuthenticated();
  if (!hasAuth) redirect("/signin");

  const preloadedItems = await preloadAuthQuery(api.items.list);
  return <ItemsClient preloadedItems={preloadedItems} />;
}

export default function ItemsPage() {
  return (
    <div>
      <h1>Your Items</h1> {/* static -- renders immediately */}
      <Suspense fallback={<ItemsSkeleton />}>
        {" "}
        {/* dynamic -- streams when ready */}
        <ItemsList />
      </Suspense>
    </div>
  );
}
```

**Client component:**

```tsx
"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";

export function ItemsClient({
  preloadedItems,
}: {
  preloadedItems: Preloaded<typeof api.items.list>;
}) {
  const items = usePreloadedQuery(preloadedItems);

  return items.map((item) => <ItemCard key={item._id} item={item} />);
}
```

### Pattern: Parallel preloading with `Promise.all()`

When a page needs multiple queries, preload them in parallel:

```tsx
async function DetailContent({ id }) {
  const hasAuth = await isAuthenticated();
  if (!hasAuth) redirect("/signin");

  const [preloadedItem, preloadedQuota] = await Promise.all([
    preloadAuthQuery(api.items.get, { id }),
    preloadAuthQuery(api.users.checkQuota),
  ]);

  return (
    <DetailClient
      preloadedItem={preloadedItem}
      preloadedQuota={preloadedQuota}
    />
  );
}
```

### Pattern: Request deduplication with React `cache()`

When multiple components on the same page need the same data (e.g. the header and the page body both need the current user), wrap with `cache()` so only one request fires per render.

**`lib/cached-queries.ts`**

```ts
import { cache } from "react";
import { preloadAuthQuery } from "./auth-server";
import { api } from "@/convex/_generated/api";

export const getCachedUser = cache(() =>
  preloadAuthQuery(api.auth.getCurrentUser)
);

export const getCachedSettings = cache(() =>
  preloadAuthQuery(api.users.getSettings)
);

// Add more as needed for data shared across layout + page
```

Then both the layout header and the page content call `getCachedUser()`, but only one network request is made:

```
Without cache():  Header fetches user + Page fetches user  = 2 requests
With cache():     Header fetches user + Page reuses cache  = 1 request
```

### Pattern: Convex query with auth + row-level security

Every Convex query should verify ownership. Use a `userId` field and a `by_user` index on your tables:

```ts
// convex/schema.ts
items: defineTable({
  userId: v.string(),
  title: v.string(),
  // ...
}).index("by_user", ["userId"]),
```

```ts
// convex/items.ts
export const list = query({
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    return ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
```

---

## 4. Static Shells & Suspense Streaming

### The layout pattern

Separate **static UI** (renders instantly) from **dynamic content** (streams in when data resolves). The static parts become the "shell" the user sees immediately.

**Layout:**

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* Static shell -- renders at build time / instantly */}
      <HeaderShell>
        <Suspense fallback={<HeaderSkeleton />}>
          <AuthenticatedHeader /> {/* async RSC, streams in */}
        </Suspense>
      </HeaderShell>

      {/* Each page handles its own Suspense boundaries */}
      <main>{children}</main>
    </div>
  );
}
```

- `HeaderShell` = logo, nav chrome, static layout. Always renders immediately.
- `AuthenticatedHeader` = async RSC that fetches user data. Wrapped in Suspense with a skeleton fallback.

### The page pattern

Every page follows this structure:

```
┌──────────────────────────────────┐
│  Static content (h1, links)     │  ← renders immediately
│                                  │
│  ┌────────────────────────────┐  │
│  │ <Suspense fallback={...}>  │  │
│  │   <AsyncDataComponent />   │  │  ← streams when data is ready
│  │ </Suspense>                │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Enable `cacheComponents: true` in `next.config.ts` so Next.js can cache these static portions across requests.

### Auth-protected header example

```tsx
// components/authenticated-header.tsx
import { isAuthenticated } from "@/lib/auth-server";
import { getCachedUser, getCachedSettings } from "@/lib/cached-queries";

export async function AuthenticatedHeader() {
  const hasAuth = await isAuthenticated();
  if (!hasAuth) redirect("/signin");

  const [preloadedUser, preloadedSettings] = await Promise.all([
    getCachedUser(), // deduplicated with page-level fetches
    getCachedSettings(),
  ]);

  return (
    <HeaderContent
      preloadedUser={preloadedUser}
      preloadedSettings={preloadedSettings}
    />
  );
}
```

---

## 5. Why `usePreloadedQuery` Instead of `usePreloadedAuthQuery`

`@convex-dev/better-auth` provides `usePreloadedAuthQuery` as a drop-in replacement for `usePreloadedQuery` that is supposed to "ensure server-rendered data is rendered until authentication is ready." However, it has a bug that causes the opposite behavior.

### The bug

`usePreloadedAuthQuery` internally tracks a `preloadExpired` flag. Once the live `useQuery` subscription returns data, this flag is set to `true` permanently. On client-side re-navigation (e.g. navigating away from a page and back), the subscription tears down and re-establishes. During this gap:

1. `preloadExpired` is already `true` (from the previous visit)
2. The live `useQuery` result is `undefined` (subscription re-establishing)
3. The hook returns `undefined` instead of falling back to the preloaded data
4. UI flashes empty for several render cycles

This was verified with debug logging — `useConvexAuth()` returns `{ isLoading: false, isAuthenticated: true }` the entire time. The auth token is correctly passed. The issue is purely in the hook's subscription management.

### The fix

Use standard `usePreloadedQuery` from `convex/react`. This works because:

- **Server-side auth is already enforced** — `isAuthenticated()` + `redirect()` in RSCs
- **`initialToken` provides the token immediately** — `ConvexBetterAuthProvider` receives it from the root layout
- **`usePreloadedQuery` hydrates synchronously** — no `undefined` gap, seamless transition to live subscription
- **Reactive updates still work** — Convex's WebSocket subscription activates after hydration

---

## 6. Full Request Lifecycle

What happens when a user visits an authenticated page:

```
1. Root Layout (server)
   └─ getToken() fetches JWT (cached for 60s)
   └─ Wraps children in ConvexClientProvider with initialToken

2. Dashboard Layout (server)
   └─ Static shell renders immediately (header chrome, nav)
   └─ Suspense: AuthenticatedHeader starts streaming
      └─ isAuthenticated() checks auth
      └─ getCachedUser() + getCachedSettings() preload (deduplicated)
      └─ Client header component hydrates with preloaded data

3. Page (server)
   └─ Static content (headings, links) renders immediately
   └─ Suspense: Async data component starts streaming
      └─ isAuthenticated() (same request, no extra cost)
      └─ preloadAuthQuery() fetches page-specific data
      └─ Client component hydrates with preloaded data

4. Client hydration
   └─ ConvexBetterAuthProvider initializes with server token (no re-fetch)
   └─ usePreloadedQuery() hydrates from server data synchronously
   └─ Convex subscribes for real-time updates via WebSocket
```

---

## File Structure Reference

These are the files that make this architecture work. Create them in this order:

```text
lib/
  auth-client.ts          # Better Auth client (browser)
  auth-server.ts          # Better Auth server helpers + JWT caching
  cached-queries.ts       # React cache() wrappers for deduplication

convex/
  convex.config.ts        # Registers the Better Auth component
  auth.config.ts          # Registers Better Auth as Convex auth provider
  auth.ts                 # Auth component, createAuth, getCurrentUser query
  http.ts                 # Registers auth HTTP routes

app/
  api/auth/[...all]/
    route.ts              # Catch-all forwarding to Better Auth handler
  layout.tsx              # Root layout with token hydration + Suspense
  ConvexClientProvider.tsx # Client-side Convex + Better Auth provider
  (dashboard)/
    layout.tsx            # Static shell + Suspense header
    page.tsx              # Page with preloading + Suspense

next.config.ts            # cacheComponents: true
```
