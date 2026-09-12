"use client";
import { useId, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { ListingImage } from "@/components/marketplace/ListingImage";
import { apiFetch } from "@/lib/api";
import { AnimatePresence, motion } from "motion/react";
import { motionTokens } from "@/lib/motion";
import { preparePhoto } from "@/lib/prepare-photo";
import { useOnline } from "@/hooks/useOnline";
export interface UploadedImage {
  url: string;
  fileId: string;
}
export function ImageKitUploader({
  images,
  onChange,
  maxImages = 5,
  onUploadingChange,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  onUploadingChange?: (value: boolean) => void;
}) {
  const inputId = useId();
  const online = useOnline();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  async function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (!online) { setError("Conecte-se para enviar as fotos. Os demais campos do rascunho continuam salvos neste dispositivo."); return; }
    if (files.length > maxImages - images.length) {
      setError(
        `Você pode adicionar mais ${maxImages - images.length} foto(s).`,
      );
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    if (!publicKey || publicKey.includes("your_")) {
      setError(
        "O envio de fotos está indisponível no momento. Tente novamente mais tarde.",
      );
      return;
    }
    setError("");
    setUploading(true);
    onUploadingChange?.(true);
    const uploaded: UploadedImage[] = [];
    const failures: string[] = [];
    for (const [i, file] of files.entries()) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        failures.push(`${file.name}: use JPG, PNG ou WebP.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        failures.push(`${file.name}: o limite é 5 MB.`);
        continue;
      }
      setProgress(`Enviando foto ${i + 1} de ${files.length}…`);
      try {
        const auth = await apiFetch<{
          token: string;
          expire: number;
          signature: string;
        }>("/upload/auth");
        const form = new FormData();
        const photo = await preparePhoto(file).catch(() => file);
        form.append("file", photo);
        form.append("fileName", `${crypto.randomUUID()}.${photo.type === "image/webp" ? "webp" : photo.type === "image/png" ? "png" : "jpg"}`);
        form.append("useUniqueFileName", "true");
        form.append("overwriteFile", "false");
        form.append("publicKey", publicKey);
        form.append("signature", auth.signature);
        form.append("expire", String(auth.expire));
        form.append("token", auth.token);
        const response = await fetch(
          "https://upload.imagekit.io/api/v1/files/upload",
          { method: "POST", body: form },
        );
        if (!response.ok) throw new Error("Upload failed");
        const data: UploadedImage = await response.json();
        if (!data.url || !data.fileId) throw new Error("Invalid response");
        uploaded.push({ url: data.url, fileId: data.fileId });
      } catch {
        failures.push(`Não foi possível enviar ${file.name}. Tente novamente.`);
      }
    }
    onChange([...images, ...uploaded]);
    setError(failures.join(" "));
    setProgress(
      uploaded.length ? `${uploaded.length} foto(s) adicionada(s).` : "",
    );
    setUploading(false);
    onUploadingChange?.(false);
  }
  function move(index: number, direction: number) {
    const next = [...images];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  }
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="section-title">Fotos do anúncio</h2>
        <span className="caption">
          {images.length} de {maxImages}
        </span>
      </div>
      <p className="caption">
        A primeira foto será a capa. Mostre o produto por inteiro e os detalhes
        de uso.
      </p>
      <div className="upload-grid">
        <AnimatePresence initial={false}>
          {images.map((photo, i) => (
            <motion.div
              key={photo.fileId}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={motionTokens.spring.smooth}
            >
              <div className="upload-tile">
                <ListingImage
                  src={photo.url}
                  alt={`Foto ${i + 1} do anúncio`}
                  sizes="(max-width: 639px) calc((100vw - 48px) / 2), 180px"
                />
                <motion.button
                  type="button"
                  disabled={uploading}
                  onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                  className="icon-button absolute right-1 top-1 bg-white"
                  aria-label={`Remover foto ${i + 1}`}
                  whileTap={{ scale: 0.88 }}
                >
                  <X size={18} />
                </motion.button>
                <span className="absolute bottom-2 left-2 rounded bg-white px-2 py-1 text-xs font-medium">
                  {i === 0 ? "Foto principal" : `Foto ${i + 1}`}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <motion.button
                  type="button"
                  className="icon-button disabled:opacity-25"
                  disabled={uploading || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Mover foto ${i + 1} para antes`}
                  whileTap={{ scale: 0.88 }}
                >
                  <ChevronLeft size={18} />
                </motion.button>
                <motion.button
                  type="button"
                  className="icon-button disabled:opacity-25"
                  disabled={uploading || i === images.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Mover foto ${i + 1} para depois`}
                  whileTap={{ scale: 0.88 }}
                >
                  <ChevronRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {images.length < maxImages && (
          <motion.label
            htmlFor={inputId}
            className="upload-tile upload-add cursor-pointer hover:bg-accent"
            layout
            whileTap={{ scale: 0.98 }}
            transition={motionTokens.spring.snappy}
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Camera size={24} strokeWidth={1.6} />
            )}
            <span className="text-sm font-medium">
              {uploading ? "Enviando…" : "Adicionar fotos"}
            </span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG ou WebP
              <br />
              Até 5 MB por foto
            </span>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              onChange={selectFiles}
              className="sr-only"
            />
          </motion.label>
        )}
      </div>
      <p className="caption" role="status">
        {progress}
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
