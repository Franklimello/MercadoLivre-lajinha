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
  Gauge,
  Fuel,
  Cog,
  Palette,
  Car,
} from 'lucide-react';
import { toast } from 'sonner';

interface VehicleDetail {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number | string;
  status: string;
  city: string;
  state: string;
  createdAt: string;
  images: { url: string; position: number }[];
  vehicle: {
    vehicleType: string;
    brand: string;
    model: string;
    year: number;
    mileage: number;
    color: string;
    fuel: string;
    transmission: string;
    engine: string;
    bodyType?: string;
    plateEnd?: string;
  };
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
  };
}

export default function VeiculoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    apiFetch<VehicleDetail>(`/vehicles/${params.id}`)
      .then((data) => setVehicle(data))
      .catch((err) => {
        console.error(err);
        toast.error('Veículo não encontrado.');
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleInterest = async () => {
    if (!user) {
      toast.info('Faça login para negociar este veículo.');
      await signInWithGoogle();
      return;
    }

    if (vehicle && vehicle.sellerId === user.id) {
      toast.error('Você é o dono deste anúncio!');
      return;
    }

    if (vehicle?.status !== 'ACTIVE') {
      toast.error('Este veículo não está mais disponível.');
      return;
    }

    setNegotiating(true);
    try {
      const res = await apiFetch<{ id: string }>('/negotiations', {
        method: 'POST',
        body: JSON.stringify({ productId: vehicle?.id }),
      });
      router.push(`/negociacoes/${res.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar negociação.');
    } finally {
      setNegotiating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Veículo não encontrado</h2>
        <p className="text-sm text-muted-foreground">
          Este anúncio pode ter sido finalizado ou vendido.
        </p>
        <Link href="/veiculos" className={buttonVariants()}>
          Voltar para Veículos
        </Link>
      </div>
    );
  }

  const v = vehicle.vehicle;
  const isSold = vehicle.status !== 'ACTIVE';
  const formattedPrice = Number(vehicle.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <Link href="/veiculos" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar para veículos
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Fotos */}
        <div className="lg:col-span-7">
          <ProductCarousel images={vehicle.images} title={vehicle.title} />
        </div>

        {/* Resumo e Ação */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600 text-white font-bold text-xs">
                {v?.brand}
              </Badge>
              {isSold && (
                <Badge variant="destructive" className="font-bold text-xs">
                  VENDIDO
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
              {v?.model} {v?.engine}
            </h1>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
              <span>{vehicle.city} - {vehicle.state}</span>
              <span>•</span>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
              <span>Publicado em {new Date(vehicle.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 border border-border p-5 space-y-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Valor pedido</span>
              <p className="text-3xl md:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {formattedPrice}
              </p>
            </div>

            {/* Especificações Rápidas em Grade */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-background border border-border text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">Ano</span>
                <p className="font-bold">{v?.year}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">Quilometragem</span>
                <p className="font-bold">{v?.mileage.toLocaleString('pt-BR')} km</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">Câmbio</span>
                <p className="font-bold">{v?.transmission}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">Combustível</span>
                <p className="font-bold">{v?.fuel}</p>
              </div>
            </div>

            <Button
              size="lg"
              disabled={isSold || negotiating}
              onClick={handleInterest}
              className="w-full font-bold h-12 text-base gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              {negotiating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : isSold ? (
                'Veículo Vendido'
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Tenho Interesse / Negociar
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Converse direto com o proprietário pelo chat do app ou agende visita no WhatsApp.
            </p>
          </div>

          {/* Vendedor */}
          <div className="rounded-2xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-border">
                <AvatarImage src={vehicle.seller.avatarUrl || ''} alt={vehicle.seller.name} />
                <AvatarFallback className="bg-indigo-50 font-bold text-indigo-700">
                  {vehicle.seller.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Anunciado por</p>
                <p className="font-semibold text-sm text-foreground">{vehicle.seller.name}</p>
                <p className="text-[11px] text-muted-foreground">Lajinha e Região</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verificado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ficha Técnica Detalhada */}
      <div className="pt-6 border-t border-border space-y-6">
        <h2 className="text-lg font-bold text-foreground">Ficha Técnica do Veículo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Marca</span>
            <p className="font-bold text-sm">{v?.brand}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Modelo</span>
            <p className="font-bold text-sm">{v?.model}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Ano</span>
            <p className="font-bold text-sm">{v?.year}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Quilometragem</span>
            <p className="font-bold text-sm">{v?.mileage.toLocaleString('pt-BR')} km</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Câmbio</span>
            <p className="font-bold text-sm">{v?.transmission}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Combustível</span>
            <p className="font-bold text-sm">{v?.fuel}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Motorização</span>
            <p className="font-bold text-sm">{v?.engine}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-xs text-muted-foreground">Cor</span>
            <p className="font-bold text-sm">{v?.color}</p>
          </div>
          {v?.bodyType && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground">Carroceria</span>
              <p className="font-bold text-sm">{v?.bodyType}</p>
            </div>
          )}
          {v?.plateEnd && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground">Final da Placa</span>
              <p className="font-bold text-sm">{v?.plateEnd}</p>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-foreground pt-4">Observações do Proprietário</h2>
        <div className="rounded-2xl bg-muted/20 border border-border p-6 text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
          {vehicle.description}
        </div>
      </div>
    </div>
  );
}
