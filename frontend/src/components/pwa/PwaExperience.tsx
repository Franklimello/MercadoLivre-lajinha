"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Download, X, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOnline } from "@/hooks/useOnline";
import { registerMarketplaceWorker } from "@/lib/pwa";
import { motionTokens, fadeRise } from "@/lib/motion";
import "./pwa.css";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const DISMISS_KEY = "mll-install-dismissed-until";
export function OfflineNotice() {
  const online = useOnline();
  return (
    <AnimatePresence initial={false}>
      {!online && (
        <motion.div
          key="offline"
          variants={fadeRise}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: motionTokens.duration.quick }}
          className="connection-notice"
          role="status"
        >
          <WifiOff size={17} aria-hidden="true" />
          <span>
            Você está sem conexão.{" "}
            <span className="font-normal">
              Algumas informações podem estar desatualizadas. Rascunhos
              permanecem neste dispositivo.
            </span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function PwaExperience() {
  const online = useOnline();
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<InstallEvent>();
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      (matchMedia("(display-mode: standalone)").matches ||
        !!(navigator as Navigator & { standalone?: boolean }).standalone),
  );
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return Number(localStorage.getItem(DISMISS_KEY)) > Date.now();
    } catch {
      return false;
    }
  });
  const [prompting, setPrompting] = useState(false);
  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)");
    const checkInstalled = () =>
      setInstalled(
        standalone.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    standalone.addEventListener("change", checkInstalled);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const appInstalled = () => {
      setInstalled(true);
      setInstallEvent(undefined);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    if (
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_PWA === "true"
    ) {
      void registerMarketplaceWorker().catch(() => {
        if (process.env.NODE_ENV !== "production")
          console.debug("[PWA] Worker unavailable");
      });
    }
    return () => {
      standalone.removeEventListener("change", checkInstalled);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + 7 * 24 * 60 * 60_000),
      );
    } catch {
      /* Storage is optional. */
    }
  };
  async function install() {
    if (!installEvent || prompting) return;
    setPrompting(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "dismissed") dismiss();
    } catch {
      /* Unsupported/consumed prompts are hidden without blocking navigation. */
    } finally {
      setInstallEvent(undefined);
      setPrompting(false);
    }
  }
  const catalog =
    pathname === "/" || pathname === "/veiculos" || pathname === "/conta";
  return (
    <>
      <AnimatePresence initial={false}>
        {catalog && online && installEvent && !installed && !dismissed && (
          <motion.aside
            variants={fadeRise}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: motionTokens.duration.base }}
            className="pwa-install shell"
            aria-label="Instalar o marketplace"
          >
            <Image src="/brand/icon.svg" alt="" width={38} height={38} />
            <div>
              <strong>Instale o Mercado Livre Lajinha</strong>
              <p>Acesse seus anúncios e mensagens mais rápido.</p>
            </div>
            <motion.button
              className="pwa-install-button"
              onClick={install}
              disabled={prompting}
              whileTap={{ scale: 0.97 }}
            >
              <Download size={16} aria-hidden="true" />
              {prompting ? "Abrindo…" : "Instalar aplicativo"}
            </motion.button>
            <button
              className="icon-button"
              onClick={dismiss}
              aria-label="Dispensar sugestão de instalação"
            >
              <X size={17} />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
