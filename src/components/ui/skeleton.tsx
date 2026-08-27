import { cn } from "@/lib/utils";

/**
 * Skeletons match the real content's shape and size exactly — that is the
 * whole point. A spinner tells the user "wait"; a skeleton tells them what is
 * about to appear, and prevents the layout shift when it does.
 */
export function Skeleton({
  className,
  radius = "md",
}: {
  className?: string;
  radius?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  const r = {
    sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg",
    xl: "rounded-xl", full: "rounded-full",
  }[radius];
  return <div aria-hidden className={cn("skeleton", r, className)} />;
}

/** A line of text. `w` is a Tailwind width utility from the grid. */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton radius="sm" className={cn("h-3", className)} />;
}
