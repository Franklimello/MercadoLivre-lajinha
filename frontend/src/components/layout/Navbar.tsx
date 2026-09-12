"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Car,
  Home,
  UserRound,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatInbox } from "@/contexts/ChatContext";
import { UnreadBadge } from "@/components/chat/UnreadBadge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { motionTokens } from "@/lib/motion";

function HeaderSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const vehicles = pathname.startsWith("/veiculos");
  const catalog = pathname === "/" || pathname === "/veiculos";
  const [focused, setFocused] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const urlTerm = catalog ? params.get("q") || "" : "";
  useEffect(() => {
    if (searchInput.current && !searchTimer.current)
      searchInput.current.value = urlTerm;
  }, [urlTerm, pathname]);
  useEffect(
    () => () => {
      clearTimeout(searchTimer.current);
      searchTimer.current = undefined;
    },
    [pathname],
  );
  function search(term: string, replace = false) {
    const query = catalog
      ? new URLSearchParams(params.toString())
      : new URLSearchParams();
    if (term) query.set("q", term);
    else query.delete("q");
    query.delete("page");
    const href = `${vehicles ? "/veiculos" : "/"}?${query}`;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href);
  }
  function scheduleVehicleSearch(value: string) {
    clearTimeout(searchTimer.current);
    if (!vehicles || !catalog) return;
    searchTimer.current = setTimeout(() => {
      searchTimer.current = undefined;
      const term = value.trim();
      if (term !== urlTerm) search(term, true);
    }, 400);
  }
  return (
    <motion.form
      role="search"
      className="search-bar header-search"
      initial={false}
      animate={
        focused
          ? { boxShadow: "0 0 0 3px rgba(36, 96, 68, 0.12)" }
          : { boxShadow: "0 0 0 0 rgba(36, 96, 68, 0)" }
      }
      transition={{ duration: motionTokens.duration.quick }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const term = String(data.get("q") || "").trim();
        clearTimeout(searchTimer.current);
        searchTimer.current = undefined;
        search(term);
      }}
    >
      <motion.span
        aria-hidden="true"
        animate={
          focused ? { scale: 1.08, rotate: -7 } : { scale: 1, rotate: 0 }
        }
        transition={motionTokens.spring.snappy}
        className="shrink-0 text-muted-foreground"
      >
        <Search size={19} />
      </motion.span>
      <label htmlFor="site-search" className="sr-only">
        Buscar {vehicles ? "veículos" : "produtos"}
      </label>
      <input
        key={pathname}
        ref={searchInput}
        id="site-search"
        name="q"
        type="search"
        maxLength={120}
        defaultValue={catalog ? params.get("q") || "" : ""}
        onChange={(event) => {
          if (!(event.nativeEvent as InputEvent).isComposing)
            scheduleVehicleSearch(event.currentTarget.value);
        }}
        onCompositionStart={() => clearTimeout(searchTimer.current)}
        onCompositionEnd={(event) =>
          scheduleVehicleSearch(event.currentTarget.value)
        }
        placeholder={
          vehicles ? "Busque marca ou modelo" : "O que você está procurando?"
        }
      />
      <motion.button
        type="submit"
        className="icon-button bg-primary text-white hover:bg-[#194d34]"
        aria-label="Buscar"
        whileTap={{ scale: 0.9 }}
        transition={motionTokens.spring.snappy}
      >
        <Search size={19} />
      </motion.button>
    </motion.form>
  );
}

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { unread } = useChatInbox();
  const messagesLabel = unread.total
    ? `Mensagens, ${unread.total} não lidas`
    : "Mensagens";
  const pathname = usePathname();
  const router = useRouter();
  const chat = /^\/negociacoes\/.+/.test(pathname);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const secondaryOpacity = useTransform(scrollY, [24, 120], [1, 0]);
  const secondaryY = useTransform(scrollY, [24, 120], [0, -4]);
  const headerShadow = useTransform(
    scrollY,
    [0, 100],
    ["0 4px 16px rgba(38, 53, 45, 0)", "0 4px 16px rgba(38, 53, 45, 0.07)"],
  );
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/produtos")
      : href === "/anunciar"
        ? pathname === "/anunciar" || pathname === "/veiculos/novo"
        : pathname.startsWith(href) && pathname !== "/veiculos/novo";
  return (
    <>
      <motion.header
        className="site-header"
        style={{ boxShadow: chat ? "none" : headerShadow }}
      >
        <div className="shell header-main">
          <Link
            href="/"
            className="wordmark"
            aria-label="Mercado Livre Lajinha — início"
          >
            <Image
              src="/brand/icon.svg"
              width={40}
              height={40}
              alt=""
              className="brand-icon"
              priority
            />
            <span className="brand-mobile-title" aria-hidden="true">
              ML <span>Lajinha</span>
            </span>
            <Image
              src="/brand/logo.svg"
              width={229}
              height={40}
              alt=""
              className="brand-logo"
              priority
            />
          </Link>
          <Suspense
            fallback={<div className="header-search skeleton h-12 flex-1" />}
          >
            <HeaderSearch />
          </Suspense>
          <div className="header-actions">
            <Link
              href="/negociacoes"
              className="hidden lg:inline-flex icon-button relative"
              aria-label={messagesLabel}
            >
              <MessageSquare size={21} />
              <UnreadBadge count={unread.total} />
            </Link>
            {loading ? (
              <div
                className="skeleton size-11 rounded-full"
                aria-label="Carregando conta"
              />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Abrir menu da conta"
                  className="icon-button"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={user.avatarUrl || ""} alt="" />
                    <AvatarFallback>
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <p className="px-3 py-2 text-sm font-medium truncate">
                    {user.name}
                  </p>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/conta")}>
                    <UserRound />
                    Minha conta e anúncios
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/negociacoes")}>
                    <MessageSquare />
                    Mensagens
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await signOut();
                      } catch {
                        toast.error("Não foi possível sair. Tente novamente.");
                      }
                    }}
                  >
                    <LogOut />
                    Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium"
              >
                <UserRound size={19} />
                Entrar
              </Link>
            )}
            <motion.div
              className="hidden md:block"
              variants={{ rest: { y: 0 }, hover: { y: -1 } }}
              whileTap={{ scale: 0.97 }}
              initial="rest"
              whileHover="hover"
              transition={motionTokens.spring.snappy}
            >
              <Link href="/anunciar" className={`${buttonVariants()} group`}>
                <motion.span
                  aria-hidden="true"
                  className="inline-flex"
                  variants={{ rest: { rotate: 0 }, hover: { rotate: 90 } }}
                  transition={motionTokens.spring.snappy}
                >
                  <Plus />
                </motion.span>
                Anunciar
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="shell header-sub">
          <nav aria-label="Navegação principal" className="desktop-nav">
            <Link href="/" aria-current={isActive("/") ? "page" : undefined}>
              Produtos
            </Link>
            <Link
              href="/veiculos"
              aria-current={isActive("/veiculos") ? "page" : undefined}
            >
              Veículos
            </Link>
          </nav>
          <motion.p
            className="region-label"
            style={{
              opacity: secondaryOpacity,
              y: reducedMotion ? 0 : secondaryY,
            }}
          >
            <MapPin size={14} aria-hidden="true" />
            Lajinha e região · MG
          </motion.p>
          <motion.span
            className="caption hidden sm:block md:hidden"
            style={{ opacity: secondaryOpacity }}
          >
            Compre e venda por aqui.
          </motion.span>
        </div>
      </motion.header>
      {!chat && (
        <nav className="bottom-nav" aria-label="Navegação do celular">
          {[
            { href: "/", label: "Início", icon: Home },
            { href: "/veiculos", label: "Veículos", icon: Car },
            { href: "/anunciar", label: "Anunciar", icon: Plus },
            { href: "/negociacoes", label: "Mensagens", icon: MessageSquare },
            { href: "/conta", label: "Conta", icon: UserRound },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              aria-label={href === "/negociacoes" ? messagesLabel : undefined}
              className={href === "/anunciar" ? "nav-publish" : ""}
            >
              {isActive(href) && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="bottom-nav-indicator"
                  transition={motionTokens.spring.snappy}
                />
              )}
              <motion.span
                className="bottom-nav-content"
                whileTap={
                  href === "/anunciar"
                    ? { scale: 0.9, rotate: -3 }
                    : { scale: 0.9 }
                }
                animate={
                  isActive(href) ? { y: -1, scale: 1.04 } : { y: 0, scale: 1 }
                }
                transition={motionTokens.spring.snappy}
              >
                <span className="relative inline-flex">
                  <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                  {href === "/negociacoes" && (
                    <UnreadBadge count={unread.total} />
                  )}
                </span>
                <span>{label}</span>
              </motion.span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
