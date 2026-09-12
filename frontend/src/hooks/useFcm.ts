"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { app, auth } from "@/lib/firebase";
import { registerMarketplaceWorker } from "@/lib/pwa";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  getNotificationPermission,
  notifyPermissionChange,
  subscribeNotificationPermission,
} from "@/lib/notification-permission";
export function useFcm(autoRegister = false) {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const attemptedUser = useRef<string | null>(null);
  const permission = useSyncExternalStore(
    subscribeNotificationPermission,
    getNotificationPermission,
    () => "unsupported" as const,
  );
  const registerDevice = useCallback(
    async (silent = false): Promise<boolean> => {
      if (
        !user ||
        getNotificationPermission() !== "granted" ||
        inFlight.current
      )
        return false;
      const uid = user.firebaseUid;
      inFlight.current = true;
      setLoading(true);
      try {
        const { getMessaging, getToken, isSupported } =
          await import("firebase/messaging");
        if (!(await isSupported())) throw new Error("Messaging unavailable");
        const registration = await registerMarketplaceWorker();
        const ready = await navigator.serviceWorker.ready;
        const token = await getToken(getMessaging(app), {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
          serviceWorkerRegistration: registration.active ? registration : ready,
        });
        if (!token || auth.currentUser?.uid !== uid)
          throw new Error("Session or token unavailable");
        await apiFetch("/users/fcm-token", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (auth.currentUser?.uid !== uid) return false;
        await refreshProfile();
        if (!silent) toast.success("Notificações ativadas neste dispositivo.");
        return true;
      } catch {
        if (!silent)
          toast.error(
            "A permissão foi salva, mas não foi possível conectar as notificações. Tente novamente na sua conta.",
          );
        return false;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [user, refreshProfile],
  );

  useEffect(() => {
    if (
      !autoRegister ||
      !user ||
      permission !== "granted" ||
      attemptedUser.current === user.firebaseUid
    )
      return;
    attemptedUser.current = user.firebaseUid;
    // Reconnect after login without opening a native permission prompt.
    void registerDevice(true);
  }, [autoRegister, user, permission, registerDevice]);

  async function requestPermissionAndRegister(): Promise<boolean> {
    const current = getNotificationPermission();
    if (current === "unsupported") {
      toast.error("Notificações não estão disponíveis neste navegador.");
      return false;
    }
    if (current === "denied") {
      toast.error(
        "As notificações estão bloqueadas. Você pode permitir nas configurações do navegador.",
      );
      return false;
    }
    if (inFlight.current) return false;
    setLoading(true);
    try {
      // Request before any import or network await to preserve user activation.
      const granted =
        current === "granted"
          ? current
          : await Notification.requestPermission();
      if (granted !== "granted") return false;
      if (!user) {
        toast.success(
          "Permissão salva. Entre na sua conta para receber avisos de mensagens.",
        );
        return true;
      }
      attemptedUser.current = user.firebaseUid;
      return await registerDevice();
    } catch {
      toast.error("Não foi possível solicitar a permissão. Tente novamente.");
      return false;
    } finally {
      notifyPermissionChange();
      setLoading(false);
    }
  }
  return {
    notificationsEnabled: user?.notificationsEnabled ?? false,
    requestPermissionAndRegister,
    permission,
    loading,
  };
}
