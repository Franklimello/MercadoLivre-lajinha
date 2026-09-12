'use client';

import React, { Suspense, useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { VehicleCard, type VehicleSummary } from '@/components/vehicles/VehicleCard';
import { apiFetch } from '@/lib/api';
import { Search, Car, PlusCircle, Filter, Loader2, Sparkles } from 'lucide-react';

const vehicleTypes = [
  { value: '', label: 'Todos os tipos' },
  { value: 'CAR', label: 'Carros' },
  { value: 'MOTORCYCLE', label: 'Motos' },
  { value: 'TRUCK', label: 'Caminhões' },
  { value: 'UTILITY', label: 'Utilitários' },
  { value: 'AGRI_MACHINE', label: 'Máquinas Agrícolas' },
  { value: 'OTHER', label: 'Outros' },
];

function VeiculosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [isPending, startTransition] = useTransition();

  const selectedType = searchParams.get('tipo') || '';
  const selectedFuel = searchParams.get('combustivel') || '';
  const selectedTransmission = searchParams.get('cambio') || '';

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    const q = searchParams.get('q');
    const tipo = searchParams.get('tipo');
    const comb = searchParams.get('combustivel');
    const camb = searchParams.get('cambio');

    if (q) query.set('q', q);
    if (tipo) query.set('vehicleType', tipo);
    if (comb) query.set('fuel', comb);
    if (camb) query.set('transmission', camb);

    apiFetch<{ items: VehicleSummary[]; total: number }>(`/vehicles?${query.toString()}`)
      .then((res) => {
        setVehicles(res.items || []);
      })
      .catch((err) => {
        console.error(err);
        setVehicles([]);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.push(`/veiculos?${params.toString()}`);
    });
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/veiculos?${params.toString()}`);
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-6xl">
      {/* Banner Veículos Lajinha */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-10 text-white shadow-lg border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Car className="h-3.5 w-3.5 text-indigo-400" />
            <span>Classificados Automotivos de Lajinha e Região</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Carros, Motos & Máquinas
          </h1>
          <p className="text-sm md:text-base text-slate-300 max-w-xl leading-relaxed">
            Encontre o veículo ideal com segurança. Negocie diretamente com o proprietário na sua cidade sem intermediários.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 pt-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Busque por marca ou modelo (ex: Hilux, Gol, CG)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-background text-foreground border-none shadow-md rounded-xl text-sm"
              />
            </div>
            <Button type="submit" className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
              Buscar
            </Button>
          </form>
        </div>
      </div>

      {/* Barra de Filtros Rápidos por Tipo */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {vehicleTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => updateFilter('tipo', t.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                selectedType === t.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Link
          href="/veiculos/novo"
          className={buttonVariants({
            className: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs gap-1.5',
          })}
        >
          <PlusCircle className="h-4 w-4" />
          Anunciar Veículo
        </Link>
      </div>

      {/* Grid de Veículos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {selectedType
              ? vehicleTypes.find((t) => t.value === selectedType)?.label
              : 'Todos os Veículos'}
          </h2>
          <span className="text-xs text-muted-foreground">
            {vehicles.length} veículo(s) anunciado(s)
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-4/3 w-full bg-muted/60 rounded-xl animate-pulse" />
                <div className="h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
                <div className="h-5 w-1/2 bg-muted/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : vehicles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-muted/20 border border-dashed border-border rounded-2xl p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Car className="h-7 w-7 opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum veículo encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Não encontramos veículos com esses filtros. Seja o primeiro a anunciar seu veículo na região de Lajinha!
            </p>
            <Link
              href="/veiculos/novo"
              className={buttonVariants({ className: 'mt-2 font-semibold bg-indigo-600 text-white' })}
            >
              Publicar Anúncio de Veículo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VeiculosPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VeiculosContent />
    </Suspense>
  );
}
