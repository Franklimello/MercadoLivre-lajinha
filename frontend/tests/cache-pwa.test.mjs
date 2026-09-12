import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";
import { indexedDB } from "fake-indexeddb";

async function moduleFrom(path) {
  const { outputText } = ts.transpileModule(
    await readFile(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
  );
}
const { resourcePolicy, queryKeys, mutationTargets } = await moduleFrom(
  "../src/lib/query-keys.ts",
);
const manifest = (await moduleFrom("../src/app/manifest.ts")).default;

test("keys canonicalize every filter and isolate users/reference/list/detail", () => {
  assert.deepEqual(
    resourcePolicy("/vehicles?sort=newest&q=civic&page=2").queryKey,
    resourcePolicy("/vehicles?page=2&q=civic&sort=newest").queryKey,
  );
  assert.notDeepEqual(
    resourcePolicy("/vehicles?radius=5&city=Lajinha").queryKey,
    resourcePolicy("/vehicles?radius=10&city=Lajinha").queryKey,
  );
  assert.deepEqual(
    resourcePolicy("/products/a").queryKey,
    queryKeys.products.detail("a"),
  );
  assert.notDeepEqual(
    resourcePolicy("/products/my/all", "alice").queryKey,
    resourcePolicy("/products/my/all", "bob").queryKey,
  );
  assert.equal(resourcePolicy("/products/categories").staleTime, 600_000);
  assert.equal(resourcePolicy("/vehicles").staleTime, 30_000);
  assert.equal(resourcePolicy("/vehicles/a").staleTime, 20_000);
  assert.equal(
    resourcePolicy("/negotiations/a/messages", "alice").private,
    true,
  );
});

test("fresh queries deduplicate, invalidation affects both listing types and the owner", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  let requests = 0;
  const policy = resourcePolicy("/vehicles?vehicleType=CAR");
  const options = {
    queryKey: policy.queryKey,
    staleTime: policy.staleTime,
    queryFn: async () => {
      requests++;
      return { items: ["car"] };
    },
  };
  await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
  await client.fetchQuery(options);
  assert.equal(requests, 1);
  const productKey = queryKeys.products.detail("car");
  const ownerKey = resourcePolicy("/products/my/all", "owner").queryKey;
  client.setQueryData(productKey, { status: "ACTIVE" });
  client.setQueryData(ownerKey, ["car"]);
  for (const queryKey of mutationTargets("/products/car/status"))
    await client.invalidateQueries({ queryKey, refetchType: "none" });
  assert.equal(client.getQueryState(productKey).isInvalidated, true);
  assert.equal(client.getQueryState(ownerKey).isInvalidated, true);
  await client.fetchQuery(options);
  assert.equal(requests, 2);
  client.removeQueries({ queryKey: queryKeys.private });
  assert.equal(client.getQueryData(ownerKey), undefined);
  assert.ok(client.getQueryData(policy.queryKey));
  client.clear();
});

test("TanStack AbortSignal cancels an obsolete query without committing a response", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const key = queryKeys.products.detail("slow");
  let aborted = false;
  const request = client
    .fetchQuery({
      queryKey: key,
      queryFn: ({ signal }) =>
        new Promise((resolve, reject) =>
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          }),
        ),
    })
    .catch(() => undefined);
  await client.cancelQueries({ queryKey: key });
  await request;
  assert.equal(aborted, true);
  assert.equal(client.getQueryData(key), undefined);
  client.clear();
});

test("IndexedDB drafts survive reads, isolate owners, expire and are removed on publication", async () => {
  globalThis.indexedDB = indexedDB;
  const { readDraft, writeDraft, deleteDraft } = await moduleFrom(
    "../src/lib/drafts.ts",
  );
  const draft = {
    id: "alice:create:product",
    values: { title: "Mesa", price: "150", description: "Mesa de madeira" },
    images: [
      { url: "https://ik.imagekit.io/example/uuid.webp", fileId: "uuid" },
    ],
    step: 1,
    savedAt: Date.now(),
    version: 1,
  };
  await writeDraft(draft);
  assert.deepEqual(await readDraft(draft.id), draft);
  assert.equal(await readDraft("bob:create:product"), undefined);
  await writeDraft({
    ...draft,
    id: "old",
    savedAt: Date.now() - 15 * 86_400_000,
  });
  assert.equal(await readDraft("old"), undefined);
  await deleteDraft(draft.id);
  assert.equal(await readDraft(draft.id), undefined);
  await assert.rejects(
    writeDraft({ ...draft, values: { title: "x".repeat(100_001) } }),
    /large/,
  );
});

