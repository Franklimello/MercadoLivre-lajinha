"use client";
import { useState, ViewTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  MessageSquare,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/marketplace/Feedback";
import { ListingImage } from "@/components/marketplace/ListingImage";
import { useListingTransition } from "@/components/motion/ListingTransition";
import { useApiResource } from "@/hooks/useApiResource";
import { useAuth } from "@/contexts/AuthContext";
import { useOnline } from "@/hooks/useOnline";
import { apiFetch } from "@/lib/api";
import {
  conditions,
  formatDate,
  formatPrice,
  errorMessage,
  type ListingDetail as Listing,
} from "@/lib/marketplace";
import { toast } from "sonner";
import { motion } from "motion/react";
import { fadeRise } from "@/lib/motion";

const detailReveal = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065, delayChildren: 0.04 } },
};

export function ListingDetail({ vehicles = false }: { vehicles?: boolean }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const online = useOnline();
  const {
    data: item,
    loading,
    error,
    reload,
    refreshing,
  } = useApiResource<Listing>(
    `${vehicles ? "/vehicles" : "/products"}/${params.id}`,
  );
  const [busy, setBusy] = useState(false);
  const base = vehicles ? "/veiculos" : "/";
  const { preview: selectedPreview } = useListingTransition();
  const preview =
    selectedPreview?.id === params.id &&
    selectedPreview.kind === (vehicles ? "vehicle" : "product")
      ? selectedPreview
      : null;
  if (loading)
    return (
      <div
        className="shell page !pt-4"
        role="status"
        aria-label="Carregando anúncio"
      >
        <div className="skeleton my-3 h-5 w-40" />
        <div className="detail-layout">
          {preview ? (
            <ViewTransition
              name={`listing-image-${preview.kind}-${preview.id}`}
              share="listing-image-morph"
              default="none"
            >
              <div className="gallery-stage aspect-[4/3]">
                <ListingImage
                  src={preview.cover}
                  alt={preview.title}
                  contain
                  eager
                  sizes="(max-width: 1023px) 95vw, 700px"
                />
              </div>
            </ViewTransition>
          ) : (
            <div className="skeleton aspect-[4/3]" />
          )}
          <div className="space-y-6">
            <div className="skeleton h-10 w-1/2" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
        <span className="sr-only">Carregando informações do anúncio…</span>
      </div>
    );
  if (!item)
    return (
      <div className="shell page">
        <Link
          href={base}
          className="back-link"
          transitionTypes={["listing-back"]}
        >
          <ArrowLeft size={16} />
          Voltar aos anúncios
        </Link>
        <ErrorState
          retry={reload}
          busy={refreshing}
          title="Não foi possível abrir este anúncio"
          description="O anúncio pode ter sido removido ou o serviço está indisponível. Tente novamente ou volte à busca."
        />
      </div>
    );
  const unavailable = item.status !== "ACTIVE" || item.stock <= 0;
  const owner = user?.id === item.sellerId;
  const v = item.vehicle;
  const specs = v
    ? [
        ["Marca", v.brand],
        ["Modelo", v.model],
        ["Ano", String(v.year)],
        ["Quilometragem", `${v.mileage.toLocaleString("pt-BR")} km`],
        ["Câmbio", v.transmission],
        ["Combustível", v.fuel],
        ["Motor", v.engine],
        ["Cor", v.color],
        ["Carroceria", v.bodyType],
        ["Final da placa", v.plateEnd],
      ].filter(([, value]) => value)
    : [];
  async function contact() {
    if (!item) return;
    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(`/${vehicles ? "veiculos" : "produtos"}/${item.id}`)}`,
      );
      return;
    }
    if (owner || unavailable || !online || error) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ id: string }>("/negotiations", {
        method: "POST",
        body: JSON.stringify({ productId: item.id }),
      });
      router.push(`/negociacoes/${result.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <motion.article
      className="shell page !pt-4"
      initial="hidden"
      animate="visible"
      variants={detailReveal}
    >
      <motion.div variants={fadeRise}>
        {(error || !online) && (
          <p role="status" className="caption mb-3">
            Não foi possível confirmar preço e disponibilidade. As informações
            podem estar desatualizadas.{" "}
            <button
              onClick={reload}
              disabled={!online || refreshing}
              className="text-link min-h-11"
            >
              Atualizar anúncio
            </button>
          </p>
        )}
        <Link
          href={base}
          className="back-link"
          transitionTypes={["listing-back"]}
        >
          <ArrowLeft size={16} />
          {vehicles ? "Voltar para veículos" : "Voltar aos produtos"}
        </Link>
      </motion.div>
      <div className="detail-layout">
        <motion.div
          className="min-w-0"
          variants={preview ? undefined : fadeRise}
        >
          <ProductCarousel
            images={item.images}
            title={item.title}
            listingId={item.id}
            vehicles={vehicles}
          />
        </motion.div>
        <motion.div className="detail-summary" variants={detailReveal}>
          <motion.p className="eyebrow" variants={fadeRise}>
            {vehicles ? v?.brand : item.category?.name || "Produto"}
          </motion.p>
          <motion.div variants={fadeRise}>
            <p className="detail-price">{formatPrice(item.price)}</p>
            <h1 className="mt-3 text-2xl leading-snug font-medium tracking-tight">
              {item.title}
            </h1>
          </motion.div>
          <motion.div className="space-y-2" variants={fadeRise}>
            <p className="flex items-center gap-2 text-sm">
              <MapPin size={16} aria-hidden="true" />
              {item.city} · {item.state}
            </p>
            <p className="caption">Publicado em {formatDate(item.createdAt)}</p>
          </motion.div>
          <motion.dl
            className="grid grid-cols-2 gap-4 border-y py-4"
            variants={fadeRise}
          >
            <div>
              <dt className="caption">Condição</dt>
              <dd className="mt-1 text-sm font-medium">
                {conditions[item.condition] || item.condition}
              </dd>
            </div>
            <div>
              <dt className="caption">
                {vehicles ? "Ano · km" : "Disponibilidade"}
              </dt>
              <dd className="mt-1 text-sm">
                {vehicles
                  ? `${v?.year} · ${v?.mileage.toLocaleString("pt-BR")} km`
                  : `${item.stock} ${item.stock === 1 ? "unidade" : "unidades"}`}
              </dd>
            </div>
          </motion.dl>
          {unavailable && (
            <motion.p
              role="status"
              className="text-sm font-medium"
              variants={fadeRise}
            >
              {item.status === "SOLD"
                ? "Este anúncio foi vendido."
                : "Este anúncio está indisponível."}
            </motion.p>
          )}
          <motion.div className="flex items-center gap-3" variants={fadeRise}>
            <Avatar className="size-12">
              <AvatarImage src={item.seller.avatarUrl || ""} alt="" />
              <AvatarFallback>
                {item.seller.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="caption">Anunciado por</p>
              <p className="font-medium">{item.seller.name}</p>
              <p className="caption">
                Membro desde{" "}
                {new Date(item.seller.createdAt).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </motion.div>
          <motion.div className="contact-bar" variants={fadeRise}>
            {owner ? (
              <Link
                href="/conta"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                Gerenciar meu anúncio
              </Link>
            ) : (
              <motion.div whileTap={{ scale: unavailable ? 1 : 0.985 }}>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={
                    busy || unavailable || authLoading || !online || !!error
                  }
                  onClick={contact}
                >
                  {busy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <MessageSquare />
                  )}
                  {busy
                    ? "Abrindo conversa…"
                    : unavailable
                      ? "Anúncio indisponível"
                      : "Conversar com vendedor"}
                </Button>
              </motion.div>
            )}
            <p className="caption mt-3">
              Combine o pagamento e a retirada diretamente com o vendedor.
            </p>
          </motion.div>
        </motion.div>
      </div>
      <motion.div className="mt-8 max-w-3xl" variants={detailReveal}>
        <motion.section className="detail-section" variants={fadeRise}>
          <h2 className="section-title mb-4">Descrição</h2>
          <p className="whitespace-pre-line break-words leading-7">
            {item.description}
          </p>
        </motion.section>
        {!!specs.length && (
          <motion.section className="detail-section" variants={fadeRise}>
            <h2 className="section-title mb-5">Detalhes do veículo</h2>
            <dl className="spec-grid">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </motion.section>
        )}
        <motion.aside className="detail-section flex gap-3" variants={fadeRise}>
          <ShieldCheck size={20} className="shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-medium">Na hora de negociar</h2>
            <p className="caption mt-1">
              Confira o produto antes de pagar e combine a entrega em um local
              público. O Mercado Livre Lajinha não recebe pagamentos pela
              compra.
            </p>
          </div>
        </motion.aside>
      </motion.div>
    </motion.article>
  );
}
