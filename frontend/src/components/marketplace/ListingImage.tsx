"use client";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
export function ListingImage({
  src,
  alt,
  sizes = "(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) calc((100vw - 88px) / 3), (max-width: 1247px) calc((100vw - 332px) / 3), 306px",
  contain = false,
  eager = false,
}: {
  src?: string;
  alt: string;
  sizes?: string;
  contain?: boolean;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const [loadedSrc, setLoadedSrc] = useState<string>();
  if (!src || failedSrc === src)
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <ImageOff size={24} aria-hidden="true" />
        <span className="text-xs">Foto indisponível</span>
      </div>
    );
  // Unknown external hosts still render without sending them to the image optimizer.
  const optimized =
    src.startsWith("https://ik.imagekit.io/") ||
    (src.startsWith("/") && !src.startsWith("//"));
  return (
    <>
      {loadedSrc !== src && (
        <span
          className="skeleton absolute inset-0 !rounded-none"
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={!optimized}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        quality={80}
        onLoad={() => setLoadedSrc(src)}
        className={contain ? "object-contain" : "object-cover"}
        onError={() => setFailedSrc(src)}
      />
    </>
  );
}