test("IndexedDB caps drafts at thirty rather than growing indefinitely", async () => {
  const { readDraft, writeDraft } = await moduleFrom("../src/lib/drafts.ts");
  for (let i = 0; i < 32; i++)
    await writeDraft({
      id: `owner:edit:${i}`,
      values: { title: `Listing ${i}` },
      images: [],
      step: 0,
      savedAt: Date.now() + i,
      version: 1,
    });
  assert.equal(await readDraft("owner:edit:0"), undefined);
  assert.equal(await readDraft("owner:edit:1"), undefined);
  assert.ok(await readDraft("owner:edit:31"));
});

test("manifest has standalone identity and real PNG icons at both required sizes", async () => {
  const data = manifest();
  assert.equal(data.name, "Mercado Livre Lajinha");
  assert.equal(data.start_url, "/");
  assert.equal(data.display, "standalone");
  assert.equal(data.icons.length, 4);
  for (const icon of data.icons) {
    const png = await readFile(
      new URL(`../public${icon.src}`, import.meta.url),
    );
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.equal(
    data.icons.filter((icon) => icon.purpose === "maskable").length,
    2,
  );
});

async function workerHarness({
  imageBytes = 4,
  imageCacheControl = "public, max-age=86400",
} = {}) {
  const origin = "https://marketplace.test";
  const handlers = new Map(),
    stores = new Map();
  let networkDown = false,
    requests = 0;
  const urlOf = (request) =>
    new URL(typeof request === "string" ? request : request.url, origin).href;
  const fetcher = async (request) => {
    requests++;
    if (networkDown) throw new TypeError("Network unavailable");
    const url = new URL(urlOf(request));
    if (url.pathname === "/_next/image")
      return new Response(new Uint8Array(imageBytes), {
        headers: {
          "content-type": "image/webp",
          "cache-control": imageCacheControl,
        },
      });
    return new Response(
      url.pathname === "/offline.html"
        ? "offline: reconnect; draft saved; never automatically published"
        : "static asset",
      { headers: { "content-type": "text/plain" } },
    );
  };
  class WorkerRequest extends Request {
    constructor(url, init) {
      super(new URL(url, origin), init);
    }
  }
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async (request) => store.get(urlOf(request))?.clone(),
        put: async (request, response) =>
          store.set(urlOf(request), response.clone()),
        delete: async (request) => store.delete(urlOf(request)),
        keys: async () => [...store.keys()].map((url) => new Request(url)),
        addAll: async (resources) => {
          for (const request of resources)
            store.set(urlOf(request), await fetcher(request));
        },
      };
    },
  };
  vm.runInNewContext(
    await readFile(new URL("../public/pwa-cache.js", import.meta.url), "utf8"),
    {
      self: {
        location: { origin },
        clients: { claim: async () => {} },
        addEventListener: (name, callback) => handlers.set(name, callback),
      },
      caches,
      fetch: fetcher,
      URL,
      Request: WorkerRequest,
      Response,
      Headers,
      Date,
      Promise,
      console,
    },
  );
  async function lifecycle(name) {
    const work = [];
    handlers.get(name)({ waitUntil: (promise) => work.push(promise) });
    await Promise.all(work);
  }
  async function request(
    path,
    { mode = "cors", method = "GET", headers = {} } = {},
  ) {
    const work = [];
    let response;
    handlers.get("fetch")({
      request: {
        url: new URL(path, origin).href,
        method,
        mode,
        headers: new Headers(headers),
      },
      waitUntil: (promise) => work.push(promise),
      respondWith: (promise) => {
        response = Promise.resolve(promise);
      },
    });
    if (!response) return undefined;
    const result = await response;
    await Promise.all(work);
    return result;
  }
  return {
    stores,
    caches,
    lifecycle,
    request,
    network: (down) => {
      networkDown = down;
    },
    requests: () => requests,
  };
}

