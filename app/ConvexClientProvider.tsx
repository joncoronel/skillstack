"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
}

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

// Context to pass the server-provided token to the auth hook
const InitialTokenContext = createContext<string | null | undefined>(null);

// Decode JWT exp claim without a library
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Custom auth hook that uses the server-provided token immediately,
// only fetching from the API when Convex requests a refresh (token expired).
function useBetterAuth() {
  const initialToken = useContext(InitialTokenContext);
  const tokenRef = useRef(initialToken);

  // The provider fires forceRefreshToken:true once on mount (harmless) — we skip it.
  // Any subsequent forceRefreshToken:true means Convex actually rejected the token.
  const handledMountForceRefreshRef = useRef(false);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const currentToken = tokenRef.current;

      if (currentToken) {
        const expiry = getTokenExpiry(currentToken);
        const isValid = expiry && Date.now() < expiry - 10_000;

        if (isValid) {
          if (!forceRefreshToken) {
            return currentToken;
          }
          // First forceRefresh call = mount, serve from cache.
          // Subsequent forceRefresh = real rejection, fall through to fetch.
          if (!handledMountForceRefreshRef.current) {
            handledMountForceRefreshRef.current = true;
            return currentToken;
          }
        }

        // Token still valid but no expiry claim — trust it unless force-refreshed
        if (!expiry && !forceRefreshToken) {
          return currentToken;
        }
      }

      // Token is missing or expired — fetch a fresh one
      try {
        const response = await fetch("/api/auth/convex/token");
        if (!response.ok) {
          tokenRef.current = null;
          return null;
        }
        const data = await response.json();
        const newToken = data?.token ?? null;
        tokenRef.current = newToken;
        return newToken;
      } catch {
        tokenRef.current = null;
        return null;
      }
    },
    [],
  );

  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: !!initialToken,
      fetchAccessToken,
    }),
    [initialToken, fetchAccessToken],
  );
}

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <InitialTokenContext.Provider value={initialToken}>
      <ConvexProviderWithAuth client={convex} useAuth={useBetterAuth}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </InitialTokenContext.Provider>
  );
}
