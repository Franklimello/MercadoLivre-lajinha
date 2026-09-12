"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useFcm } from "@/hooks/useFcm";
import { errorMessage, phoneDigits, validPhone } from "@/lib/marketplace";
export function WhatsAppPromptModal({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const { user, updateProfile } = useAuth();
  const fcm = useFcm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md !p-6 max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="section-title pr-8">
            Antes do primeiro anúncio
          </DialogTitle>
          <DialogDescription>
            Cadastre seu WhatsApp e ative as notificações para receber as
            mensagens dos compradores.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const number = phoneDigits(
              String(new FormData(e.currentTarget).get("phone") || ""),
            );
            if (!validPhone(number)) {
              setError("Informe um telefone válido com DDD.");
              return;
            }
            setSaving(true);
            setError("");
            try {
              await updateProfile({ whatsapp: number });
              if (
                !user?.notificationsEnabled &&
                !(await fcm.requestPermissionAndRegister())
              ) {
                setError(
                  "O WhatsApp foi salvo. Ative as notificações para poder publicar.",
                );
                return;
              }
              onOpenChange(false);
              onCompleted();
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="required-phone">WhatsApp com DDD</label>
            <Input
              key={user?.whatsapp}
              id="required-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={user?.whatsapp || ""}
              placeholder="(33) 99999-9999"
              required
            />
            <p className="caption">
              Seu número fica disponível ao comprador depois que ele inicia uma
              negociação.
            </p>
          </div>
          <p className="caption">
            {user?.notificationsEnabled
              ? "Notificações ativadas na sua conta."
              : "Ao continuar, seu navegador pedirá permissão para enviar notificações."}
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="w-full"
            type="submit"
            disabled={saving || fcm.loading}
          >
            {saving ? "Salvando…" : "Salvar e continuar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
