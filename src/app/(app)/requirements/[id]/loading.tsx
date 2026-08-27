import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function BuyerLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading buyer…</span>
      <Skeleton className="h-4 w-24" radius="sm" />

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0" radius="full" />
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-7 w-48" />
            <SkeletonText className="w-56" />
          </div>
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-12 w-36" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <div className="rounded-lg border border-line bg-elevated p-5 shadow-sm">
          <Skeleton className="h-3 w-24" radius="sm" />
          <Skeleton className="mt-3 h-9 w-40" />
          <div className="mt-5 grid grid-cols-2 gap-5 border-t border-line-subtle pt-5 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <SkeletonText className="h-2.5 w-14" />
                <SkeletonText className="w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5 rounded-lg border border-line bg-elevated p-5 shadow-sm">
          <Skeleton className="h-3 w-16" radius="sm" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-3 w-28" radius="sm" />
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="flex gap-4 rounded-lg border border-line bg-elevated p-3 shadow-sm">
              <Skeleton className="aspect-4/3 w-24 shrink-0" radius="md" />
              <div className="flex flex-1 flex-col gap-2 py-0.5">
                <SkeletonText className="w-3/4" />
                <SkeletonText className="h-2.5 w-1/2" />
                <SkeletonText className="mt-auto h-2.5 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
