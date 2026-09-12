"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, MoveUpRight } from "lucide-react";
import { motion } from "motion/react";
import { motionTokens, fadeRise } from "@/lib/motion";

export function LoginBrand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`login-brand${light ? " login-brand-light" : ""}`}
      aria-label="Mercado Livre Lajinha — início"
    >
      <Image src="/brand/icon.svg" alt="" width={43} height={43} />
      <span>
        mercado livre
        <strong>
          lajinha<span className="login-brand-dot">.</span>
        </strong>
      </span>
    </Link>
  );
}

export function LoginVisual() {
  return (
    <aside
      className="login-story"
      aria-label="Um novo olhar para o que já existe"
    >
      <div className="login-story-top">
        <LoginBrand light />
        <span className="login-location">
          <MapPin size={13} aria-hidden="true" /> Lajinha, MG
        </span>
      </div>
      <motion.div
        className="login-story-copy"
        variants={fadeRise}
        initial="hidden"
        animate="visible"
        transition={{
          duration: motionTokens.duration.reveal,
          ease: motionTokens.ease.standard,
        }}
      >
        <p className="login-eyebrow">
          <span /> COISAS BOAS CIRCULAM POR AQUI
        </p>
        <h2>
          Novos encontros.
          <br />
          <em>Novas histórias.</em>
        </h2>
        <p>
          O que alguém não usa mais pode ser
          <br className="login-desktop-break" /> exatamente o que você procura.
        </p>
      </motion.div>
      <motion.div
        className="login-scene"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: motionTokens.duration.reveal, delay: 0.1 }}
      >
        <Image
          src="/brand/login-still-life.webp"
          alt="Poltrona verde, câmera vintage e luminária amarela em um ambiente iluminado pelo sol"
          fill
          priority
          sizes="(max-width: 959px) 100vw, 56vw"
        />
        <div className="login-scene-note">
          <span className="login-note-icon">
            <MoveUpRight size={18} aria-hidden="true" />
          </span>
          <span>
            Um novo olhar.<strong>Uma segunda chance.</strong>
          </span>
        </div>
        <span className="login-scene-label">
          MENOS DISTÂNCIA. MAIS POSSIBILIDADES.
        </span>
      </motion.div>
      <div className="login-story-bottom">
        <span>De pessoa para pessoa. De perto.</span>
        <ArrowUpRight size={19} aria-hidden="true" />
      </div>
    </aside>
  );
}
