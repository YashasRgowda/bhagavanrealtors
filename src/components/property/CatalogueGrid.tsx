"use client";

import { AnimatePresence, motion } from "motion/react";
import { PropertyCard } from "./PropertyCard";
import { fadeRise, listContainer, staggerDelay, DUR, EASE_IN, useMotionPrefs } from "@/lib/motion";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

/**
 * The results grid.
 *
 * Two motions, both functional:
 *   • stagger on first paint, so the page assembles rather than snapping in
 *   • `layout` on each tile, so filtering reflows the grid instead of
 *     teleporting cards to new positions
 *
 * The stagger is capped at 8 tiles — past that a cascade reads as slow.
 */
export function CatalogueGrid({
  items,
  covers,
}: {
  items: PropertyRow[];
  /** propertyId → cover media. Serialised from the server component. */
  covers: Record<string, PropertyMediaRow>;
}) {
  const m = useMotionPrefs();

  return (
    <motion.ul
      variants={listContainer(!m.animate)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((p, i) => (
          <motion.li
            key={p.id}
            layout={m.animate}
            variants={fadeRise}
            custom={m.rise(12)}
            exit={{ opacity: 0, scale: m.animate ? 0.97 : 1, transition: { duration: DUR.fast, ease: EASE_IN } }}
            transition={{ delay: staggerDelay(i, !m.animate) }}
          >
            <PropertyCard p={p} cover={covers[p.id] ?? null} priority={i < 4} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
