'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketChat } from '@/hooks/useSocketChat';
import { WhatsAppDirectButton } from '@/components/chat/WhatsAppDirectButton';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  ShoppingBag,
  ShieldCheck,
  CheckCircle,
  Loader2,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface NegotiationDetail {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  status: 'OPEN' | 'NEGOTIATING' | 'AGREED' | 'CANCELLED' | 'COMPLETED';
  product: {
    id: string;
    title: string;
    price: number | string;
    status: string;
    type: string;
    images: { url: string }[];
  };
  buyer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    whatsapp?: string; // Disponibilizado com segurança para o comprador!
  };
}

export default function NegociacaoChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const negotiationId = params.id as string;

  const [negotiation, setNegotiation] = useState<NegotiationDetail | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { messages, loading: messagesLoading, connected, sendMessage } = useSocketChat(negotiationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadNegotiation = () => {
    if (!negotiationId) return;
    setInfoLoading(true);
    apiFetch<NegotiationDetail>(`/negotiations/${negotiationId}`)
      .then((data) => setNegotiation(data))
      .catch((err) => {
        console.error(err);
        toast.error('Erro ao abrir negociação.');
      })
      .finally(() => setInfoLoading(false));
  };

  useEffect(() => {
    loadNegotiation();
  }, [negotiationId]);

  // Rola para a mensagem mais recente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleUpdateStatus = async (newStatus: 'AGREED' | 'COMPLETED' | 'CANCELLED') => {
    setActionLoading(true);
    try {
      await apiFetch(`/negotiations/${negotiationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success('Status da negociação atualizado!');
      loadNegotiation();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || infoLoading) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!negotiation || !user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Negociação não encontrada</h2>
        <Link href="/negociacoes" className={buttonVariants()}>
          Voltar para Minhas Negociações
        </Link>
      </div>
    );
  }

  const isSeller = negotiation.sellerId === user.id;
  const isBuyer = negotiation.buyerId === user.id;
  const otherParty = isSeller ? negotiation.buyer : negotiation.seller;
  const coverImage = negotiation.product?.images?.[0]?.url;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-4 flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4.5rem)]">
      {/* Topo: Voltar e Resumo do Produto */}
      <div className="border border-border rounded-2xl bg-card p-3.5 mb-3 shadow-xs space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/negociacoes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Minhas Negociações
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] text-muted-foreground">
              {connected ? 'Chat ao vivo' : 'Conectando...'}
            </span>
          </div>
        </div>

        {/* Card do Produto com Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted border border-border">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <Link
                href={
                  negotiation.product.type === 'VEHICLE'
                    ? `/veiculos/${negotiation.product.id}`
                    : `/produtos/${negotiation.product.id}`
                }
                className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1"
                target="_blank"
              >
                <span>{negotiation.product.title}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
              <p className="text-base font-extrabold text-primary">
                {Number(negotiation.product.price).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Negociando com: <strong>{otherParty.name}</strong>
              </p>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Atalho seguro WhatsApp para o comprador */}
            {isBuyer && negotiation.seller.whatsapp && (
              <WhatsAppDirectButton
                phone={negotiation.seller.whatsapp}
                sellerName={negotiation.seller.name}
                productTitle={negotiation.product.title}
              />
            )}

            {/* Ações do Vendedor */}
            {isSeller && negotiation.status !== 'COMPLETED' && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('COMPLETED')}
                className="text-xs font-semibold border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Marcar como Vendido
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Caixa de Mensagens (Scrollable) */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/80 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span>Chat seguro direto entre comprador e vendedor</span>
          </div>
        </div>

        {messagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] md:max-w-[70%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {!isMe && (
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5 border border-border">
                    <AvatarImage src={msg.sender?.avatarUrl || ''} />
                    <AvatarFallback className="text-[10px] font-bold">
                      {msg.sender?.name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-card text-card-foreground border border-border rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 space-y-2 text-muted-foreground">
            <p className="text-sm font-semibold">Inicie a conversa!</p>
            <p className="text-xs max-w-xs mx-auto">
              Pergunte se o item ainda está disponível, onde podem se encontrar em Lajinha para conferir o produto ou faça uma proposta.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Input Fixo */}
      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="h-12 bg-background border-border rounded-xl text-sm"
        />
        <Button
          type="submit"
          className="h-12 px-5 font-bold rounded-xl gap-1.5 shadow-xs"
          disabled={!inputText.trim()}
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Enviar</span>
        </Button>
      </form>
    </div>
  );
}
