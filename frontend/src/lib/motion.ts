import type { Transition, Variants } from "motion/react";

export const motionTokens = {
  duration: {
    quick: 0.16,
    base: 0.24,
    reveal: 0.34,
  },
  ease: {
    standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
    exit: [0.4, 0, 1, 1] as [number, number, number, number],
  },
  spring: {
    snappy: { type: "spring", stiffness: 470, damping: 34, mass: 0.72 },
    smooth: { type: "spring", stiffness: 330, damping: 32, mass: 0.86 },
    sheet: { type: "spring", stiffness: 360, damping: 36, mass: 0.9 },
  },
} satisfies {
  duration: Record<string, number>;
  ease: Record<string, [number, number, number, number]>;
  spring: Record<string, Transition>;
};

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const staggerGrid: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.reveal,
      ease: motionTokens.ease.standard,
    },
  },
};
