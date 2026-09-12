import { EmptyState } from "@/components/marketplace/Feedback";
export default function NotFound() {
  return (
    <div className="shell page">
      <EmptyState
        title="Esta página não foi encontrada"
        description="O endereço pode ter mudado. Volte ao início para procurar anúncios."
        href="/"
        action="Voltar ao início"
      />
    </div>
  );
}
