"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Loader2, Search, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { fadeRise, motionTokens, staggerGrid } from "@/lib/motion";
export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="state-panel">
      <Search aria-hidden="true" />
      <h2 className="section-title">{title}</h2>
      <p className="caption">{description}</p>
      {href && (
        <Link
          href={href}
          className={buttonVariants({ variant: "outline", className: "mt-2" })}
        >
          {action || "Ver anúncios"}
        </Link>
      )}
    </div>
  );
}
export function ErrorState({
  retry,
  title = "Não foi possível carregar",
  description = "Confira sua conexão e tente novamente em instantes.",
  busy = false,
}: {
  retry: () => void;
  title?: string;
  description?: string;
  busy?: boolean;
}) {
  return (
    <motion.div
      className="state-panel"
      role="alert"
      variants={fadeRise}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.span
        aria-hidden="true"
        initial={{ rotate: -8, scale: 0.9 }}
        animate={{ rotate: busy ? -6 : 0, scale: busy ? 0.95 : 1 }}
        transition={motionTokens.spring.snappy}
      >
        <WifiOff />
      </motion.span>
      <h2 className="section-title">{title}</h2>
      <p className="caption">{description}</p>
      <motion.div whileTap={{ scale: 0.96 }}>
        <Button
          variant="outline"
          disabled={busy}
          aria-busy={busy}
          onClick={retry}
          className="mt-2"
        >
          {busy && <Loader2 className="animate-spin" />}
          {busy ? "Tentando novamente…" : "Tentar novamente"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
export function ListingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <motion.div
      role="status"
      aria-label="Carregando anúncios"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: motionTokens.duration.base }}
    >
      <span className="sr-only">Carregando anúncios…</span>
      <motion.div
        className="listing-grid"
        aria-hidden="true"
        variants={staggerGrid}
        initial="hidden"
        animate="visible"
      >
        {Array.from({ length: count }, (_, i) => (
          <motion.div key={i} variants={fadeRise}>
            <div className="skeleton aspect-square !rounded-lg" />
            <div className="skeleton mt-3 h-6 w-1/2" />
            <div className="skeleton mt-3 h-4 w-4/5" />
            <div className="skeleton mt-2 h-3 w-2/3" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
export function PageLoading({ children }: { children?: ReactNode }) {
  return (
    <motion.div
      className="shell page"
      role="status"
      aria-label="Carregando"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: motionTokens.duration.base }}
    >
      <div className="skeleton mb-8 h-8 w-48" />
      {children || (
        <div className="space-y-4">
          <div className="skeleton h-36 w-full" />
          <div className="skeleton h-20 w-3/4" />
        </div>
      )}
      <span className="sr-only">Carregando…</span>
    </motion.div>
  );
}
