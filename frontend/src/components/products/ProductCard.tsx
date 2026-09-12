'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon } from 'lucide-react';

export interface ProductSummary {
  id: string;
  title: string;
  price: number | string;
  condition: string;
  city: string;
  state: string;
  createdAt: string;
  images: { url: string; position: number }[];
  category?: { name: string; slug: string };
  type: string;
}

const conditionMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  NEW: { label: 'Novo', variant: 'default' },
  LIKE_NEW: { label: 'Seminovo', variant: 'secondary' },
  GOOD: { label: 'Bom estado', variant: 'outline' },
  FAIR: { label: 'Usado', variant: 'outline' },
};

export function ProductCard({ product }: { product: ProductSummary }) {
  const coverImage = product.images?.[0]?.url;
  const conditionInfo = conditionMap[product.condition] || { label: product.condition, variant: 'outline' };
  const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <Link href={`/produtos/${product.id}`} className="group block">
      <Card className="overflow-hidden border-border/80 transition-all duration-200 hover:shadow-md hover:border-primary/40 rounded-xl">
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-30" />
            </div>
          )}
          <Badge
            variant={conditionInfo.variant}
            className="absolute top-2.5 left-2.5 text-[11px] font-semibold backdrop-blur-xs shadow-xs"
          >
            {conditionInfo.label}
          </Badge>
        </div>

        <CardContent className="p-3.5 space-y-1.5">
          <p className="text-xs text-muted-foreground truncate">
            {product.category?.name || 'Geral'}
          </p>
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-snug">
            {product.title}
          </h3>
          <p className="text-lg font-bold text-primary tracking-tight">
            {formattedPrice}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{product.city} - {product.state}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
