"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { LoginBrand, LoginVisual } from "@/components/auth/LoginVisual";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import "./login.css";
import { PageLoading } from "@/components/marketplace/Feedback";
import { useAuth } from "@/contexts/AuthContext";

function LoginContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("next") || "/";
  const destination =
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.includes("\\") &&
    !requested.startsWith("/login")
      ? requested
      : "/";

  useEffect(() => {
    if (user) {
      router.replace(destination);
    }
  }, [user, router, destination]);

  return (
    <div className="auth-page">
      <header className="login-mobile-header">
        <LoginBrand />
        <Link href="/" aria-label="Explorar anúncios">
          <ArrowUpRight size={21} />
        </Link>
      </header>
      <LoginVisual />
      <section
        className="login-form-side"
        aria-label="Entrar no Mercado Livre Lajinha"
      >
        <div className="login-form-top">
          <span>O MARKETPLACE DA NOSSA REGIÃO</span>
          <Link href="/">
            Voltar ao início
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <LoginPanel variant="page" />
        <footer className="login-form-footer">
          <span>Feito para aproximar.</span>
          <span>
            <MapPin size={12} aria-hidden="true" /> Lajinha e região · MG
          </span>
        </footer>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginContent />
    </Suspense>
  );
}
