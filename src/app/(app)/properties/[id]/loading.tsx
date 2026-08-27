import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function PropertyLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading property…</span>
      <Skeleton className="h-4 w-24" radius="sm" />

      <div className="grid h-72 gap-2 grid-cols-2 grid-rows-2 sm:h-88 sm:grid-cols-3 lg:h-108">
        <Skeleton className="col-span-2 row-span-1 sm:row-span-2" radius="lg" />
        <Skeleton radius="lg" />
        <Skeleton radius="lg" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" radius="full" />
        <Skeleton className="h-9 w-3/5" />
        <SkeletonText className="w-64" />
      </div>

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <div className="rounded-lg border border-line bg-elevated shadow-sm">
            <div className="border-b border-line bg-subtle p-5">
              <SkeletonText className="h-2.5 w-24" />
              <Skeleton className="mt-3 h-9 w-40" />
            </div>
            <div className="flex flex-col gap-2.5 p-5">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-2 gap-2.5">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          <Skeleton className="h-28 w-full" radius="lg" />
        </aside>

        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <div className="rounded-lg border border-line bg-elevated p-5 shadow-sm">
            <SkeletonText className="h-2.5 w-16" />
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <SkeletonText className="h-2.5 w-14" />
                  <SkeletonText className="w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonText className="h-2.5 w-32" />
            <Skeleton className="h-24 w-full" radius="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
