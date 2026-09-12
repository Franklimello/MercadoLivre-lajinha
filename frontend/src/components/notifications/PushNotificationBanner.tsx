"use client";
import { useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { motion } from "motion/react";
import { useFcm } from "@/hooks/useFcm";
import {
  dismissNotificationPrompt,
  isNotificationPromptDismissed,
  subscribeNotificationPermission,
} from "@/lib/notification-permission";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export function PushNotificationBanner() {
  const { requestPermissionAndRegister, permission, loading } = useFcm(true);
  const [dismissed, setDismissed] = useState(false);
  const sessionDismissed = useSyncExternalStore(
    subscribeNotificationPermission,
    isNotificationPromptDismissed,
    () => true,
  );
  const open = permission === "default" && !dismissed && !sessionDismissed;
  function dismiss() {
    setDismissed(true);
    dismissNotificationPrompt();
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) dismiss();
      }}
    >
      <DialogContent className="!w-[calc(100%-2rem)] !max-w-sm !rounded-3xl !p-7 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <motion.div
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <BellRing size={26} strokeWidth={1.7} />
        </motion.div>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Não perca uma boa conversa
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Permita notificações do ML Lajinha para saber quando alguém enviar
            uma mensagem sobre seus anúncios.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 grid gap-2">
          <Button
            disabled={loading}
            className="h-11 rounded-xl"
            onClick={async () => {
              await requestPermissionAndRegister();
              dismiss();
            }}
          >
            {loading ? "Ativando…" : "Permitir notificações"}
          </Button>
          <Button
            disabled={loading}
            variant="ghost"
            className="h-10 rounded-xl"
            onClick={dismiss}
          >
            Agora não
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Você pode alterar sua escolha nas configurações do navegador.
        </p>
      </DialogContent>
    </Dialog>
  );
}
