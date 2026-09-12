'use client';

import React, { Suspense, useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard, type ProductSummary } from '@/components/products/ProductCard';
import { apiFetch } from '@/lib/api';
import { Search, ShoppingBag, Car, Tag, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  _count?: { products: number };
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [isPending, startTransition] = useTransition();

  const selectedCategory = searchParams.get('categoria') || '';

  // Carrega categorias
  useEffect(() => {
    apiFetch<Category[]>('/products/categories')
      .then((data) => setCategories(data))
      .catch((err) => {
        console.error('Erro ao buscar categorias:', err);
        // Fallback local se backend ainda não estiver populado
        setCategories([
          { id: '1', name: 'Todos', slug: '' },
          { id: '2', name: 'Celulares', slug: 'celulares-e-telefonia' },
          { id: '3', name: 'Eletrônicos', slug: 'eletronicos-e-audio' },
          { id: '4', name: 'Informática', slug: 'informatica-e-acessorios' },
          { id: '5', name: 'Móveis', slug: 'moveis-e-decoracao' },
          { id: '6', name: 'Ferramentas', slug: 'ferramentas-e-construcao' },
          { id: '7', name: 'Eletrodomésticos', slug: 'eletrodomesticos' },
        ]);
      });
  }, []);

  // Carrega produtos com base nos filtros
  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    const q = searchParams.get('q');
    const cat = searchParams.get('categoria');

    if (q) query.set('q', q);
    if (cat) query.set('category', cat);

    apiFetch<{ items: ProductSummary[]; total: number }>(`/products?${query.toString()}`)
      .then((res) => {
        setProducts(res.items || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar produtos:', err);
        setProducts([]);
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
    params.delete('page');
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const selectCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('categoria', slug);
    } else {
      params.delete('categoria');
    }
    params.delete('page');
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-6xl">
      {/* Hero Banner Lajinha */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-700 via-teal-800 to-emerald-950 p-6 md:p-10 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>O maior marketplace de Lajinha e região</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Compre e Venda Perto de Você
          </h1>
          <p className="text-sm md:text-base text-emerald-100 max-w-xl leading-relaxed">
            Negocie produtos usados, eletrônicos, móveis e veículos sem taxas. Fale direto com vizinhos e vendedores locais pelo chat ou WhatsApp.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2 pt-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="O que você está procurando?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-background text-foreground border-none shadow-md rounded-xl text-sm"
              />
            </div>
            <Button type="submit" className="h-11 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md">
              Buscar
            </Button>
          </form>
        </div>
      </div>

      {/* Seletor de Categorias Horizontal */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Explorar Categorias</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => selectCategory('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              !selectedCategory
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/80 text-muted-foreground hover:bg-muted'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.name || 'Produtos'
              : 'Anúncios Recentes'}
          </h2>
          <span className="text-xs text-muted-foreground">
            {products.length} anúncio(s) encontrado(s)
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
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-muted/20 border border-dashed border-border rounded-2xl p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ShoppingBag className="h-7 w-7 opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum anúncio encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Não encontramos produtos para os filtros selecionados. Que tal ser o primeiro a publicar um anúncio aqui?
            </p>
            <Link href="/anunciar" className={buttonVariants({ className: "mt-2 font-semibold" })}>
              Publicar Anúncio Grátis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
