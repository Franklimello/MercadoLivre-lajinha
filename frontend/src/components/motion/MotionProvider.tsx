"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { motionTokens } from "@/lib/motion";
import { ListingTransitionProvider } from "./ListingTransition";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={motionTokens.spring.smooth}>
      <ListingTransitionProvider>{children}</ListingTransitionProvider>
    </MotionConfig>
  );
}
