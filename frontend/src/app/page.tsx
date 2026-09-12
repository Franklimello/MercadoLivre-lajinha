import { Suspense } from "react";
import { Catalog } from "@/components/marketplace/Catalog";
import { PageLoading } from "@/components/marketplace/Feedback";
export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Catalog />
    </Suspense>
  );
}
