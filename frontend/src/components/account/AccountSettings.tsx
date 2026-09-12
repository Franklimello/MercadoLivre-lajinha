"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFcm } from "@/hooks/useFcm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { errorMessage, phoneDigits, validPhone } from "@/lib/marketplace";
import { toast } from "sonner";
export function AccountSettings() {
  const { user, updateProfile } = useAuth();
  const fcm = useFcm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <aside id="dados" className="space-y-8 scroll-mt-6">
      <section>
        <h2 className="section-title mb-2">Seus dados</h2>
        <p className="caption">
          WhatsApp e notificações são necessários para publicar anúncios.
        </p>
        <form
          className="mt-5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const phone = phoneDigits(
              String(new FormData(event.currentTarget).get("whatsapp") || ""),
            );
            if (!validPhone(phone)) {
              setError("Informe um número válido com DDD.");
              return;
            }
            setSaving(true);
            setError("");
            try {
              await updateProfile({ whatsapp: phone });
              toast.success("WhatsApp atualizado.");
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="account-phone">WhatsApp com DDD</label>
            <Input
              key={user?.whatsapp}
              id="account-phone"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              defaultValue={user?.whatsapp || ""}
              placeholder="(33) 99999-9999"
              required
            />
          </div>
          <p className="caption">
            Compartilhado apenas dentro de uma negociação.
          </p>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <Button variant="outline" type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar WhatsApp"}
          </Button>
        </form>
      </section>
      <section className="border-t pt-6">
        <h2 className="text-base font-medium">Notificações</h2>
        <p className="caption mt-2">
          {fcm.notificationsEnabled
            ? "Ativadas na sua conta. Você pode conectar este dispositivo também."
            : "Receba um aviso quando um comprador mandar mensagem."}
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={fcm.requestPermissionAndRegister}
          disabled={fcm.loading}
        >
          {fcm.loading
            ? "Ativando…"
            : fcm.notificationsEnabled
              ? "Conectar este dispositivo"
              : "Ativar notificações"}
        </Button>
      </section>
    </aside>
  );
}
