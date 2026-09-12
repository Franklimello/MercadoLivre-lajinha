"use client";
import { useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { PageLoading } from "@/components/marketplace/Feedback";
import { ListingImage } from "@/components/marketplace/ListingImage";
import {
  ImageKitUploader,
  type UploadedImage,
} from "@/components/upload/ImageKitUploader";
import { WhatsAppPromptModal } from "@/components/products/WhatsAppPromptModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  conditions,
  vehicleTypes,
  fuels,
  transmissions,
  states,
  formatPrice,
  errorMessage,
  type Category,
} from "@/lib/marketplace";
import { toast } from "sonner";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion";
import { useListingDraft } from "@/hooks/useListingDraft";
import { DraftNotice } from "./DraftNotice";
import { useOnline } from "@/hooks/useOnline";

type Fields = {
  title: string;
  description: string;
  price: string;
  stock: string;
  condition: string;
  categoryId: string;
  city: string;
  state: string;
  vehicleType: string;
  brand: string;
  model: string;
  year: string;
  mileage: string;
  color: string;
  fuel: string;
  transmission: string;
  engine: string;
  bodyType: string;
  plateEnd: string;
};
const initial: Fields = {
  title: "",
  description: "",
  price: "",
  stock: "1",
  condition: "GOOD",
  categoryId: "",
  city: "Lajinha",
  state: "MG",
  vehicleType: "CAR",
  brand: "",
  model: "",
  year: "",
  mileage: "",
  color: "",
  fuel: "Flex",
  transmission: "Manual",
  engine: "",
  bodyType: "",
  plateEnd: "",
};

