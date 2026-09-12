"use client";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { resourcePolicy } from "@/lib/query-keys";
import { useAuth } from "@/contexts/AuthContext";

export function useApiResource<T>(endpoint: string | null) {
  const { user, firebaseUser } = useAuth();
  const policy = resourcePolicy(endpoint || "/disabled", firebaseUser?.uid);
  const enabled = !!endpoint && (!policy.private || !!user);
  const query = useQuery<T, Error>({
    queryKey: policy.queryKey,
    queryFn: ({ signal }) =>
      apiFetch<T>(endpoint!, { signal, publicRead: !policy.private }),
    enabled,
    staleTime: policy.staleTime,
    gcTime: policy.gcTime,
    refetchInterval: policy.refetchInterval,
    refetchIntervalInBackground: false,
    placeholderData: (previous, previousQuery) => {
      // Only retain grids from the same public catalog while switching filters.
      const next = policy.queryKey;
      const old = previousQuery?.queryKey;
      return next[0] === "marketplace" &&
        next[2] === "list" &&
        old?.[1] === next[1] &&
        old?.[2] === "list"
        ? previous
        : undefined;
    },
  });
  const refetch = query.refetch;
  // Keep error presentation during a retry; TanStack remains the only data cache.
  const key = JSON.stringify(policy.queryKey);
  const [lastError, setLastError] = useState<{ key: string; error?: Error }>({
    key,
  });
  if (
    lastError.key !== key ||
    (query.error && query.error !== lastError.error) ||
    (query.isSuccess && !query.isPlaceholderData && lastError.error)
  ) {
    setLastError({ key, error: query.error || undefined });
  }
  const error =
    query.error ||
    (query.isPending && lastError.key === key ? lastError.error : undefined);
  const removed =
    error instanceof ApiError && [401, 403, 404, 410].includes(error.status);
  const reload = useCallback(() => {
    void refetch({ cancelRefetch: false });
  }, [refetch]);
  return {
    data:
      enabled && !query.isPlaceholderData && !removed ? query.data : undefined,
    error: enabled ? error : undefined,
    loading:
      enabled && ((query.isPending && !error) || query.isPlaceholderData),
    refreshing: enabled && query.isFetching,
    previousData: query.isPlaceholderData ? query.data : undefined,
    previousError: undefined,
    stale: query.isStale,
    updatedAt: query.dataUpdatedAt,
    reload,
  };
}
