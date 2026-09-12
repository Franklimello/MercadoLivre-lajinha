'use client';

import React, { Suspense, useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard, type ProductSummary } from '@/components/products/ProductCard';
import { apiFetch } from '@/lib/api';
import { Search, ShoppingBag, Car, Tag, Sparkles, AlertCircle, Loader2, PlusCircle } from 'lucide-react';

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
    <div className="container mx-auto px-4 md:px-8 py-8 space-y-12 max-w-7xl">
      {/* Hero Banner Lajinha */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-600 via-primary to-teal-900 p-8 md:p-14 text-white shadow-2xl">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold backdrop-blur-sm border border-white/10 shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="tracking-wide">O MAIOR MARKETPLACE DA REGIÃO</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
            Compre e Venda <br className="hidden md:block"/>
            <span className="text-amber-300">Perto de Você</span>
          </h1>
          <p className="text-base md:text-lg text-emerald-50 max-w-xl leading-relaxed font-medium">
            Negocie produtos usados, eletrônicos, móveis e veículos <span className="font-bold underline decoration-amber-400 decoration-2 underline-offset-4">sem taxas</span>. Fale direto com seus vizinhos e vendedores locais.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 pt-4 max-w-xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="O que você está procurando?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 bg-background text-foreground border-transparent shadow-lg rounded-2xl text-base focus-visible:ring-4 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
            <Button type="submit" className="h-14 px-8 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 text-lg">
              Buscar
            </Button>
          </form>
        </div>
      </div>

      {/* Seletor de Categorias Horizontal */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-foreground tracking-tight">O que você precisa hoje?</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none snap-x">
          <button
            onClick={() => selectCategory('')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap snap-start shadow-sm border ${
              !selectedCategory
                ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-md'
                : 'bg-card text-foreground/80 hover:bg-muted border-border hover:border-border/80'
            }`}
          >
            Tudo
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.slug)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap snap-start shadow-sm border ${
                selectedCategory === cat.slug
                  ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-md'
                  : 'bg-card text-foreground/80 hover:bg-muted border-border hover:border-border/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="space-y-6">
        <div className="flex items-end justify-between border-b pb-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              {selectedCategory
                ? categories.find((c) => c.slug === selectedCategory)?.name || 'Produtos'
                : 'Adicionados Recentemente'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Encontramos {products.length} {products.length === 1 ? 'anúncio' : 'anúncios'} para você.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-2xl p-2">
                <div className="aspect-[4/3] w-full bg-muted/60 rounded-xl animate-pulse" />
                <div className="h-3 w-1/3 bg-muted/60 rounded animate-pulse" />
                <div className="h-5 w-full bg-muted/60 rounded animate-pulse" />
                <div className="h-6 w-1/2 bg-muted/60 rounded animate-pulse mt-2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 items-stretch">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center space-y-5 bg-card/50 border-2 border-dashed border-border rounded-3xl p-8 max-w-2xl mx-auto shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground/50 shadow-inner">
              <Search className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground tracking-tight">Nenhum anúncio encontrado</h3>
              <p className="text-base text-muted-foreground max-w-md mx-auto">
                Não encontramos produtos para os filtros selecionados. Que tal ser o primeiro a publicar um anúncio aqui?
              </p>
            </div>
            <Link href="/anunciar" className={buttonVariants({ size: "lg", className: "mt-4 font-bold rounded-full px-8 shadow-md hover:shadow-lg transition-all" })}>
              <PlusCircle className="mr-2 h-5 w-5" />
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
