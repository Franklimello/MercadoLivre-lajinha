import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Test only: compile TS in memory, with no new runtime dependencies or test routes.
async function sourceModule(path, transform = (value) => value) {
  const source = transform(
    await readFile(new URL(path, import.meta.url), "utf8"),
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(
    "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
  );
}
const catalog = await sourceModule("../src/lib/catalog.ts");
const market = await sourceModule("../src/lib/marketplace.ts");

test("product filters use the existing API names and do not send unsupported filters", () => {
  const query = catalog.catalogApiQuery(
    new URLSearchParams(
      "q=mesa&categoria=moveis&condition=GOOD&minPrice=10.50&maxPrice=200&sort=price_asc&city=Lajinha&page=3",
    ),
    false,
  );
  assert.deepEqual(Object.fromEntries(query), {
    page: "3",
    limit: "12",
    q: "mesa",
    sort: "price_asc",
    condition: "GOOD",
    minPrice: "10.50",
    maxPrice: "200",
    category: "moveis",
  });
});
test("vehicle filters preserve Portuguese route parameters and map to API contracts", () => {
  const query = catalog.catalogApiQuery(
    new URLSearchParams(
      "tipo=MOTORCYCLE&combustivel=Gasolina&cambio=Manual&minYear=2020&maxMileage=20000&brand=Honda",
    ),
    true,
  );
  assert.equal(query.get("vehicleType"), "MOTORCYCLE");
  assert.equal(query.get("fuel"), "Gasolina");
  assert.equal(query.get("transmission"), "Manual");
  assert.equal(query.get("minYear"), "2020");
  assert.equal(query.get("maxMileage"), "20000");
  assert.equal(query.get("brand"), "Honda");
  assert.equal(query.has("cambio"), false);
});
test("changing a filter resets the page without losing the search or category", () => {
  const current = new URLSearchParams(
    "q=mesa&categoria=moveis&page=4&maxPrice=500",
  );
  const next = new URL(
    catalog.catalogHref("/", current, { sort: "price_desc", maxPrice: "" }),
    "https://example.test",
  );
  assert.equal(next.searchParams.get("q"), "mesa");
  assert.equal(next.searchParams.get("categoria"), "moveis");
  assert.equal(next.searchParams.get("sort"), "price_desc");
  assert.equal(next.searchParams.has("page"), false);
  assert.equal(next.searchParams.has("maxPrice"), false);
  assert.equal(current.get("page"), "4");
});
test("pagination preserves filters and handles invalid page numbers", () => {
  const current = new URLSearchParams(
    "q=moto&tipo=MOTORCYCLE&minPrice=100&page=1",
  );
  const next = new URL(
    catalog.catalogHref("/veiculos", current, { page: "2" }),
    "https://example.test",
  );
  assert.equal(next.pathname, "/veiculos");
  assert.equal(next.searchParams.get("page"), "2");
  assert.equal(next.searchParams.get("tipo"), "MOTORCYCLE");
  assert.equal(next.searchParams.get("minPrice"), "100");
  for (const page of ["-1", "invalid", "0"])
    assert.equal(
      catalog.catalogApiQuery(new URLSearchParams({ page }), false).get("page"),
      "1",
    );
});
test("money, phone validation, and listing links preserve Brazilian formats", () => {
  assert.match(market.formatPrice("1299.50"), /1\.299,50/);
  assert.equal(market.validPhone("(33) 99999-8888"), true);
  assert.equal(market.validPhone("abcdef123"), false);
  assert.equal(market.validPhone("+55 33 99999-8888"), true);
  assert.equal(market.listingHref({ id: "a", type: "VEHICLE" }), "/veiculos/a");
  assert.equal(market.listingHref({ id: "b", type: "PRODUCT" }), "/produtos/b");
});
test("publication date is displayed without fabricated activity", () => {
  const today = new Date("2026-09-11T12:00:00Z").getTime();
  assert.equal(market.relativeDate("2026-09-11T10:00:00Z", today), "Hoje");
  assert.equal(market.relativeDate("2026-09-10T10:00:00Z", today), "Ontem");
  assert.equal(market.relativeDate("2026-09-08T10:00:00Z", today), "Há 3 dias");
});
test("API errors preserve backend validation messages and empty responses succeed", async () => {
  const api = await sourceModule("../src/lib/api.ts", (source) =>
    source.replace(
      /import\s+\{\s*auth\s*\}\s+from\s+['"]\.\/firebase['"];?/,
      "const auth = { currentUser: null };",
    ),
  );
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ message: ["Título inválido", "Preço inválido"] }),
        { status: 400 },
      );
    await assert.rejects(
      api.apiFetch("/products"),
      (error) =>
        error instanceof api.ApiError &&
        error.status === 400 &&
        /Título inválido Preço inválido/.test(error.message),
    );
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(
      await api.apiFetch("/products/a", { method: "DELETE" }),
      undefined,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("API forwards payloads and cancellation signals without changing contracts", async () => {
  const api = await sourceModule("../src/lib/api.ts", (source) =>
    source.replace(
      /import\s+\{\s*auth\s*\}\s+from\s+['"]\.\/firebase['"];?/,
      "const auth = { currentUser: null };",
    ),
  );
  const original = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/negotiations"));
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { productId: "test-product" });
      assert.equal(options.signal, controller.signal);
      assert.equal(options.cache, "no-store");
      return Response.json({ id: "test-negotiation" });
    };
    assert.deepEqual(
      await api.apiFetch("/negotiations", {
        method: "POST",
        body: JSON.stringify({ productId: "test-product" }),
        signal: controller.signal,
        cache: "force-cache",
      }),
      { id: "test-negotiation" },
    );
  } finally {
    globalThis.fetch = original;
  }
});
