'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api';
import { MessageSquare, ShoppingBag, ArrowRight, Loader2, Calendar } from 'lucide-react';

interface NegotiationItem {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  status: 'OPEN' | 'NEGOTIATING' | 'AGREED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
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
  };
  messages: {
    content: string;
    createdAt: string;
    senderId: string;
  }[];
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  OPEN: { label: 'Aberta', variant: 'secondary' },
  NEGOTIATING: { label: 'Em Negociação', variant: 'default' },
  AGREED: { label: 'Acordo Fechado', variant: 'default' },
  COMPLETED: { label: 'Concluída', variant: 'secondary' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
};

export default function NegociacoesPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<'all' | 'buying' | 'selling'>('all');
  const [negotiations, setNegotiations] = useState<NegotiationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const roleQuery = tab !== 'all' ? `?role=${tab}` : '';
    apiFetch<NegotiationItem[]>(`/negotiations${roleQuery}`)
      .then((data) => setNegotiations(data))
      .catch((err) => {
        console.error(err);
        setNegotiations([]);
      })
      .finally(() => setLoading(false));
  }, [user, tab]);

  if (authLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Faça login para ver suas negociações</h2>
        <p className="text-sm text-muted-foreground">
          Entre com sua conta Google para acessar o chat e histórico de mensagens.
        </p>
        <Button onClick={() => signInWithGoogle()} className="w-full font-semibold h-11">
          Entrar com Google
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Minhas Negociações
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas conversas com compradores e vendedores de Lajinha.
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setTab('buying')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'buying'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Comprando
        </button>
        <button
          onClick={() => setTab('selling')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'selling'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Vendendo
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      ) : negotiations.length > 0 ? (
        <div className="space-y-3">
          {negotiations.map((neg) => {
            const isBuyer = neg.buyerId === user.id;
            const otherParty = isBuyer ? neg.seller : neg.buyer;
            const statusInfo = statusMap[neg.status] || { label: neg.status, variant: 'outline' };
            const lastMsg = neg.messages?.[0];
            const coverImage = neg.product?.images?.[0]?.url;

            return (
              <Link key={neg.id} href={`/negociacoes/${neg.id}`} className="block group">
                <Card className="hover:border-primary/40 hover:shadow-md transition-all rounded-xl overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Imagem do Produto */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                      {coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Dados */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {neg.product.title}
                        </h3>
                        <Badge variant={statusInfo.variant} className="text-[10px] font-semibold shrink-0">
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">
                          {Number(neg.product.price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                        <span>•</span>
                        <span>{isBuyer ? 'Vendedor' : 'Comprador'}: <strong>{otherParty.name}</strong></span>
                      </div>

                      {lastMsg ? (
                        <p className="text-xs text-muted-foreground/90 truncate italic">
                          {lastMsg.senderId === user.id ? 'Você: ' : ''}{lastMsg.content}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">
                          Nenhuma mensagem trocada ainda
                        </p>
                      )}
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-transform group-hover:translate-x-1 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 bg-muted/20 border border-dashed border-border rounded-2xl p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <MessageSquare className="h-6 w-6 opacity-50" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Nenhuma negociação encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Quando você demonstrar interesse em um anúncio ou alguém se interessar pelos seus produtos, as conversas aparecerão aqui.
          </p>
          <Link href="/" className={buttonVariants({ className: 'mt-2 font-semibold' })}>
            Explorar Produtos
          </Link>
        </div>
      )}
    </div>
  );
}
