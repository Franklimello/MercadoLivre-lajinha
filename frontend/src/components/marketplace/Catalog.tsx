"use client";
import { useRef, useState } from "react";
import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ProductCard } from "@/components/products/ProductCard";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorState, EmptyState, ListingSkeleton } from "./Feedback";
import { CatalogFilters } from "./CatalogFilters";
import { MotionSheet } from "@/components/motion/MotionSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  catalogApiQuery,
  catalogHref,
  productFilterKeys,
  vehicleFilterKeys,
} from "@/lib/catalog";
import { useApiResource } from "@/hooks/useApiResource";
import {
  vehicleTypes,
  type Category,
  type Paginated,
  type VehicleSummary,
} from "@/lib/marketplace";
import { fadeRise, motionTokens, staggerGrid } from "@/lib/motion";

function CategoryLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="category-tab"
    >
      <span>{children}</span>
      {active && (
        <motion.span
          layoutId="catalog-category-indicator"
          className="category-indicator"
          transition={motionTokens.spring.snappy}
        />
      )}
    </Link>
  );
}

const sortOptions = [
  { value: "newest", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
];

function SortMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = sortOptions.find((option) => option.value === value);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="sort-trigger"
        aria-label={`Ordenar anúncios: ${selected?.label}`}
      >
        <span>{selected?.label}</span>
        <motion.span
          className="inline-flex"
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={motionTokens.spring.snappy}
        >
          <ChevronDown size={16} />
        </motion.span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: motionTokens.duration.quick,
            ease: motionTokens.ease.standard,
          }}
        >
          {sortOptions.map((option, index) => (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.035,
                duration: motionTokens.duration.quick,
              }}
            >
              <DropdownMenuItem
                role="menuitemradio"
                aria-checked={value === option.value}
                onClick={() => onChange(option.value)}
              >
                <span>{option.label}</span>
                <span className="ml-auto size-4">
                  <AnimatePresence initial={false}>
                    {value === option.value && (
                      <motion.span
                        className="inline-flex"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={motionTokens.spring.snappy}
                      >
                        <Check size={16} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </DropdownMenuItem>
            </motion.div>
          ))}
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Catalog({ vehicles = false }: { vehicles?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const base = vehicles ? "/veiculos" : "/";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterActions = useRef<DialogPrimitive.Root.Actions | null>(null);
  const category = params.get(vehicles ? "tipo" : "categoria") || "";
  const term = params.get("q") || "";
  const filters = vehicles ? vehicleFilterKeys : productFilterKeys;
  const filterCount = filters.filter((key) => params.get(key)).length;
  const query = catalogApiQuery(params, vehicles);
  const page = Number(query.get("page"));
  const categories = useApiResource<Category[]>(
    vehicles ? null : "/products/categories",
  );
  const resource = useApiResource<Paginated<VehicleSummary>>(
    `${vehicles ? "/vehicles" : "/products"}?${query}`,
  );
  const { loading, reload, refreshing } = resource;
  const data = resource.data ?? resource.previousData;
  const error = resource.error ?? resource.previousError;
  function href(values: Record<string, string>) {
    return catalogHref(base, params, values);
  }
  const update = (values: Record<string, string>) => {
    router.push(href(values), { scroll: false });
    filterActions.current?.close();
  };
  const categoryItems = vehicles
    ? vehicleTypes.map((t) => ({ slug: t.value, name: t.label }))
    : (categories.data || []).filter((c) => c.slug !== "veiculos");
  const selectedLabel = categoryItems.find((c) => c.slug === category)?.name;
  const filtered = !!term || !!category || !!filterCount;
  return (
    <div className="shell">
      <div className="catalog-intro">
        <div>
          <p className="eyebrow mb-2">
            {vehicles
              ? "Classificados de veículos"
              : "O comércio da nossa região"}
          </p>
          <h1 className="page-title">
            {vehicles
              ? "Seu próximo veículo pode estar por aqui."
              : "Usados perto de você."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Compre de quem está perto. Combine direto com o vendedor.
          </p>
          {vehicles && (
            <Link
              href="/veiculos/novo"
              className="text-link mt-2 inline-flex min-h-11 items-center gap-2 text-sm lg:hidden"
            >
              <Plus size={16} /> Anunciar veículo
            </Link>
          )}
        </div>
        <Link
          href={vehicles ? "/veiculos/novo" : "/anunciar"}
          className="text-link hidden shrink-0 items-center gap-2 text-sm lg:inline-flex"
        >
          <Plus size={17} />
          {vehicles ? "Anunciar veículo" : "Vender um produto"}
        </Link>
      </div>
      <nav
        className="category-nav"
        aria-label={vehicles ? "Tipos de veículo" : "Categorias"}
      >
        <CategoryLink
          href={href({ [vehicles ? "tipo" : "categoria"]: "" })}
          active={!category}
        >
          Todos {vehicles ? "os veículos" : "os produtos"}
        </CategoryLink>
        {categoryItems.map((cat) => (
          <CategoryLink
            key={cat.slug}
            href={href({ [vehicles ? "tipo" : "categoria"]: cat.slug })}
            active={category === cat.slug}
          >
            {cat.name}
          </CategoryLink>
        ))}
        {categories.loading && (
          <span
            className="skeleton my-4 h-4 w-56 shrink-0"
            aria-label="Carregando categorias"
          />
        )}
      </nav>
      {categories.error && (
        <div role="status" className="flex items-center gap-2 py-3 caption">
          Categorias indisponíveis.
          <button className="text-link min-h-11" onClick={categories.reload}>
            Tentar novamente
          </button>
        </div>
      )}
      <div className="catalog-layout">
        <aside className="filter-sidebar" aria-label="Filtros de busca">
          <h2 className="section-title mb-6">Filtrar</h2>
          <CatalogFilters
            key={params.toString()}
            vehicles={vehicles}
            params={params}
            apply={update}
          />
        </aside>
        <section className="min-w-0" aria-label="Resultados">
          <div className="results-toolbar">
            <div aria-live="polite">
              <h2 className="section-title">
                {term
                  ? `Resultados para “${term}”`
                  : selectedLabel || "Anúncios recentes"}
              </h2>
              <p className="caption mt-1">
                {loading
                  ? resource.previousData
                    ? "Atualizando a busca. Mostrando os resultados anteriores por enquanto."
                    : "Buscando anúncios…"
                  : error
                    ? "Os anúncios não carregaram."
                    : `${data?.total || 0} ${data?.total === 1 ? "anúncio" : "anúncios"}`}
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
              <motion.div className="lg:hidden" whileTap={{ scale: 0.96 }}>
                <Button variant="outline" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal />
                  Filtros{filterCount ? ` (${filterCount})` : ""}
                </Button>
              </motion.div>
              <SortMenu
                value={query.get("sort") || "newest"}
                onChange={(sort) => update({ sort })}
              />
            </div>
          </div>
          {filtered && (
            <div className="mb-5 flex items-center gap-2 caption">
              <span>Busca filtrada</span>
              <Link
                href={base}
                className="text-link inline-flex min-h-11 items-center gap-1"
              >
                Limpar tudo
                <X size={14} />
              </Link>
            </div>
          )}
          {error && data && (
            <p className="caption mb-4" role="status">
              Não foi possível atualizar os anúncios. Estas informações podem
              estar desatualizadas.{" "}
              <button
                onClick={reload}
                disabled={refreshing}
                className="text-link min-h-11"
              >
                {refreshing ? "Atualizando…" : "Tentar novamente"}
              </button>
            </p>
          )}
          <div className="catalog-results" aria-busy={loading || refreshing}>
            <AnimatePresence mode="popLayout" initial={false}>
              {loading && !data && !error ? (
                <motion.div
                  key="loading"
                  variants={fadeRise}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <ListingSkeleton />
                </motion.div>
              ) : error && !data ? (
                <motion.div
                  key="error"
                  variants={fadeRise}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <ErrorState
                    retry={reload}
                    busy={refreshing}
                    title="Os anúncios não carregaram"
                  />
                </motion.div>
              ) : data?.items.length ? (
                <motion.div
                  key="results"
                  variants={fadeRise}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div
                    className="listing-grid"
                    variants={{
                      ...staggerGrid,
                      updating: { opacity: 0.55 },
                      ready: { opacity: 1 },
                    }}
                    initial="hidden"
                    animate={["visible", loading ? "updating" : "ready"]}
                    transition={{ duration: motionTokens.duration.quick }}
                    layout
                  >
                    <AnimatePresence mode="popLayout">
                      {data.items.map((item, index) =>
                        vehicles ? (
                          <VehicleCard key={item.id} vehicle={item} />
                        ) : (
                          <ProductCard
                            key={item.id}
                            product={item}
                            eager={index === 0}
                          />
                        ),
                      )}
                    </AnimatePresence>
                  </motion.div>
                  {data.totalPages > 1 && (
                    <nav className="pagination" aria-label="Paginação">
                      {page > 1 ? (
                        <Link
                          href={href({ page: String(page - 1) })}
                          className={buttonVariants({
                            variant: "outline",
                            size: "icon",
                          })}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft />
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          disabled
                          aria-label="Página anterior"
                        >
                          <ChevronLeft />
                        </Button>
                      )}
                      <span className="caption">
                        Página {page} de {data.totalPages}
                      </span>
                      {page < data.totalPages ? (
                        <Link
                          href={href({ page: String(page + 1) })}
                          className={buttonVariants({
                            variant: "outline",
                            size: "icon",
                          })}
                          aria-label="Próxima página"
                        >
                          <ChevronRight />
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          disabled
                          aria-label="Próxima página"
                        >
                          <ChevronRight />
                        </Button>
                      )}
                    </nav>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  variants={fadeRise}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <EmptyState
                    title={
                      filtered
                        ? "Nenhum anúncio com esses filtros"
                        : "Ainda não há anúncios por aqui"
                    }
                    description={
                      filtered
                        ? "Tente outro termo ou retire alguns filtros para ampliar a busca."
                        : "Tem algo que já não usa? Publique e converse com pessoas da região."
                    }
                    href={
                      filtered
                        ? base
                        : vehicles
                          ? "/veiculos/novo"
                          : "/anunciar"
                    }
                    action={filtered ? "Limpar busca" : "Anunciar produto"}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
      <MotionSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        actionsRef={filterActions}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={filtersOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={motionTokens.spring.sheet}
          className="space-y-6"
        >
          <DialogHeader>
            <DialogTitle className="section-title">
              Filtrar anúncios
            </DialogTitle>
            <DialogDescription>
              Ajuste os filtros e aplique à busca.
            </DialogDescription>
          </DialogHeader>
          <CatalogFilters
            key={params.toString()}
            vehicles={vehicles}
            params={params}
            apply={update}
          />
        </motion.div>
      </MotionSheet>
    </div>
  );
}
