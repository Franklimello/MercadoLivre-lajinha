"use client";

import { useRef, useState, ViewTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { ListingImage } from "@/components/marketplace/ListingImage";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ListingPhoto } from "@/lib/marketplace";
import { motionTokens } from "@/lib/motion";

export function ProductCarousel({
  images,
  title,
  listingId,
  vehicles = false,
}: {
  images: ListingPhoto[];
  title: string;
  listingId: string;
  vehicles?: boolean;
}) {
  const ordered = [...(images || [])].sort((a, b) => a.position - b.position);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [direction, setDirection] = useState(1);
  const track = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const sharedId = `listing-image-${vehicles ? "vehicle" : "product"}-${listingId}`;

  function go(next: number, requestedDirection?: number) {
    const target = (next + ordered.length) % ordered.length;
    setDirection(requestedDirection ?? (target >= index ? 1 : -1));
    track.current?.scrollTo({
      left: target * track.current.clientWidth,
      behavior: reduceMotion || expanded ? "instant" : "smooth",
    });
  }

  if (!ordered.length)
    return (
      <div className="listing-photo !aspect-[4/3]">
        <ListingImage alt={title} />
      </div>
    );

  return (
    <div className="space-y-3">
      <ViewTransition
        name={sharedId}
        share="listing-image-morph"
        default="none"
      >
        <motion.div
          transition={motionTokens.spring.smooth}
          className="gallery-stage"
          role="region"
          aria-label="Fotos do anúncio"
          aria-roledescription="carrossel"
        >
          <motion.div
            ref={track}
            layoutId={`expanded-${sharedId}`}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            onScroll={(event) => {
              if (expanded) return;
              const next = Math.round(
                event.currentTarget.scrollLeft /
                  event.currentTarget.clientWidth,
              );
              if (next !== index) {
                setDirection(next > index ? 1 : -1);
                setIndex(next);
              }
            }}
          >
            {ordered.map((photo, photoIndex) => (
              <motion.button
                key={photo.url + photoIndex}
                type="button"
                className="relative aspect-[4/3] w-full shrink-0 snap-center"
                onClick={() => setExpanded(true)}
                aria-label={`Ampliar foto ${photoIndex + 1} de ${ordered.length}`}
                whileTap={{ scale: 0.995 }}
              >
                <ListingImage
                  src={photo.url}
                  alt={`${title}, foto ${photoIndex + 1}`}
                  contain
                  eager={photoIndex === 0}
                  sizes="(max-width: 1023px) 95vw, 700px"
                />
              </motion.button>
            ))}
          </motion.div>
          {ordered.length > 1 && (
            <>
              <motion.button
                className="icon-button gallery-arrow left-2"
                aria-label="Foto anterior"
                onClick={() => go(index - 1)}
                whileTap={{ scale: 0.88 }}
                transition={motionTokens.spring.snappy}
              >
                <ChevronLeft size={20} />
              </motion.button>
              <motion.button
                className="icon-button gallery-arrow right-2"
                aria-label="Próxima foto"
                onClick={() => go(index + 1)}
                whileTap={{ scale: 0.88 }}
                transition={motionTokens.spring.snappy}
              >
                <ChevronRight size={20} />
              </motion.button>
            </>
          )}
          <span className="gallery-count" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={index}
                initial={{ opacity: 0, y: direction * 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -5 }}
                transition={{ duration: motionTokens.duration.quick }}
              >
                {index + 1}
              </motion.span>
            </AnimatePresence>
            <span>&nbsp;/ {ordered.length}</span>
          </span>
          <motion.button
            onClick={() => setExpanded(true)}
            className="icon-button absolute right-2 bottom-2 bg-white"
            aria-label="Ampliar imagem"
            whileTap={{ scale: 0.88 }}
            transition={motionTokens.spring.snappy}
          >
            <Maximize2 size={18} />
          </motion.button>
        </motion.div>
      </ViewTransition>

      {ordered.length > 1 && (
        <div
          className="flex gap-3 overflow-x-auto py-1"
          aria-label="Escolher foto"
        >
          {ordered.map((photo, photoIndex) => (
            <motion.button
              key={photo.url + photoIndex}
              onClick={() => go(photoIndex)}
              aria-label={`Ver foto ${photoIndex + 1}`}
              aria-pressed={index === photoIndex}
              className="gallery-thumbnail"
              whileTap={{ scale: 0.92 }}
              transition={motionTokens.spring.snappy}
            >
              <ListingImage src={photo.url} alt="" sizes="64px" />
              {index === photoIndex && (
                <motion.span
                  layoutId={`carousel-active-thumbnail-${listingId}`}
                  className="gallery-thumbnail-indicator"
                  transition={motionTokens.spring.snappy}
                />
              )}
            </motion.button>
          ))}
        </div>
      )}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="!w-[calc(100%-2rem)] !max-w-5xl !p-4">
          <DialogTitle className="pr-10 text-sm">
            Foto {index + 1} de {ordered.length} · {title}
          </DialogTitle>
          <motion.div
            layoutId={`expanded-${sharedId}`}
            className="relative h-[65dvh] overflow-hidden"
            transition={motionTokens.spring.smooth}
          >
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={direction}
            >
              <motion.div
                key={ordered[index]?.url}
                custom={direction}
                initial={{ opacity: 0, x: reduceMotion ? 0 : direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : direction * -24 }}
                transition={{
                  duration: motionTokens.duration.base,
                  ease: motionTokens.ease.standard,
                }}
                className="absolute inset-0"
                drag={ordered.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={reduceMotion ? 0 : 0.12}
                onDragEnd={(_, info) => {
                  if (
                    Math.abs(info.offset.x) < 50 &&
                    Math.abs(info.velocity.x) < 600
                  )
                    return;
                  const nextDirection = info.offset.x < 0 ? 1 : -1;
                  const next =
                    (index + nextDirection + ordered.length) % ordered.length;
                  setIndex(next);
                  go(next, nextDirection);
                }}
                style={{ touchAction: "pan-y" }}
              >
                <ListingImage
                  src={ordered[index]?.url}
                  alt={title}
                  contain
                  eager
                  sizes="95vw"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          {ordered.length > 1 && (
            <div className="flex justify-center gap-4">
              <motion.button
                className="icon-button"
                aria-label="Ampliada: foto anterior"
                onClick={() => {
                  const next = (index - 1 + ordered.length) % ordered.length;
                  setIndex(next);
                  go(next, -1);
                }}
                whileTap={{ scale: 0.88 }}
              >
                <ChevronLeft />
              </motion.button>
              <motion.button
                className="icon-button"
                aria-label="Ampliada: próxima foto"
                onClick={() => {
                  const next = (index + 1) % ordered.length;
                  setIndex(next);
                  go(next, 1);
                }}
                whileTap={{ scale: 0.88 }}
              >
                <ChevronRight />
              </motion.button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
