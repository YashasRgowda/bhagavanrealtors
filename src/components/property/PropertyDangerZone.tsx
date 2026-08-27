import { DeletePropertyButton } from "./DeletePropertyButton";

/**
 * Deleting is separated from every other control on the page.
 *
 * It previously sat directly beneath "Edit listing & photos" in the same
 * stack of identical buttons — one slip apart from an irreversible action
 * that also takes the photos, deal history and live share links with it.
 */
export function PropertyDangerZone({
  propertyId, title, mediaCount, hasDeal, shareCount,
}: {
  propertyId: string;
  title: string;
  mediaCount: number;
  hasDeal: boolean;
  shareCount: number;
}) {
  return (
    <section className="mt-4 border-t border-line pt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-lg border border-danger/25 bg-danger-subtle/40 p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Delete this listing</h2>
          <p className="mt-1 max-w-md text-sm text-ink-muted">
            Removes the photos, deal history and share links for good. To take it
            off the catalogue instead, set the status to Withdrawn.
          </p>
        </div>
        <div className="shrink-0">
          <DeletePropertyButton
            propertyId={propertyId}
            title={title}
            mediaCount={mediaCount}
            hasDeal={hasDeal}
            shareCount={shareCount}
          />
        </div>
      </div>
    </section>
  );
}
