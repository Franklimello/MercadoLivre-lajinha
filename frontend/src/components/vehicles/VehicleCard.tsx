"use client";

import Link from "next/link";
import { ViewTransition, type Ref } from "react";
import { motion } from "motion/react";
import { ListingImage } from "@/components/marketplace/ListingImage";
import {
  formatPrice,
  relativeDate,
  type VehicleSummary,
} from "@/lib/marketplace";
import { cardReveal, motionTokens } from "@/lib/motion";
import { useListingTransition } from "@/components/motion/ListingTransition";
import { useListingPrefetch } from "@/hooks/useListingPrefetch";
export type { VehicleSummary } from "@/lib/marketplace";
export function VehicleCard({
  vehicle,
  ref,
}: {
  vehicle: VehicleSummary;
  ref?: Ref<HTMLElement>;
}) {
  const { prepare } = useListingTransition();
  const prefetch = useListingPrefetch(`/vehicles/${vehicle.id}`);
  const cover = [...(vehicle.images || [])].sort(
    (a, b) => a.position - b.position,
  )[0];
  return (
    <motion.article
      ref={ref}
      variants={cardReveal}
      exit={{ opacity: 0, scale: 0.97 }}
      layout="position"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={motionTokens.spring.smooth}
    >
      <Link
        href={`/veiculos/${vehicle.id}`}
        className="listing-card"
        {...prefetch}
        transitionTypes={["listing-forward"]}
        onNavigate={() =>
          prepare({
            id: vehicle.id,
            kind: "vehicle",
            title: vehicle.title,
            cover: cover?.url,
          })
        }
      >
        <ViewTransition
          name={`listing-image-vehicle-${vehicle.id}`}
          share="listing-image-morph"
          default="none"
        >
          <motion.div
            className="listing-photo"
            transition={motionTokens.spring.smooth}
          >
            <ListingImage src={cover?.url} alt={vehicle.title} />
          </motion.div>
        </ViewTransition>
        <p className="listing-price">{formatPrice(vehicle.price)}</p>
        <h3 className="listing-title">{vehicle.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {vehicle.vehicle?.year} ·{" "}
          {vehicle.vehicle?.mileage.toLocaleString("pt-BR")} km
        </p>
        <div className="listing-meta">
          <span>
            {vehicle.city} · {vehicle.state}
          </span>
          {vehicle.createdAt && (
            <time dateTime={vehicle.createdAt}>
              {relativeDate(vehicle.createdAt)}
            </time>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
