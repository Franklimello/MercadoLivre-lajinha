'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Gauge, Calendar, Fuel, Cog, Image as ImageIcon } from 'lucide-react';

export interface VehicleSummary {
  id: string;
  title: string;
  price: number | string;
  city: string;
  state: string;
  images: { url: string; position: number }[];
  vehicle: {
    vehicleType: string;
    brand: string;
    model: string;
    year: number;
    mileage: number;
    fuel: string;
    transmission: string;
    engine: string;
  };
}

const typeLabels: Record<string, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
  TRUCK: 'Caminhão',
  UTILITY: 'Utilitário',
  AGRI_MACHINE: 'Máquina Agrícola',
  OTHER: 'Outro',
};

export function VehicleCard({ vehicle }: { vehicle: VehicleSummary }) {
  const coverImage = vehicle.images?.[0]?.url;
  const v = vehicle.vehicle;
  const formattedPrice = Number(vehicle.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <Link href={`/veiculos/${vehicle.id}`} className="group block">
      <Card className="overflow-hidden border-border/80 transition-all duration-200 hover:shadow-md hover:border-primary/40 rounded-xl">
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={vehicle.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-30" />
            </div>
          )}
          <Badge className="absolute top-2.5 left-2.5 text-[10px] font-bold bg-slate-900/80 backdrop-blur shadow-xs">
            {typeLabels[v?.vehicleType] || 'Veículo'}
          </Badge>
        </div>

        <CardContent className="p-3.5 space-y-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {v?.brand}
            </p>
            <h3 className="font-bold text-sm line-clamp-1 text-foreground group-hover:text-primary transition-colors">
              {v?.model} {v?.engine}
            </h3>
          </div>

          <p className="text-lg font-black text-primary tracking-tight">
            {formattedPrice}
          </p>

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/60 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span>{v?.year}</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span>{v?.mileage.toLocaleString('pt-BR')} km</span>
            </div>
            <div className="flex items-center gap-1">
              <Cog className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{v?.transmission}</span>
            </div>
            <div className="flex items-center gap-1">
              <Fuel className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{v?.fuel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{vehicle.city} - {vehicle.state}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
