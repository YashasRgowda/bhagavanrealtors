"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useMotionPrefs } from "@/lib/motion";

/**
 * The results count, which ticks rather than jumps when a filter changes.
 *
 * Spring-driven instead of a timed tween so a rapid sequence of filter changes
 * retargets smoothly rather than restarting a 600ms animation each time.
 */
export function CatalogueCount({ value, singular, plural }: {
  value: number;
  singular: string;
  plural: string;
}) {
  const m = useMotionPrefs();
  const raw = useMotionValue(value);
  const spring = useSpring(raw, { stiffness: 240, damping: 30, mass: 0.7 });
  const rounded = useTransform(spring, (v) => Math.round(v).toString());

  React.useEffect(() => { raw.set(value); }, [value, raw]);

  return (
    <span className="text-ink">
      {m.animate ? <motion.span>{rounded}</motion.span> : value}{" "}
      {value === 1 ? singular : plural}
    </span>
  );
}
