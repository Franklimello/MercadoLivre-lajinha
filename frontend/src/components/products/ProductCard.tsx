"use client";

import Link from "next/link";
import { ViewTransition, type Ref } from "react";
import { motion } from "motion/react";
import { ListingImage } from "@/components/marketplace/ListingImage";
import {
  formatPrice,
  relativeDate,
  type ProductSummary,
} from "@/lib/marketplace";
import { cardReveal, motionTokens } from "@/lib/motion";
import { useListingTransition } from "@/components/motion/ListingTransition";
import { useListingPrefetch } from "@/hooks/useListingPrefetch";
export type { ProductSummary } from "@/lib/marketplace";
export function ProductCard({
  product,
  ref,
}: {
  product: ProductSummary;
  ref?: Ref<HTMLElement>;
}) {
  const { prepare } = useListingTransition();
  const prefetch = useListingPrefetch(`/products/${product.id}`);
  const cover = [...(product.images || [])].sort(
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
        href={`/produtos/${product.id}`}
        className="listing-card"
        {...prefetch}
        transitionTypes={["listing-forward"]}
        onNavigate={() =>
          prepare({
            id: product.id,
            kind: "product",
            title: product.title,
            cover: cover?.url,
          })
        }
      >
        <ViewTransition
          name={`listing-image-product-${product.id}`}
          share="listing-image-morph"
          default="none"
        >
          <motion.div
            className="listing-photo"
            transition={motionTokens.spring.smooth}
          >
            <ListingImage src={cover?.url} alt={product.title} />
          </motion.div>
        </ViewTransition>
        <p className="listing-price">{formatPrice(product.price)}</p>
        <h3 className="listing-title">{product.title}</h3>
        <div className="listing-meta">
          <span>
            {product.city} · {product.state}
          </span>
        </div>
        {product.createdAt && (
          <time
            dateTime={product.createdAt}
            className="text-xs text-muted-foreground"
          >
            {relativeDate(product.createdAt)}
          </time>
        )}
      </Link>
    </motion.article>
  );
}
