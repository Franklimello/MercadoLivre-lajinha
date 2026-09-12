"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Plus,
  Handshake,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import { motionTokens, fadeRise, staggerGrid } from "@/lib/motion";
import "./login-panel.css";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPanel({
  onSuccess,
  title,
  description = "Entre para descobrir bons achados, anunciar e conversar com quem está perto.",
  variant = "compact",
}: {
  onSuccess?: () => void;
  title?: string;
  description?: string;
  variant?: "page" | "compact";
}) {
  const {
    signInWithGoogle,
    loading: googleLoading,
    profileError,
    firebaseUser,
    refreshProfile,
  } = useAuth();
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const busy = googleLoading || retrying;
  const profileRetry = !!firebaseUser && !!profileError;
  const handleGoogleLogin = async () => {
    setError("");
    setRetrying(true);
    try {
      if (profileRetry) await refreshProfile();
      else await signInWithGoogle();
      onSuccess?.();
    } catch {
      setError(
        "Não foi possível entrar. Confira sua conexão e tente novamente.",
      );
    } finally {
      setRetrying(false);
    }
  };

  return (
    <motion.div
      className={`login-panel login-panel-${variant}`}
      variants={staggerGrid}
      initial="hidden"
      animate="visible"
      transition={{
        duration: motionTokens.duration.base,
        ease: motionTokens.ease.standard,
      }}
    >
      <motion.div variants={fadeRise}>
        <div className="login-welcome-icon" aria-hidden="true">
          <Handshake size={29} strokeWidth={1.35} />
          <span>✦</span>
        </div>
        <p className="login-form-eyebrow">SEU LUGAR DE BOAS DESCOBERTAS</p>
        <h1 className="login-title">
          {title || (
            <>
              Que bom ter
              <br />
              você por aqui<span>.</span>
            </>
          )}
        </h1>
        <p className="login-description">{description}</p>
      </motion.div>
      <motion.div className="login-action-area" variants={fadeRise}>
        <motion.button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={handleGoogleLogin}
          className="login-google"
          whileTap={{ scale: 0.985 }}
          transition={motionTokens.spring.snappy}
        >
          <span className="login-google-mark">
            {busy ? (
              <Loader2 size={21} className="animate-spin" aria-hidden="true" />
            ) : (
              <GoogleMark />
            )}
          </span>
          <span>
            {busy
              ? "Conectando…"
              : profileRetry
                ? "Tentar carregar minha conta"
                : "Continuar com Google"}
          </span>
          <ArrowRight
            className="login-google-arrow"
            size={19}
            aria-hidden="true"
          />
        </motion.button>
        <p className="login-account-note">
          Primeira vez por aqui?
          <br />
          <strong>Sua conta é criada ao continuar.</strong>
        </p>
        <AnimatePresence initial={false}>
          {(profileError || error) && (
            <motion.div
              className="login-error"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: motionTokens.duration.quick }}
            >
              <AlertCircle size={18} aria-hidden="true" />
              <p>{profileError || error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <motion.div variants={fadeRise}>
        <div className="login-divider">
          <span />
          BOM PARA VOCÊ. BOM PARA LAJINHA.
          <span />
        </div>
        <div className="login-benefits">
          <div>
            <span className="login-benefit-icon">
              <MessageCircle size={20} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span>
              <strong>Conversa direta</strong>
              <small>Negocie com quem vende.</small>
            </span>
          </div>
          <div>
            <span className="login-benefit-icon">
              <Plus size={22} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span>
              <strong>Espaço para o seu</strong>
              <small>Dê uma nova vida ao que tem.</small>
            </span>
          </div>
        </div>
        <p className="login-security">
          <LockKeyhole size={14} aria-hidden="true" />
          <span>
            Acesso com Google.
            <br />
            Uma senha a menos para lembrar.
          </span>
        </p>
      </motion.div>
      <motion.div className="login-explore" variants={fadeRise}>
        <span>Quer conhecer primeiro?</span>
        <Link href="/">
          Explorar anúncios
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
