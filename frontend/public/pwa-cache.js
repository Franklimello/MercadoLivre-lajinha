/* Bump VERSION on releases that change the offline shell/cache policy. */
const VERSION = "mll-v1";
const CORE_CACHE = `${VERSION}-core`;
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;
const CORE = [
  "/offline.html",
  "/brand/icon.svg",
  "/brand/pwa-192.png",
  "/brand/pwa-512.png",
  "/brand/pwa-maskable-192.png",
  "/brand/pwa-maskable-512.png",
];
const DAY = 86_400_000;
const IMAGE_LIMIT = {
  count: 120,
  bytes: 40 * 1024 * 1024,
  age: 7 * DAY,
  itemBytes: 2 * 1024 * 1024,
};
let pruneQueue = Promise.resolve();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) =>
        cache.addAll(CORE.map((url) => new Request(url, { cache: "reload" }))),
      ),
  );
  // Do not replace a worker under an open form. The new worker waits for tabs to close.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const active = [CORE_CACHE, STATIC_CACHE, IMAGE_CACHE];
      await Promise.all(
        (await caches.keys())
          .filter((key) => key.startsWith("mll-") && !active.includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      await pruneImages();
    })(),
  );
});

function cacheable(response) {
  return (
    response.ok &&
    response.type !== "opaque" &&
    !response.redirected &&
    !/no-store|private/i.test(response.headers.get("cache-control") || "")
  );
}
async function pruneImages() {
  const cache = await caches.open(IMAGE_CACHE);
  const entries = await Promise.all(
    (await cache.keys()).map(async (request) => {
      const response = await cache.match(request);
      return {
        request,
        time: Number(response.headers.get("x-mll-stored-at")),
        bytes: Number(response.headers.get("x-mll-bytes")),
      };
    }),
  );
  entries.sort((a, b) => a.time - b.time);
  let bytes = entries.reduce((sum, item) => sum + item.bytes, 0);
  let count = entries.length;
  for (const item of entries) {
    if (
      !item.time ||
      Date.now() - item.time > IMAGE_LIMIT.age ||
      count > IMAGE_LIMIT.count ||
      bytes > IMAGE_LIMIT.bytes
    ) {
      await cache.delete(item.request);
      bytes -= item.bytes;
      count--;
    }
  }
}
async function saveImage(request, response) {
  if (
    !cacheable(response) ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    return;
  const declared = Number(response.headers.get("content-length"));
  if (declared > IMAGE_LIMIT.itemBytes) return;
  const body = await response.clone().arrayBuffer();
  if (body.byteLength > IMAGE_LIMIT.itemBytes) return;
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.set("x-mll-stored-at", String(Date.now()));
  headers.set("x-mll-bytes", String(body.byteLength));
  const cache = await caches.open(IMAGE_CACHE);
  try {
    await cache.put(
      request,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
    );
    pruneQueue = pruneQueue.then(pruneImages, pruneImages);
    await pruneQueue;
  } catch {
    /* Quota failures never block an image from displaying. */
  }
}
async function cachedImage(request, event) {
  const cache = await caches.open(IMAGE_CACHE);
  const stored = await cache.match(request);
  const age = stored
    ? Date.now() - Number(stored.headers.get("x-mll-stored-at"))
    : Infinity;
  const refresh = async () => {
    const response = await fetch(request);
    await saveImage(request, response);
    return response;
  };
  if (stored && age <= IMAGE_LIMIT.age) {
    if (age > DAY) event.waitUntil(refresh().catch(() => undefined));
    return stored;
  }
  if (stored) await cache.delete(request);
  try {
    return await refresh();
  } catch {
    return Response.error();
  }
}
async function staticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const stored = await cache.match(request);
  if (stored) return stored;
  const response = await fetch(request);
  if (cacheable(response)) {
    try {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      await Promise.all(
        keys
          .slice(0, Math.max(0, keys.length - 200))
          .map((key) => cache.delete(key)),
      );
    } catch {
      /* Storage is best effort. */
    }
  }
  return response;
}
async function coreAsset(request, event) {
  const cache = await caches.open(CORE_CACHE);
  const stored = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (cacheable(response)) {
      try {
        await cache.put(request, response.clone());
      } catch {}
    }
    return response;
  });
  if (stored) {
    event.waitUntil(refresh.catch(() => undefined));
    return stored;
  }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("authorization")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API, ImageKit uploads, Firebase: network only.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await (await caches.open(CORE_CACHE)).match("/offline.html")) ||
          new Response(
            "Você está sem conexão. Reconecte-se para acessar o marketplace.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          ),
      ),
    );
    return;
  }
  if (url.searchParams.has("_rsc") || request.headers.has("rsc")) return;
  if (CORE.includes(url.pathname)) {
    event.respondWith(coreAsset(request, event));
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") &&
    /\.(js|css|woff2?|ttf)$/.test(url.pathname)
  ) {
    event.respondWith(staticAsset(request));
    return;
  }
  if (url.pathname === "/_next/image") {
    const source = url.searchParams.get("url") || "";
    const managed = (() => {
      try {
        const src = new URL(source, self.location.origin);
        if (
          [...src.searchParams.keys()].some((key) =>
            /^(token|auth|signature|sig|expires|ik-s|ik-t)$/i.test(key),
          )
        )
          return false;
        return src.origin === self.location.origin
          ? src.pathname.startsWith("/brand/")
          : src.protocol === "https:" && src.hostname === "ik.imagekit.io";
      } catch {
        return false;
      }
    })();
    if (managed) event.respondWith(cachedImage(request, event));
  }
  // Never store API JSON, HTML pages, RSC payloads, sessions or messages.
});