test("service worker excludes API, RSC, writes, credentials and external requests", async () => {
  const sw = await workerHarness();
  await sw.lifecycle("install");
  for (const path of [
    "/products",
    "/vehicles/a",
    "/users/me",
    "/negotiations/a/messages",
    "/_next/static/file.js?_rsc=1",
    "https://api.test/products",
  ])
    assert.equal(await sw.request(path), undefined);
  assert.equal(
    await sw.request("/_next/static/file.js", {
      headers: { Authorization: "Bearer sensitive" },
    }),
    undefined,
  );
  assert.equal(await sw.request("/products", { method: "POST" }), undefined);
  assert.equal(
    await sw.request("/products", { headers: { RSC: "1" } }),
    undefined,
  );
  assert.equal(
    [...sw.stores.values()].some((store) =>
      [...store.keys()].some((key) => key.includes("/users/me")),
    ),
    false,
  );
});

test("service worker uses static cache first, offline fallback and removes only old app caches", async () => {
  const sw = await workerHarness();
  await sw.lifecycle("install");
  await sw.caches.open("mll-old-static");
  await sw.caches.open("another-application");
  await sw.lifecycle("activate");
  assert.equal(sw.stores.has("mll-old-static"), false);
  assert.equal(sw.stores.has("another-application"), true);
  await sw.request("/_next/static/abc123.js");
  const count = sw.requests();
  sw.network(true);
  assert.equal(
    await (await sw.request("/_next/static/abc123.js")).text(),
    "static asset",
  );
  assert.equal(sw.requests(), count);
  assert.match(
    await (await sw.request("/produtos/a", { mode: "navigate" })).text(),
    /offline/,
  );
  assert.equal(
    [...sw.stores.values()].some((store) =>
      [...store.keys()].some((key) => key.endsWith("/produtos/a")),
    ),
    false,
  );
});

test("service worker caps image variants, expires old photos and never stores unknown sources", async () => {
  const sw = await workerHarness();
  await sw.lifecycle("install");
  for (let i = 0; i < 123; i++)
    await sw.request(
      `/_next/image?url=${encodeURIComponent(`https://ik.imagekit.io/project/${i}.webp`)}&w=480&q=80`,
    );
  const store = sw.stores.get("mll-v1-images");
  assert.equal(store.size, 120);
  const [key, response] = [...store.entries()][0];
  const headers = new Headers(response.headers);
  headers.set("x-mll-stored-at", String(Date.now() - 8 * 86_400_000));
  store.set(key, new Response(await response.arrayBuffer(), { headers }));
  sw.network(true);
  const missing = await sw.request(key);
  assert.equal(missing.type, "error");
  assert.equal(store.has(key), false);
  assert.equal(
    await sw.request(
      "/_next/image?url=https%3A%2F%2Funknown.test%2Fphoto.jpg&w=480&q=80",
    ),
    undefined,
  );
  for (const source of [
    "https://ik.imagekit.io/project/private.webp?ik-s=signature",
    "/brand/../users/me",
    "https://ik.imagekit.io/project/private.webp?token=sensitive",
  ])
    assert.equal(
      await sw.request(
        `/_next/image?url=${encodeURIComponent(source)}&w=480&q=80`,
      ),
      undefined,
    );
});

test("image cache enforces byte budget, rejects oversized photos and private responses", async () => {
  const sw = await workerHarness({ imageBytes: 2 * 1024 * 1024 });
  for (let i = 0; i < 22; i++)
    await sw.request(
      `/_next/image?url=${encodeURIComponent(`https://ik.imagekit.io/project/large-${i}.webp`)}&w=1920&q=80`,
    );
  const store = sw.stores.get("mll-v1-images");
  assert.equal(store.size, 20);
  assert.equal(
    [...store.values()].reduce(
      (sum, response) => sum + Number(response.headers.get("x-mll-bytes")),
      0,
    ),
    40 * 1024 * 1024,
  );
  for (const options of [
    { imageBytes: 2 * 1024 * 1024 + 1 },
    { imageCacheControl: "private, no-store" },
  ]) {
    const isolated = await workerHarness(options);
    await isolated.request("/_next/image?url=%2Fbrand%2Fphoto.webp&w=480&q=80");
    assert.equal(isolated.stores.get("mll-v1-images").size, 0);
  }
});
