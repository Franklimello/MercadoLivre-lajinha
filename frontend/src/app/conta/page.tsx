"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pause,
  Play,
  Check,
  Trash2,
  Pencil,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PageLoading,
  ErrorState,
  EmptyState,
} from "@/components/marketplace/Feedback";
import { ListingImage } from "@/components/marketplace/ListingImage";
import { AccountSettings } from "@/components/account/AccountSettings";
import {
  EditListing,
  type EditableListing,
} from "@/components/account/EditListing";
import { apiFetch } from "@/lib/api";
import {
  formatDate,
  formatPrice,
  productStatuses,
  errorMessage,
  listingHref,
  type ListingPhoto,
} from "@/lib/marketplace";
import { toast } from "sonner";
interface MyListing extends EditableListing {
  status: "ACTIVE" | "PAUSED" | "SOLD";
  type: "PRODUCT" | "VEHICLE";
  createdAt: string;
  images: ListingPhoto[];
  category: { name: string };
  _count: { negotiations: number };
}
export default function AccountPage() {
  const { user, loading } = useAuth();
  const products = useApiResource<MyListing[]>(
    user ? "/products/my/all" : null,
  );
  const [tab, setTab] = useState("ALL");
  const [busy, setBusy] = useState<string>();
  const [editing, setEditing] = useState<MyListing>();
  const [deleting, setDeleting] = useState<MyListing>();
  const [deleteError, setDeleteError] = useState("");
  async function status(id: string, status: string) {
    setBusy(id);
    try {
      await apiFetch(`/products/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Anúncio atualizado.");
      products.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(undefined);
    }
  }
  if (loading) return <PageLoading />;
  if (!user)
    return (
      <LoginPanel
        title="Sua conta, seus anúncios"
        description="Entre para acompanhar suas vendas e atualizar seus dados de contato."
      />
    );
  const filtered = (products.data || []).filter(
    (p) => tab === "ALL" || p.status === tab,
  );
  return (
    <div className="shell page">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b pb-8">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-16 shrink-0">
            <AvatarImage src={user.avatarUrl || ""} alt="" />
            <AvatarFallback>
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="eyebrow mb-1">Minha conta</p>
            <h1 className="page-title break-words">{user.name}</h1>
            <p className="caption mt-2 break-all">{user.email}</p>
            <p className="caption mt-1">
              Membro desde {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
        <Link href="/anunciar" className={buttonVariants()}>
          <Plus />
          Anunciar produto
        </Link>
      </header>
      <div className="account-layout">
        <section className="min-w-0" aria-labelledby="my-listings">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="my-listings" className="section-title">
              Meus anúncios
            </h2>
            <a
              href="#dados"
              className="text-link min-h-11 inline-flex items-center text-sm lg:hidden"
            >
              Dados de contato
            </a>
          </div>
          <div className="tab-row mt-4" aria-label="Filtrar meus anúncios">
            {[
              ["ALL", "Todos"],
              ...Object.entries(productStatuses).map(([k, v]) => [
                k,
                v === "Ativo"
                  ? "Ativos"
                  : v === "Pausado"
                    ? "Pausados"
                    : "Vendidos",
              ]),
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
                {products.data && (
                  <span className="ml-2 font-normal">
                    {
                      products.data.filter(
                        (p) => value === "ALL" || p.status === value,
                      ).length
                    }
                  </span>
                )}
              </button>
            ))}
          </div>
          {products.loading ? (
            <div
              className="space-y-4 py-6"
              role="status"
              aria-label="Carregando seus anúncios"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-28" />
              ))}
            </div>
          ) : products.error ? (
            <ErrorState
              retry={products.reload}
              title="Seus anúncios não carregaram"
            />
          ) : filtered.length ? (
            <div>
              {filtered.map((p) => (
                <article key={p.id} className="management-row">
                  <Link
                    href={listingHref(p)}
                    className="listing-photo !aspect-square self-start"
                  >
                    <ListingImage
                      src={p.images[0]?.url}
                      alt={p.title}
                      sizes="90px"
                    />
                  </Link>
                  <div className="min-w-0">
                    <p className="status-label" data-status={p.status}>
                      {productStatuses[p.status]}
                    </p>
                    <h3 className="mt-1 font-medium break-words">
                      <Link href={listingHref(p)}>{p.title}</Link>
                    </h3>
                    <p className="mt-2 font-semibold">{formatPrice(p.price)}</p>
                    <p className="caption mt-1">
                      {p._count.negotiations} conversa(s) · {p.category?.name}
                    </p>
                  </div>
                  <div className="management-actions">
                    <Link
                      href={listingHref(p)}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <ArrowUpRight />
                      Ver anúncio
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === p.id}
                      onClick={() => setEditing(p)}
                    >
                      <Pencil />
                      Editar
                    </Button>
                    {p.status !== "SOLD" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={() =>
                            status(
                              p.id,
                              p.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                            )
                          }
                        >
                          {p.status === "ACTIVE" ? <Pause /> : <Play />}
                          {p.status === "ACTIVE" ? "Pausar" : "Reativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={() => status(p.id, "SOLD")}
                        >
                          <Check />
                          Vendido
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Excluir anúncio: ${p.title}`}
                      onClick={() => {
                        setDeleting(p);
                        setDeleteError("");
                      }}
                      disabled={busy === p.id}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title={
                  tab === "ALL"
                    ? "Seu primeiro anúncio começa aqui"
                    : "Nenhum anúncio nesta situação"
                }
                description={
                  tab === "ALL"
                    ? "Fotografe o que você quer vender e conte os detalhes."
                    : "Seus anúncios aparecerão aqui quando estiverem nesta situação."
                }
                href="/anunciar"
                action="Anunciar produto"
              />
            </div>
          )}
        </section>
        <AccountSettings />
      </div>
      {editing && (
        <EditListing
          item={editing}
          close={() => setEditing(undefined)}
          saved={products.reload}
        />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(undefined);
        }}
      >
        <DialogContent className="!max-w-md !p-6">
          <DialogHeader>
            <DialogTitle className="section-title">
              Excluir este anúncio?
            </DialogTitle>
            <DialogDescription>
              O anúncio “{deleting?.title}” e as conversas relacionadas serão
              excluídos. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="inline-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              disabled={!!busy}
              onClick={() => setDeleting(undefined)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!!busy}
              onClick={async () => {
                if (!deleting) return;
                setBusy(deleting.id);
                try {
                  await apiFetch(`/products/${deleting.id}`, {
                    method: "DELETE",
                  });
                  setDeleting(undefined);
                  products.reload();
                  toast.success("Anúncio excluído.");
                } catch (error) {
                  setDeleteError(errorMessage(error));
                } finally {
                  setBusy(undefined);
                }
              }}
            >
              {busy ? "Excluindo…" : "Excluir anúncio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
