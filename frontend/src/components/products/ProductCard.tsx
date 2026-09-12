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
    <Link href={`/produtos/${product.id}`} className="group block h-full">
      <Card className="h-full flex flex-col overflow-hidden border-border/50 bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 rounded-2xl">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          {/* Badge de Condição */}
          <div className="absolute top-3 left-3">
            <Badge
              variant={conditionInfo.variant}
              className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold backdrop-blur-md bg-background/80 text-foreground border-none shadow-sm"
            >
              {conditionInfo.label}
            </Badge>
          </div>
        </div>

        <CardContent className="flex flex-col flex-1 p-4 space-y-2.5">
          <div className="space-y-1 flex-1">
            <p className="text-[11px] font-medium text-primary/80 uppercase tracking-wider">
              {product.category?.name || 'Geral'}
            </p>
            <h3 className="font-semibold text-sm md:text-base line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors leading-tight">
              {product.title}
            </h3>
          </div>
          
          <div className="pt-2">
            <p className="text-xl md:text-2xl font-black text-primary tracking-tight">
              {formattedPrice}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate font-medium">{product.city} - {product.state}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
