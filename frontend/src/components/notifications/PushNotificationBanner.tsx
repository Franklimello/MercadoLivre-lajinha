"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFcm } from "@/hooks/useFcm";
import { Button } from "@/components/ui/button";
export function PushNotificationBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { notificationsEnabled, requestPermissionAndRegister, loading } =
    useFcm();
  const [dismissed, setDismissed] = useState(false);
  if (
    !user ||
    notificationsEnabled ||
    dismissed ||
    pathname === "/conta" ||
    pathname === "/anunciar" ||
    pathname === "/veiculos/novo" ||
    pathname.startsWith("/negociacoes/")
  )
    return null;
  return (
    <div className="notice-bar">
      <div className="shell flex flex-wrap items-center gap-3 !px-0">
        <Bell size={17} className="shrink-0" />
        <p className="flex-1">Receba um aviso quando alguém mandar mensagem.</p>
        <Button
          variant="ghost"
          disabled={loading}
          onClick={requestPermissionAndRegister}
        >
          {loading ? "Ativando…" : "Ativar avisos"}
        </Button>
        <button
          className="icon-button"
          aria-label="Dispensar aviso"
          onClick={() => setDismissed(true)}
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
