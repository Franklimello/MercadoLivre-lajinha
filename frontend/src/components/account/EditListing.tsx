"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { conditions, errorMessage } from "@/lib/marketplace";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useListingDraft } from "@/hooks/useListingDraft";
import { DraftNotice } from "@/components/listings/DraftNotice";
import { useOnline } from "@/hooks/useOnline";
export interface EditableListing {
  id: string;
  title: string;
  description: string;
  price: string | number;
  stock: number;
  condition: string;
}
export function EditListing({
  item,
  close,
  saved,
}: {
  item: EditableListing;
  close: () => void;
  saved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const online = useOnline();
  const [values, setValues] = useState<Record<string, string>>({
    title: item.title,
    description: item.description,
    price: String(item.price),
    stock: String(item.stock),
    condition: item.condition,
  });
  const [formRevision, setFormRevision] = useState(0);
  const draft = useListingDraft(
    `${user!.id}:edit:${item.id}`,
    values,
    [],
    0,
    (saved) => {
      setValues(saved.values);
      setFormRevision((value) => value + 1);
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="!max-w-xl max-h-[85dvh] overflow-y-auto !p-6">
        <DialogHeader>
          <DialogTitle className="section-title">Editar anúncio</DialogTitle>
          <DialogDescription>
            Atualize as informações que aparecem para os compradores.
          </DialogDescription>
        </DialogHeader>
        <DraftNotice {...draft} />
        <form
          key={formRevision}
          className="space-y-5"
          onChange={(event) => {
            draft.markDirty();
            setValues(
              Object.fromEntries(
                new FormData(event.currentTarget).entries(),
              ) as Record<string, string>,
            );
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!online || !draft.ready || draft.available) {
              setError(
                "Conecte-se e revise o rascunho antes de salvar as alterações.",
              );
              return;
            }
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              await apiFetch(`/products/${item.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  title: String(form.get("title")).trim(),
                  description: String(form.get("description")).trim(),
                  price: Number(form.get("price")),
                  stock: Number(form.get("stock")),
                  condition: form.get("condition"),
                }),
              });
              toast.success("Anúncio atualizado.");
              await draft.clear().catch(() => undefined);
              saved();
              close();
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset
            className="min-w-0 space-y-5"
            disabled={!draft.ready || !!draft.available}
          >
            <div className="field">
              <label htmlFor="edit-title">Título</label>
              <Input
                id="edit-title"
                name="title"
                defaultValue={values.title}
                minLength={3}
                maxLength={120}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label htmlFor="edit-price">Preço (R$)</label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  inputMode="decimal"
                  min=".01"
                  step=".01"
                  defaultValue={values.price}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="edit-stock">Quantidade</label>
                <Input
                  id="edit-stock"
                  name="stock"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  defaultValue={values.stock}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="edit-condition">Estado de conservação</label>
              <select
                id="edit-condition"
                name="condition"
                defaultValue={values.condition}
                className="form-control"
              >
                {Object.entries(conditions).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-description">Descrição</label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={values.description}
                minLength={10}
                required
                rows={5}
              />
            </div>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={close}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || !online}>
                {busy ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