export function ListingForm({ vehicles = false }: { vehicles?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user)
    return (
      <LoginPanel
        title={
          vehicles ? "Entre para anunciar seu veículo" : "Entre para anunciar"
        }
        description="Publique fotos, conte os detalhes e converse com quem se interessar."
      />
    );
  return (
    <Editor
      key={`${user.id}:${vehicles ? "vehicle" : "product"}`}
      vehicles={vehicles}
    />
  );
}
function Editor({ vehicles }: { vehicles: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const categories = useApiResource<Category[]>("/products/categories");
  const [values, setValues] = useState<Fields>(initial);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requirements, setRequirements] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const online = useOnline();
  const draft = useListingDraft<Fields>(
    `${user!.id}:create:${vehicles ? "vehicle" : "product"}`,
    values,
    images,
    step,
    (saved) => {
      setValues({ ...initial, ...saved.values });
      setImages(saved.images);
      setStep(saved.step);
    },
  );
  const steps = vehicles
    ? ["Fotos", "Veículo", "Detalhes", "Revisão"]
    : ["Fotos", "Detalhes", "Revisão"];
  const review = step === steps.length - 1;
  const details = step === steps.length - 2;
  const vehicleCategory = categories.data?.find((c) => c.slug === "veiculos");
  const title = vehicles
    ? `${values.brand} ${values.model} ${values.engine} ${values.year}`.trim()
    : values.title.trim();
  function change(name: keyof Fields, value: string) {
    draft.markDirty();
    setValues((prev) => ({ ...prev, [name]: value }));
  }
  function input(
    name: keyof Fields,
    label: string,
    props: ComponentProps<"input"> = {},
  ) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <Input
          id={name}
          name={name}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
          required
          {...props}
        />
      </div>
    );
  }
  function select(
    name: keyof Fields,
    label: string,
    options: { value: string; label: string }[],
    required = true,
  ) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <select
          id={name}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
          required={required}
          className="form-control"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  function go(next: number) {
    draft.markDirty();
    setError("");
    setDirection(next > step ? 1 : -1);
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || submitting) return;
    if (!draft.ready || draft.available) return;
    setError("");
    if (!images.length) {
      setError("Adicione pelo menos uma foto para continuar.");
      return;
    }
    if (vehicles && step === 1 && title.length > 120) {
      setError(
        "Reduza a marca, o modelo ou o motor. O título pode ter até 120 caracteres.",
      );
      return;
    }
    if (details && (!categories.data || (vehicles && !vehicleCategory))) {
      setError("Aguarde as categorias ou tente carregá-las novamente.");
      return;
    }
    if (!review) {
      go(step + 1);
      return;
    }
    if (!online) {
      setError(
        "Seu anúncio permanece neste dispositivo. Conecte-se e revise os dados antes de publicar.",
      );
      return;
    }
    if (!user?.whatsapp || !user.notificationsEnabled) {
      setRequirements(true);
      return;
    }
    setSubmitting(true);
    try {
      const common = {
        title,
        description: values.description.trim(),
        price: Number(values.price.replace(",", ".")),
        condition: values.condition,
        categoryId: vehicles ? vehicleCategory?.id : values.categoryId,
        images,
        city: values.city.trim(),
        state: values.state,
      };
      const payload = vehicles
        ? {
            ...common,
            vehicleType: values.vehicleType,
            brand: values.brand.trim(),
            model: values.model.trim(),
            year: Number(values.year),
            mileage: Number(values.mileage),
            color: values.color.trim(),
            fuel: values.fuel,
            transmission: values.transmission,
            engine: values.engine.trim(),
            bodyType: values.bodyType.trim() || undefined,
            plateEnd: values.plateEnd || undefined,
          }
        : { ...common, stock: Number(values.stock) };
      const created = await apiFetch<{ id: string }>(
        vehicles ? "/vehicles" : "/products",
        { method: "POST", body: JSON.stringify(payload) },
      );
      toast.success("Anúncio publicado.");
      await draft.clear().catch(() => undefined);
      router.push(`/${vehicles ? "veiculos" : "produtos"}/${created.id}`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <motion.div
      className="shell form-shell page !pt-4"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.base,
        ease: motionTokens.ease.standard,
      }}
    >
      <Link href={vehicles ? "/veiculos" : "/"} className="back-link">
        <ArrowLeft size={16} />
        Voltar aos anúncios
      </Link>
      <div className="form-heading">
        <div>
          <p className="eyebrow mb-2">Vender por aqui</p>
          <h1 ref={heading} tabIndex={-1} className="page-title">
            {vehicles ? "Anunciar veículo" : "Anunciar produto"}
          </h1>
          <p className="caption mt-2">
            Fotos, detalhes e pronto. Revise tudo antes de publicar.
          </p>
        </div>
      </div>
      <nav aria-label="Etapas da publicação">
        <ol className="form-stepper">
          {steps.map((label, i) => (
            <li
              key={label}
              data-current={i <= step}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="mr-1">{i + 1}.</span>
              {label}
            </li>
          ))}
        </ol>
      </nav>
      <DraftNotice {...draft} />
      <form
        onSubmit={submit}
        onInvalid={(event) => {
          (event.target as HTMLElement)
            .closest("details")
            ?.setAttribute("open", "");
        }}
      >
        <fieldset
          className="min-w-0"
          disabled={!draft.ready || !!draft.available}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, x: reducedMotion ? 0 : direction * 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: motionTokens.duration.base,
              ease: motionTokens.ease.standard,
            }}
          >
            {step === 0 && (
              <div className="form-section">
                <ImageKitUploader
                  images={images}
                  onChange={(next) => {
                    draft.markDirty();
                    setImages(next);
                  }}
                  onUploadingChange={setUploading}
                />
                {!vehicles &&
                  input("title", "O que você está vendendo?", {
                    placeholder: "Ex.: Samsung Galaxy A54 128 GB",
                    minLength: 3,
                    maxLength: 120,
                  })}
                <Link
                  href={vehicles ? "/anunciar" : "/veiculos/novo"}
                  className="text-link text-sm"
                >
                  {vehicles
                    ? "Quero anunciar um produto"
                    : "É um veículo? Anuncie aqui"}
                </Link>
              </div>
            )}
            {vehicles && step === 1 && (
              <div className="form-section">
                <h2 className="section-title">Sobre o veículo</h2>
                {select("vehicleType", "Tipo de veículo", vehicleTypes)}
                <div className="grid gap-5 sm:grid-cols-2">
                  {input("brand", "Marca", {
                    placeholder: "Ex.: Fiat",
                    maxLength: 35,
                  })}
                  {input("model", "Modelo / versão", {
                    placeholder: "Ex.: Strada Freedom",
                    maxLength: 55,
                  })}
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {input("year", "Ano", {
                    type: "number",
                    inputMode: "numeric",
                    min: 1950,
                    max: new Date().getFullYear() + 1,
                    placeholder: "Ex.: 2020",
                  })}
                  {input("mileage", "Quilometragem (km)", {
                    type: "number",
                    inputMode: "numeric",
                    min: 0,
                    placeholder: "Ex.: 45000",
                  })}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {select(
                    "transmission",
                    "Câmbio",
                    transmissions.map((v) => ({ value: v, label: v })),
                  )}
                  {select(
                    "fuel",
                    "Combustível",
                    fuels.map((v) => ({ value: v, label: v })),
                  )}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {input("engine", "Motor / cilindrada", {
                    placeholder: "Ex.: 1.0 ou 160 cc",
                    maxLength: 20,
                  })}
                  {input("color", "Cor", { placeholder: "Ex.: Prata" })}
                </div>
                <details className="border-t pt-4">
                  <summary className="min-h-11 text-sm font-medium">
                    Mais detalhes (opcional)
                  </summary>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    {input("bodyType", "Carroceria", {
                      required: false,
                      placeholder: "Ex.: Hatch, sedan, picape",
                    })}
                    {input("plateEnd", "Final da placa", {
                      required: false,
                      pattern: "[0-9]",
                      inputMode: "numeric",
                      maxLength: 1,
                      placeholder: "Ex.: 7",
                    })}
                  </div>
                </details>
              </div>
            )}
            {details && (
              <div className="form-section">
                <h2 className="section-title">
                  {vehicles ? "Preço e descrição" : "Detalhes do produto"}
                </h2>
                {categories.error && (
                  <div role="alert" className="inline-error">
                    Não foi possível carregar as categorias.{" "}
                    <button
                      type="button"
                      onClick={categories.reload}
                      className="underline min-h-11"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}
                {vehicles && categories.data && !vehicleCategory && (
                  <p role="alert" className="inline-error">
                    A categoria de veículos não está disponível. Tente novamente
                    mais tarde.
                  </p>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  {!vehicles &&
                    select("categoryId", "Categoria", [
                      {
                        value: "",
                        label: categories.loading
                          ? "Carregando…"
                          : "Selecione uma categoria",
                      },
                      ...(categories.data || [])
                        .filter((c) => c.slug !== "veiculos")
                        .map((c) => ({ value: c.id, label: c.name })),
                    ])}
                  {select(
                    "condition",
                    "Estado de conservação",
                    Object.entries(conditions).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  )}
                  {input("price", "Preço (R$)", {
                    type: "number",
                    inputMode: "decimal",
                    min: 0.01,
                    step: ".01",
                    placeholder: "0,00",
                  })}
                </div>
                {!vehicles && (
                  <details>
                    <summary className="min-h-11 text-sm text-primary">
                      Tenho mais de uma unidade
                    </summary>
                    <div className="mt-3 max-w-xs">
                      {input("stock", "Quantidade disponível", {
                        type: "number",
                        inputMode: "numeric",
                        min: 1,
                      })}
                    </div>
                  </details>
                )}
                <div className="field">
                  <label htmlFor="description">Descrição</label>
                  <Textarea
                    id="description"
                    rows={5}
                    required
                    minLength={10}
                    value={values.description}
                    onChange={(e) => change("description", e.target.value)}
                    placeholder={
                      vehicles
                        ? "Conte sobre revisões, documentação, pneus e detalhes que o comprador deve saber."
                        : "Conte o tempo de uso, o estado do produto e o que acompanha. Mencione também marcas ou defeitos."
                    }
                  />
                  <p className="caption">
                    Pelo menos 10 caracteres. Uma descrição clara evita dúvidas.
                  </p>
                </div>
                <fieldset className="border-t pt-6">
                  <legend className="section-title pt-6">
                    Onde está o {vehicles ? "veículo" : "produto"}?
                  </legend>
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_100px] gap-4">
                    {input("city", "Cidade", {
                      autoComplete: "address-level2",
                      maxLength: 80,
                    })}
                    {select(
                      "state",
                      "Estado",
                      states.map((v) => ({ value: v, label: v })),
                    )}
                  </div>
                  <p className="caption mt-3">
                    Só a cidade e o estado aparecem no anúncio.
                  </p>
                </fieldset>
              </div>
            )}
            {review && (
              <div className="form-section">
                <div>
                  <h2 className="section-title">Tudo certo para publicar?</h2>
                  <p className="caption mt-2">
                    Confira como seu anúncio vai aparecer.
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
                  <div className="listing-photo">
                    <ListingImage
                      src={images[0]?.url}
                      alt={title}
                      sizes="250px"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="detail-price">{formatPrice(values.price)}</p>
                    <h3 className="text-xl">{title}</h3>
                    <p className="caption">
                      {conditions[values.condition]}
                      {!vehicles && ` · ${values.stock} unidade(s)`}
                    </p>
                    <p className="flex items-center gap-1 text-sm">
                      <MapPin size={15} />
                      {values.city} · {values.state}
                    </p>
                    <p className="caption">
                      {images.length} foto(s) ·{" "}
                      {vehicles
                        ? "Veículos"
                        : categories.data?.find(
                            (c) => c.id === values.categoryId,
                          )?.name}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-5">
                  <h3 className="mb-2 font-medium">Descrição</h3>
                  <p className="whitespace-pre-line break-words text-sm leading-6">
                    {values.description}
                  </p>
                </div>
                {vehicles && (
                  <dl className="spec-grid border-t pt-5">
                    {[
                      ["Ano", values.year],
                      ["Quilometragem", `${values.mileage} km`],
                      ["Câmbio", values.transmission],
                      ["Combustível", values.fuel],
                      ["Motor", values.engine],
                      ["Cor", values.color],
                      ["Carroceria", values.bodyType],
                      ["Final da placa", values.plateEnd],
                    ]
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                )}
                <p className="caption">
                  Seu WhatsApp só é compartilhado com o comprador quando uma
                  negociação é iniciada.
                </p>
              </div>
            )}
          </motion.div>
          {error && (
            <p role="alert" className="inline-error mt-6">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0 || submitting || uploading}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft />
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={
                uploading ||
                submitting ||
                (details && categories.loading) ||
                (review && !online)
              }
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : review ? (
                <Check />
              ) : null}
              {submitting
                ? "Publicando…"
                : review
                  ? "Publicar anúncio"
                  : "Continuar"}
              {!review && <ArrowRight />}
            </Button>
          </div>
        </fieldset>
      </form>
      <WhatsAppPromptModal
        open={requirements}
        onOpenChange={setRequirements}
        onCompleted={() =>
          toast.success("Dados salvos. Você já pode publicar.")
        }
      />
    </motion.div>
  );
}
