"use client";

import { useReducedMotion, type Transition, type Variants } from "motion/react";

/**
 * Motion primitives — the single source of truth for in-app animation.
 *
 * Three rules this file exists to enforce:
 *   1. Only `transform` and `opacity` are ever animated, so everything stays on
 *      the compositor and holds 60fps on a mid-range Android.
 *   2. Motion never gates interaction. Nothing here delays a field becoming
 *      usable — entrances animate the container, never the input's readiness.
 *   3. `prefers-reduced-motion` is honoured globally: every preset degrades to
 *      a ≤120ms opacity fade via `useMotionPrefs()`.
 *
 * GSAP/Lenis live only on the marketing route and must never be imported here.
 */

/* ─────────────────────────── durations (seconds) ─────────────────────────── */

export const DUR = {
  micro: 0.12,   // press feedback, checkbox tick
  fast: 0.16,    // colour, border
  base: 0.22,    // standard transition
  slow: 0.28,    // card, list item
  sheet: 0.36,   // sheets, page-level surfaces
} as const;

/* ──────────────────────────────── easing ─────────────────────────────────── */

/** Expo-out. The "expensive" curve — everything that enters uses this. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Exits are faster than entrances, so dismissal feels decisive. */
export const EASE_IN = [0.4, 0, 1, 1] as const;
export const EASE_BOTH = [0.65, 0, 0.35, 1] as const;

/** Tight spring — engineered, not playful. No visible wobble. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 35,
  mass: 0.8,
};

/** Slightly softer, for larger surfaces travelling further (sheets). */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

export const enter: Transition = { duration: DUR.slow, ease: EASE_OUT };
export const exit: Transition = { duration: DUR.fast, ease: EASE_IN };

/* ─────────────────────────── reduced-motion gate ─────────────────────────── */

export type MotionPrefs = {
  /** False when the user asked for reduced motion. */
  animate: boolean;
  /** Distance in px for rise-in effects — 0 when reduced. */
  rise: (px: number) => number;
  /** Scale start for pop effects — 1 when reduced. */
  pop: (from: number) => number;
  /** A transition that collapses to a short fade when reduced. */
  t: (base?: Transition) => Transition;
};

export function useMotionPrefs(): MotionPrefs {
  const reduced = useReducedMotion();
  const animate = !reduced;
  return {
    animate,
    rise: (px) => (animate ? px : 0),
    pop: (from) => (animate ? from : 1),
    t: (base = enter) => (animate ? base : { duration: DUR.micro, ease: "linear" }),
  };
}

/* ─────────────────────────────── variants ────────────────────────────────── */

/**
 * Rise + fade. `custom` carries the travel distance so the same variant serves
 * both the full and the reduced-motion case without a second definition.
 */
export const fadeRise: Variants = {
  hidden: (rise: number = 12) => ({ opacity: 0, y: rise }),
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE_OUT },
  },
  out: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } },
};

/** Scale + fade. For modals and anything that "arrives" rather than "rises". */
export const popIn: Variants = {
  hidden: (from: number = 0.96) => ({ opacity: 0, scale: from }),
  show: { opacity: 1, scale: 1, transition: SPRING },
  out: { opacity: 0, scale: 0.98, transition: { duration: DUR.fast, ease: EASE_IN } },
};

/**
 * List container. Stagger is capped at 8 children — beyond that a long cascade
 * reads as slow, not luxurious, so the tail fades in as one group.
 */
export const STAGGER_STEP = 0.038;
export const STAGGER_CAP = 8;

export function listContainer(reduced: boolean): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : STAGGER_STEP,
        delayChildren: reduced ? 0 : 0.02,
      },
    },
  };
}

/** Delay for item `i`, flattened once past the cap. */
export function staggerDelay(i: number, reduced: boolean): number {
  if (reduced) return 0;
  return Math.min(i, STAGGER_CAP) * STAGGER_STEP;
}

/* ───────────────────────────── shared layout ─────────────────────────────── */

/**
 * Namespaced `layoutId` builders. Shared-element transitions silently break
 * when two surfaces coin the same id, so every id is minted here.
 */
export const layoutIds = {
  propertyImage: (id: string) => `property-image-${id}`,
  propertyTitle: (id: string) => `property-title-${id}`,
  propertyPrice: (id: string) => `property-price-${id}`,
  segment: (group: string) => `segment-indicator-${group}`,
} as const;
