"use client";
import { useEffect, useRef, useState } from "react";
import {
  readDraft,
  writeDraft,
  deleteDraft,
  type ListingDraft,
} from "@/lib/drafts";

export function useListingDraft<T>(
  id: string,
  values: T,
  images: ListingDraft<T>["images"],
  step: number,
  onRestore: (draft: ListingDraft<T>) => void,
) {
  const [available, setAvailable] = useState<ListingDraft<T>>();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [dirty, setDirty] = useState(false);
  const removed = useRef(false);
  const latest = useRef({ id, values, images, step });
  const saving = useRef<Promise<void>>(Promise.resolve());
  const flushOnExit = useRef<(() => void) | undefined>(undefined);
  const signature = JSON.stringify({ values, images, step });
  useEffect(() => {
    latest.current = { id, values, images, step };
  }, [id, values, images, step]);
  useEffect(() => {
    let disposed = false;
    readDraft<T>(id)
      .then((draft) => {
        if (!disposed) {
          setAvailable(draft);
          setReady(true);
        }
      })
      .catch(() => {
        if (!disposed) {
          setStatus("error");
          setReady(true);
        }
      });
    return () => {
      disposed = true;
    };
  }, [id]);
  useEffect(() => {
    if (!ready || !dirty || available || removed.current) return;
    const save = () => {
      if (removed.current) return;
      setStatus("saving");
      const draft: ListingDraft<T> = {
        ...latest.current,
        savedAt: Date.now(),
        version: 1,
      };
      saving.current = saving.current
        .catch(() => undefined)
        .then(() => (removed.current ? undefined : writeDraft(draft)))
        .then(() => {
          if (!removed.current) setStatus("saved");
        })
        .catch(() => setStatus("error"));
    };
    const timer = setTimeout(save, 1000);
    flushOnExit.current = save;
    const flush = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        save();
      }
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [signature, ready, dirty, available]);
  useEffect(
    () => () => {
      flushOnExit.current?.();
    },
    [],
  );
  const clear = async () => {
    removed.current = true;
    setDirty(false);
    await saving.current.catch(() => undefined);
    await deleteDraft(id);
    setAvailable(undefined);
    setStatus("idle");
  };
  return {
    available,
    ready,
    status,
    markDirty: () => {
      removed.current = false;
      setDirty(true);
      setStatus("saving");
    },
    restore: () => {
      if (available) {
        onRestore(available);
        setAvailable(undefined);
        setStatus("saved");
      }
    },
    discard: () => {
      void clear().catch(() => {
        setStatus("error");
        setAvailable(undefined);
      });
    },
    clear,
  };
}
