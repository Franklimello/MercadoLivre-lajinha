'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductCarousel } from '@/components/products/ProductCarousel';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin,
  Calendar,
  ShieldCheck,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductDetail {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number | string;
  stock: number;
  condition: string;
  status: string;
  city: string;
  state: string;
  createdAt: string;
  category: { name: string; slug: string };
  images: { url: string; position: number }[];
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
  };
}

const conditionMap: Record<string, string> = {
  NEW: 'Novo (na caixa)',
  LIKE_NEW: 'Seminovo',
  GOOD: 'Bom estado',
  FAIR: 'Usado',
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    apiFetch<ProductDetail>(`/products/${params.id}`)
      .then((data) => setProduct(data))
      .catch((err) => {
        console.error(err);
        toast.error('Anúncio não encontrado.');
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleInterest = async () => {
    if (!user) {
      toast.info('Faça login para negociar este produto.');
      await signInWithGoogle();
      return;
    }

    if (product && product.sellerId === user.id) {
      toast.error('Você é o dono deste anúncio!');
      return;
    }

    if (product?.stock === 0 || product?.status !== 'ACTIVE') {
      toast.error('Este produto não está mais disponível para negociação.');
      return;
    }

    setNegotiating(true);
    try {
      // Cria ou recupera negociação existente
      const res = await apiFetch<{ id: string }>('/negotiations', {
        method: 'POST',
        body: JSON.stringify({ productId: product?.id }),
      });
      router.push(`/negociacoes/${res.id}`);
    } catch (error: any) {
      // Se já houver negociação ou erro, direciona ou notifica
      toast.error(error.message || 'Erro ao iniciar negociação.');
    } finally {
      setNegotiating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Anúncio não encontrado</h2>
        <p className="text-sm text-muted-foreground">
          O produto que você procura pode ter sido removido ou vendido.
        </p>
        <Link href="/" className={buttonVariants()}>
          Voltar para a Vitrine
        </Link>
      </div>
    );
  }

  const isSoldOrUnavailable = product.status !== 'ACTIVE' || product.stock <= 0;
  const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar para a vitrine
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Carrossel de Fotos (Coluna Esquerda) */}
        <div className="lg:col-span-7">
          <ProductCarousel images={product.images} title={product.title} />
        </div>

        {/* Informações e Ação (Coluna Direita) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {product.category?.name || 'Produto'}
              </Badge>
              <Badge className="text-xs font-semibold">
                {conditionMap[product.condition] || product.condition}
              </Badge>
              {isSoldOrUnavailable && (
                <Badge variant="destructive" className="text-xs font-bold">
                  {product.status === 'SOLD' ? 'VENDIDO' : 'INDISPONÍVEL'}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-snug">
              {product.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
              <span>{product.city} - {product.state}</span>
              <span>•</span>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
              <span>Publicado em {new Date(product.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 border border-border p-5 space-y-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Preço à vista</span>
              <p className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
                {formattedPrice}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-4 w-4 text-primary" />
              <span>Estoque disponível: <strong>{product.stock} unidade(s)</strong></span>
            </div>

            {/* Botão de Negociação */}
            <Button
              size="lg"
              disabled={isSoldOrUnavailable || negotiating}
              onClick={handleInterest}
              className="w-full font-bold h-12 text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {negotiating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : isSoldOrUnavailable ? (
                'Anúncio Encerrado'
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Tenho Interesse / Negociar
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Sem pagamento no app. Converse diretamente com o vendedor pelo chat seguro ou WhatsApp.
            </p>
          </div>

          {/* Vendedor */}
          <div className="rounded-2xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-border">
                <AvatarImage src={product.seller.avatarUrl || ''} alt={product.seller.name} />
                <AvatarFallback className="bg-primary/10 font-bold text-primary">
                  {product.seller.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Vendido por</p>
                <p className="font-semibold text-sm text-foreground">{product.seller.name}</p>
                <p className="text-[11px] text-muted-foreground">Vendedor local verificado</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Conta ativa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Descrição do Produto */}
      <div className="pt-6 border-t border-border space-y-3">
        <h2 className="text-lg font-bold text-foreground">Descrição do Anúncio</h2>
        <div className="rounded-2xl bg-muted/20 border border-border p-6 text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
          {product.description}
        </div>
      </div>
    </div>
  );
}
