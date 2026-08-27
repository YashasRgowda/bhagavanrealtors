import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function RequirementsLoading() {
  return (
    <div className="flex flex-col gap-8 md:gap-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading buyers…</span>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-16" radius="sm" />
          <Skeleton className="h-8 w-64" />
          <SkeletonText className="w-72" />
        </div>
        <Skeleton className="hidden h-12 w-36 sm:block" />
      </header>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-line bg-elevated p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0" radius="full" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonText className="w-2/5" />
                <SkeletonText className="h-2.5 w-1/2" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <Skeleton className="h-6 w-32" radius="sm" />
              <SkeletonText className="h-2.5 w-3/4" />
              <SkeletonText className="h-2.5 w-1/2" />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line-subtle pt-4">
              <SkeletonText className="h-2.5 w-28" />
              <div className="flex gap-1.5">
                <Skeleton className="size-10" />
                <Skeleton className="size-10" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
