'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductCarouselProps {
  images: { url: string; position: number }[];
  title: string;
}

export function ProductCarousel({ images, title }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-4/3 w-full rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
        Nenhuma foto disponível
      </div>
    );
  }

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-3">
      {/* Imagem Principal */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted/30 border border-border shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex].url}
          alt={`${title} - Foto ${currentIndex + 1}`}
          className="h-full w-full object-contain"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background text-foreground p-2 shadow-md backdrop-blur transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Próxima foto"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background text-foreground p-2 shadow-md backdrop-blur transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Contador */}
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white backdrop-blur">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === currentIndex
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
