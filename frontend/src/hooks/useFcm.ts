"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { app } from "@/lib/firebase";
import { registerMarketplaceWorker } from "@/lib/pwa";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
export function useFcm() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  async function requestPermissionAndRegister(): Promise<boolean> {
    if (
      !user ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      toast.error(
        "Este navegador não permite ativar notificações. Tente em outro navegador.",
      );
      return false;
    }
    setLoading(true);
    try {
      const { getMessaging, getToken, isSupported } =
        await import("firebase/messaging");
      if (!(await isSupported())) {
        toast.error("Notificações não estão disponíveis neste navegador.");
        return false;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        toast.error(
          "Permita notificações nas configurações do navegador e tente novamente.",
        );
        return false;
      }
      const registration = await registerMarketplaceWorker();
      const ready = await navigator.serviceWorker.ready;
      const token = await getToken(getMessaging(app), {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
        serviceWorkerRegistration: registration.active ? registration : ready,
      });
      if (!token) throw new Error("Token unavailable");
      await apiFetch("/users/fcm-token", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await refreshProfile();
      toast.success("Notificações ativadas neste dispositivo.");
      return true;
    } catch {
      toast.error(
        "Não foi possível ativar as notificações. Confira sua conexão e tente novamente.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }
  return {
    notificationsEnabled: user?.notificationsEnabled ?? false,
    requestPermissionAndRegister,
    loading,
  };
}
