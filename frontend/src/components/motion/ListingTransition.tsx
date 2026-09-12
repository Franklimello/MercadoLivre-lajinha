"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ListingPreview = {
  id: string;
  kind: "product" | "vehicle";
  title: string;
  cover?: string;
};

const ListingTransitionContext = createContext<{
  preview: ListingPreview | null;
  prepare: (preview: ListingPreview) => void;
}>({ preview: null, prepare: () => {} });

/** Keep only the selected public image for the destination's loading frame.
 * The detail and all actions still depend on the real API response. */
export function ListingTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preview, setPreview] = useState<ListingPreview | null>(null);
  const prepare = useCallback((next: ListingPreview) => setPreview(next), []);
  const value = useMemo(() => ({ preview, prepare }), [preview, prepare]);
  return (
    <ListingTransitionContext value={value}>
      {children}
    </ListingTransitionContext>
  );
}

export function useListingTransition() {
  return useContext(ListingTransitionContext);
}
