/** Decode orientation, cap resolution and encode once before mobile upload. */
export async function preparePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    if (file.type === "image/webp" && scale === 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob || blob.type !== "image/webp") return file;
    if (blob.size >= file.size && scale === 1) return file;
    return new File([blob], `${crypto.randomUUID()}.webp`, {
      type: "image/webp",
    });
  } finally {
    bitmap.close();
  }
}
