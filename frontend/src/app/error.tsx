"use client";
import { ErrorState } from "@/components/marketplace/Feedback";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell page">
      <ErrorState
        retry={reset}
        title="Não foi possível abrir esta página"
        description="Tente novamente. Se o problema continuar, volte ao início."
      />
    </div>
  );
}
