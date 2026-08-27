import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Matches the real catalogue's geometry exactly — same header block, same
 * control row, same 4:3 tiles on the same grid — so content swaps in without
 * a single pixel of shift. Never a spinner for a page load.
 */
export default function CatalogueLoading() {
  return (
    <div className="flex flex-col gap-8 md:gap-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading properties…</span>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-20" radius="sm" />
          <Skeleton className="h-8 w-56" />
          <SkeletonText className="w-64" />
        </div>
        <Skeleton className="hidden h-12 w-40 sm:block" />
      </header>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-48" radius="full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="size-11 shrink-0 sm:hidden" />
          <Skeleton className="hidden h-11 w-32 sm:block" />
          <Skeleton className="hidden h-11 w-40 sm:block" />
          <Skeleton className="hidden h-11 w-40 sm:block" />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-lg border border-line bg-elevated shadow-sm">
            <Skeleton className="aspect-16/10 w-full sm:aspect-4/3" radius="sm" />
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-2">
                <SkeletonText className="w-4/5" />
                <SkeletonText className="h-2.5 w-1/2" />
              </div>
              <SkeletonText className="h-2.5 w-3/5" />
              <div className="border-t border-line-subtle pt-3">
                <Skeleton className="h-5 w-24" radius="sm" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
