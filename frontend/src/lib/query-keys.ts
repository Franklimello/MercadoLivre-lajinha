const publicRoot = ["marketplace"] as const;
export const queryKeys = {
  products: {
    all: [...publicRoot, "products"] as const,
    detail: (id: string) => [...publicRoot, "products", "detail", id] as const,
  },
  vehicles: {
    all: [...publicRoot, "vehicles"] as const,
    detail: (id: string) => [...publicRoot, "vehicles", "detail", id] as const,
  },
  reference: [...publicRoot, "reference"] as const,
  private: ["private"] as const,
  profile: (uid: string) => ["private", uid, "users", "profile"] as const,
};

/** Canonical keys retain every API filter, including repeated parameters. */
export function resourcePolicy(endpoint: string, uid = "anonymous") {
  const url = new URL(endpoint, "https://api.local");
  const parts = url.pathname.split("/").filter(Boolean);
  const filters = [...url.searchParams.entries()].sort(
    ([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv),
  );
  const group = parts[0];
  const reference =
    url.pathname === "/products/categories" ||
    url.pathname === "/vehicles/brands";
  const publicListing =
    ["products", "vehicles"].includes(group) &&
    (parts.length === 1 ||
      (parts.length === 2 && !reference && !["my", "all"].includes(parts[1])));
  const detail = publicListing && parts.length === 2;
  const queryKey = reference
    ? [...queryKeys.reference, url.pathname, filters]
    : publicListing
      ? [
          ...publicRoot,
          group,
          detail ? "detail" : "list",
          ...(detail
            ? [parts[1], ...(filters.length ? [filters] : [])]
            : [filters]),
        ]
      : ["private", uid, group, url.pathname, filters];
  return {
    queryKey,
    private: !publicListing && !reference,
    staleTime: reference
      ? 10 * 60_000
      : detail
        ? 20_000
        : publicListing
          ? 30_000
          : 0,
    gcTime: reference ? 30 * 60_000 : publicListing ? 5 * 60_000 : 60_000,
    refetchInterval: detail
      ? 20_000
      : publicListing
        ? 30_000
        : (false as const),
  };
}

export function mutationTargets(endpoint: string) {
  const group = endpoint.split("?")[0].split("/").filter(Boolean)[0];
  if (group === "products" || group === "vehicles")
    return [queryKeys.products.all, queryKeys.vehicles.all, queryKeys.private];
  if (group === "negotiations")
    return [queryKeys.products.all, queryKeys.vehicles.all, queryKeys.private];
  if (group === "users") return [queryKeys.private];
  return [];
}
