"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { useSocketChat, type ChatMessage } from "@/hooks/useSocketChat";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { PageLoading, ErrorState } from "@/components/marketplace/Feedback";
import { ListingImage } from "@/components/marketplace/ListingImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppDirectButton } from "@/components/chat/WhatsAppDirectButton";
import { apiFetch } from "@/lib/api";
import {
  errorMessage,
  formatDate,
  formatPrice,
  listingHref,
  negotiationStatuses,
} from "@/lib/marketplace";
import type { Negotiation } from "@/lib/chat";
import { toast } from "sonner";
export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  // Detail and history start together rather than waiting for one HTTP roundtrip.
  const chat = useSocketChat(id);
  const detail = useApiResource<Negotiation>(
    user ? `/negotiations/${id}` : null,
  );
  if (loading) return <PageLoading />;
  if (!user)
    return (
      <LoginPanel
        title="Entre para abrir a conversa"
        description="Suas mensagens ficam disponíveis na sua conta."
      />
    );
  if (detail.loading) return <PageLoading />;
  if (detail.error || !detail.data)
    return (
      <div className="shell page">
        <Link href="/negociacoes" className="back-link">
          <ArrowLeft size={16} />
          Voltar às mensagens
        </Link>
        <ErrorState
          retry={detail.reload}
          title="Não foi possível abrir a conversa"
        />
      </div>
    );
  return (
    <Conversation
      key={detail.data.id}
      negotiation={detail.data}
      userId={user.id}
      chat={chat}
    />
  );
}
function Conversation({
  negotiation: neg,
  userId,
  chat,
}: {
  negotiation: Negotiation;
  userId: string;
  chat: ReturnType<typeof useSocketChat>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<ChatMessage | null>(null);
  const visibleMessages = useMemo(
    () => (pending ? [...chat.messages, pending] : chat.messages),
    [chat.messages, pending],
  );
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState(neg.status);
  const scroll = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const seller = neg.sellerId === userId;
  const other = seller ? neg.buyer : neg.seller;
  useEffect(() => {
    if (stickToBottom.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [visibleMessages, chat.loading]);
  const markRead = chat.markRead;
  useEffect(() => {
    const readVisibleMessages = () => {
      if (
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        stickToBottom.current
      )
        void markRead(
          () =>
            document.visibilityState === "visible" &&
            document.hasFocus() &&
            stickToBottom.current,
        );
    };
    readVisibleMessages();
    window.addEventListener("focus", readVisibleMessages);
    document.addEventListener("visibilitychange", readVisibleMessages);
    return () => {
      window.removeEventListener("focus", readVisibleMessages);
      document.removeEventListener("visibilitychange", readVisibleMessages);
    };
  }, [markRead, chat.messages]);
  async function send() {
    if (!text.trim() || sending || !chat.connected) return;
    const content = text.trim();
    setSending(true);
    setError("");
    setText("");
    stickToBottom.current = true;
    setPending({
      id: crypto.randomUUID(),
      negotiationId: neg.id,
      senderId: userId,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
      sender: { id: userId, name: "Você", avatarUrl: null },
      delivery: "sending",
    });
    try {
      await chat.sendMessage(content);
    } catch (error) {
      setError(errorMessage(error));
      setText((current) => current || content);
    } finally {
      setPending(null);
      setSending(false);
    }
  }
  return (
    <section className="chat-page" aria-label={`Conversa com ${other.name}`}>
      <header className="chat-heading">
        <Link
          href="/negociacoes"
          className="icon-button"
          aria-label="Voltar às mensagens"
        >
          <ArrowLeft size={20} />
        </Link>
        <Avatar className="size-10">
          <AvatarImage src={other.avatarUrl || ""} alt="" />
          <AvatarFallback>
            {other.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-medium">{other.name}</h1>
          <p className="caption">
            {seller ? "Comprador" : "Vendedor"} · {negotiationStatuses[status]}
          </p>
        </div>
      </header>
      <div className="chat-product">
        <Link
          href={listingHref(neg.product)}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="listing-photo size-12 shrink-0">
            <ListingImage
              src={neg.product.images[0]?.url}
              alt=""
              sizes="48px"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm">{neg.product.title}</p>
            <p className="font-semibold text-sm">
              {formatPrice(neg.product.price)}
            </p>
          </div>
        </Link>
        <div className="flex flex-wrap gap-2">
          {!seller && neg.seller.whatsapp && (
            <WhatsAppDirectButton
              phone={neg.seller.whatsapp}
              sellerName={neg.seller.name}
              productTitle={neg.product.title}
            />
          )}
          {seller && status !== "COMPLETED" && (
            <Button
              size="sm"
              variant="outline"
              disabled={updating}
              onClick={async () => {
                setUpdating(true);
                try {
                  await apiFetch(`/negotiations/${neg.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "COMPLETED" }),
                  });
                  setStatus("COMPLETED");
                  toast.success("Venda concluída.");
                } catch (error) {
                  toast.error(errorMessage(error));
                } finally {
                  setUpdating(false);
                }
              }}
            >
              <Check />
              {updating ? "Salvando…" : "Marcar vendido"}
            </Button>
          )}
        </div>
      </div>
      {!chat.connected && (
        <div
          className="notice-bar flex items-center justify-between gap-2"
          role="status"
        >
          <span>Conversa desconectada. Suas mensagens estão salvas.</span>
          <button
            className="text-link min-h-11 shrink-0"
            onClick={chat.reconnect}
          >
            Reconectar
          </button>
        </div>
      )}
      <div
        className="chat-messages"
        ref={scroll}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          if (
            stickToBottom.current &&
            document.visibilityState === "visible" &&
            document.hasFocus()
          )
            void chat.markRead(
              () =>
                document.visibilityState === "visible" &&
                document.hasFocus() &&
                stickToBottom.current,
            );
        }}
        role="log"
        aria-label="Mensagens da conversa"
        aria-live="polite"
        aria-relevant="additions"
      >
        {chat.loading ? (
          <div
            className="space-y-4"
            role="status"
            aria-label="Carregando histórico"
          >
            <div className="skeleton h-14 w-2/3" />
            <div className="skeleton ml-auto h-16 w-3/5" />
          </div>
        ) : chat.error ? (
          <ErrorState retry={chat.reload} title="O histórico não carregou" />
        ) : !visibleMessages.length ? (
          <div className="py-8 text-center">
            <h2 className="font-medium">Comece a conversa</h2>
            <p className="caption mx-auto mt-2 max-w-xs">
              Pergunte sobre o estado do produto, combine a retirada ou faça uma
              proposta.
            </p>
          </div>
        ) : (
          <MessageHistory
            messages={visibleMessages}
            userId={userId}
            otherName={other.name}
          />
        )}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="chat-message">
          Sua mensagem
        </label>
        <Textarea
          id="chat-message"
          rows={1}
          className="!min-h-11 max-h-32 resize-none"
          placeholder="Escreva uma mensagem"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              window.matchMedia("(min-width: 768px)").matches
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending || !chat.connected}
          aria-label={sending ? "Enviando mensagem" : "Enviar mensagem"}
        >
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </section>
  );
}

// Typing in the composer must not rebuild the entire message history.
const MessageHistory = memo(function MessageHistory({
  messages,
  userId,
  otherName,
}: {
  messages: ChatMessage[];
  userId: string;
  otherName: string;
}) {
  return (
    <>
      {messages.map((msg, i) => (
        <div key={msg.id}>
          {(i === 0 ||
            new Date(messages[i - 1].createdAt).toDateString() !==
              new Date(msg.createdAt).toDateString()) && (
            <p className="caption mb-5 mt-3 text-center">
              {formatDate(msg.createdAt)}
            </p>
          )}
          <div className="message" data-own={msg.senderId === userId}>
            <span className="sr-only">
              {msg.senderId === userId ? "Você" : otherName}:{" "}
            </span>
            <p className="whitespace-pre-wrap text-sm leading-6">
              {msg.content}
            </p>
            <time dateTime={msg.createdAt}>
              {msg.delivery === "sending"
                ? "Enviando…"
                : new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </time>
          </div>
        </div>
      ))}
    </>
  );
});
