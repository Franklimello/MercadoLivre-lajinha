"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { resourcePolicy } from "@/lib/query-keys";

/** One hovered/focused item at a time; touch and data-saving connections skip it. */
export function useListingPrefetch(endpoint: string) {
  const client = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cancel = () => clearTimeout(timer.current);
  const prefetch = () => {
    cancel();
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      !navigator.onLine ||
      connection?.saveData ||
      connection?.effectiveType?.includes("2g") ||
      !matchMedia("(hover: hover)").matches
    )
      return;
    timer.current = setTimeout(() => {
      if (client.isFetching() > 1) return;
      const policy = resourcePolicy(endpoint);
      void client.prefetchQuery({
        queryKey: policy.queryKey,
        staleTime: policy.staleTime,
        gcTime: policy.gcTime,
        queryFn: ({ signal }) =>
          apiFetch(endpoint, { signal, publicRead: !policy.private }),
      });
    }, 200);
  };
  return {
    onMouseEnter: prefetch,
    onMouseLeave: cancel,
    onFocus: prefetch,
    onBlur: cancel,
  };
}
