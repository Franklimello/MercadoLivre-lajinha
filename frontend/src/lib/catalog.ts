export const productFilterKeys = ["condition", "minPrice", "maxPrice"];
export const vehicleFilterKeys = [
  "minPrice",
  "maxPrice",
  "brand",
  "model",
  "minYear",
  "maxYear",
  "maxMileage",
  "combustivel",
  "cambio",
];

export function catalogApiQuery(params: URLSearchParams, vehicles: boolean) {
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const query = new URLSearchParams({ page: String(page), limit: "12" });
  const filters = vehicles ? vehicleFilterKeys : productFilterKeys;
  for (const key of ["q", "sort", ...filters]) {
    const value = params.get(key);
    if (value)
      query.set(
        key === "combustivel"
          ? "fuel"
          : key === "cambio"
            ? "transmission"
            : key,
        value,
      );
  }
  const category = params.get(vehicles ? "tipo" : "categoria");
  if (category) query.set(vehicles ? "vehicleType" : "category", category);
  return query;
}

export function catalogHref(
  base: string,
  params: URLSearchParams,
  values: Record<string, string>,
) {
  const next = new URLSearchParams(params);
  next.delete("page");
  Object.entries(values).forEach(([key, value]) =>
    value ? next.set(key, value) : next.delete(key),
  );
  return `${base}?${next}`;
}
