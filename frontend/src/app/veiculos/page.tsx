import { Suspense } from "react";
import { Catalog } from "@/components/marketplace/Catalog";
import { PageLoading } from "@/components/marketplace/Feedback";
export const metadata = { title: "Veículos" };
export default function VeiculosPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Catalog vehicles />
    </Suspense>
  );
}
