export type ListingDraft<T = Record<string, string>> = {
  id: string;
  values: T;
  images: Array<{ url: string; fileId: string }>;
  step: number;
  savedAt: number;
  version: 1;
};
const DATABASE = "mll-local-drafts";
const STORE = "drafts";
const MAX_AGE = 14 * 24 * 60 * 60_000;
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      database = undefined;
      reject(new Error("Close other tabs to access local drafts"));
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
  });
  return database;
}
export async function readDraft<T>(
  id: string,
): Promise<ListingDraft<T> | undefined> {
  const db = await openDatabase();
  const saved = await new Promise<ListingDraft<T> | undefined>(
    (resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );
  if (
    saved &&
    (saved.version !== 1 ||
      !saved.values ||
      typeof saved.values !== "object" ||
      !Object.values(saved.values).every(
        (value) => typeof value === "string",
      ) ||
      !Array.isArray(saved.images) ||
      saved.images.length > 5 ||
      !saved.images.every(
        (image) =>
          image &&
          typeof image.url === "string" &&
          typeof image.fileId === "string",
      ) ||
      !Number.isInteger(saved.step) ||
      saved.step < 0 ||
      saved.step > 3 ||
      !Number.isFinite(saved.savedAt) ||
      Date.now() - saved.savedAt > MAX_AGE)
  ) {
    await deleteDraft(id);
    return undefined;
  }
  return saved;
}
export async function writeDraft<T>(draft: ListingDraft<T>) {
  // Bound text size. Images are managed URL references, never Base64 payloads.
  if (JSON.stringify(draft).length > 100_000)
    throw new Error("Draft too large");
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put(draft);
    const cursor = store.openCursor();
    const entries: Array<{ id: string; savedAt: number }> = [];
    cursor.onsuccess = () => {
      const row = cursor.result;
      if (!row) {
        entries.sort((a, b) => a.savedAt - b.savedAt);
        entries
          .filter((entry) => entry.id !== draft.id)
          .slice(0, Math.max(0, entries.length - 30))
          .forEach((entry) => store.delete(entry.id));
        return;
      }
      if (Date.now() - row.value.savedAt > MAX_AGE) row.delete();
      else entries.push({ id: row.value.id, savedAt: row.value.savedAt });
      row.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
export async function deleteDraft(id: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
