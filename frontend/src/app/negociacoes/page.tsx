"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { LoginPanel } from "@/components/auth/LoginPanel";
import {
  PageLoading,
  ErrorState,
  EmptyState,
} from "@/components/marketplace/Feedback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatPrice,
  negotiationStatuses,
  relativeDate,
} from "@/lib/marketplace";
import type { Negotiation } from "@/lib/chat";
export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState("all");
  const { data, loading, error, reload } = useApiResource<Negotiation[]>(
    user ? `/negotiations${tab === "all" ? "" : "?role=" + tab}` : null,
  );
  if (authLoading) return <PageLoading />;
  if (!user)
    return (
      <LoginPanel
        title="Suas conversas ficam aqui"
        description="Entre para falar com vendedores, responder compradores e acompanhar suas negociações."
      />
    );
  return (
    <div className="shell page !max-w-4xl">
      <h1 className="page-title">Mensagens</h1>
      <p className="caption mt-3">Combine os detalhes da compra ou da venda.</p>
      <div className="tab-row mt-6" aria-label="Filtrar conversas">
        {[
          ["all", "Todas"],
          ["buying", "Comprando"],
          ["selling", "Vendendo"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <div
          className="space-y-4 py-6"
          role="status"
          aria-label="Carregando conversas"
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState retry={reload} title="As conversas não carregaram" />
        </div>
      ) : data?.length ? (
        <div>
          {data.map((neg) => {
            const other = neg.buyerId === user.id ? neg.seller : neg.buyer;
            const last = neg.messages?.[0];
            return (
              <Link
                key={neg.id}
                href={`/negociacoes/${neg.id}`}
                className="conversation-row"
              >
                <Avatar className="size-12 shrink-0">
                  <AvatarImage src={other.avatarUrl || ""} alt="" />
                  <AvatarFallback>
                    {other.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-medium truncate">{other.name}</h2>
                    <time dateTime={neg.updatedAt} className="caption shrink-0">
                      {relativeDate(neg.updatedAt)}
                    </time>
                  </div>
                  <p className="caption mt-1 truncate">
                    {neg.product.title} · {formatPrice(neg.product.price)}
                  </p>
                  <p className="mt-2 truncate text-sm">
                    {last
                      ? `${last.senderId === user.id ? "Você: " : ""}${last.content}`
                      : "Envie a primeira mensagem."}
                  </p>
                  <span className="status-label mt-2">
                    {negotiationStatuses[neg.status] || neg.status}
                  </span>
                </div>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-muted-foreground"
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Ainda não há conversas"
            description="Abra um anúncio e toque em “Conversar com vendedor”. As mensagens aparecem aqui."
            href="/"
            action="Ver anúncios"
          />
        </div>
      )}
    </div>
  );
}
