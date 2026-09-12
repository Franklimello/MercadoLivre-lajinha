"use client";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/hooks/useOnline";
export function DraftNotice({
  available,
  ready,
  status,
  restore,
  discard,
}: {
  available?: { savedAt: number };
  ready: boolean;
  status: "idle" | "saving" | "saved" | "error";
  restore: () => void;
  discard: () => void;
}) {
  const online = useOnline();
  if (available)
    return (
      <section className="draft-recovery" aria-label="Recuperar rascunho">
        <strong>Seu anúncio ficou por aqui.</strong>
        <p>
          Há um rascunho neste dispositivo, salvo em{" "}
          {new Date(available.savedAt).toLocaleString("pt-BR")}. Quer continuar
          de onde parou?
        </p>
        <div className="draft-recovery-actions">
          <Button type="button" onClick={restore}>
            Recuperar rascunho
          </Button>
          <Button type="button" variant="outline" onClick={discard}>
            Começar de novo
          </Button>
        </div>
      </section>
    );
  return (
    <p className="draft-status" role="status">
      {status === "saving" ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : !online ? (
        <CloudOff size={13} aria-hidden="true" />
      ) : status === "saved" ? (
        <Check size={13} aria-hidden="true" />
      ) : null}
      {!ready
        ? "Buscando rascunho neste dispositivo…"
        : status === "error"
          ? "Não foi possível salvar o rascunho neste dispositivo. Mantenha esta página aberta."
          : !online && status === "saved"
            ? "Rascunho salvo neste dispositivo. Publique quando a conexão voltar."
            : !online
              ? "Você está sem conexão. O rascunho será salvo neste dispositivo."
              : status === "saved"
                ? "Rascunho salvo neste dispositivo"
                : status === "saving"
                  ? "Salvando rascunho…"
                  : "Seu rascunho é salvo neste dispositivo enquanto você edita."}
    </p>
  );
}
