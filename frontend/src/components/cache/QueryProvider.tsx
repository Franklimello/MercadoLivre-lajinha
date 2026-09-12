"use client";
import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { subscribeApiMutations } from "@/lib/api";
import { mutationTargets } from "@/lib/query-keys";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: false,
            refetchOnWindowFocus: true,
            refetchOnReconnect: "always",
          },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(
    () =>
      subscribeApiMutations(async (endpoint) => {
        mutationTargets(endpoint).forEach((queryKey) => {
          void client.invalidateQueries({ queryKey });
        });
      }),
    [client],
  );
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    return client.getQueryCache().subscribe((event) => {
      if (event.type === "observerAdded") {
        console.debug(
          "[query]",
          event.query.state.dataUpdatedAt ? "hit" : "miss",
          event.query.queryKey,
          { stale: event.query.isStale() },
        );
        return;
      }
      if (
        event.type !== "updated" ||
        !["fetch", "success", "error", "invalidate"].includes(event.action.type)
      )
        return;
      console.debug("[query]", event.action.type, event.query.queryKey, {
        stale: event.query.isStale(),
        status: event.query.state.fetchStatus,
      });
    });
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
