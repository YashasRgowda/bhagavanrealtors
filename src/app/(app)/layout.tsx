import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    /* `data-shell` is the handle the sheet uses to recede the page behind a
       bottom sheet. See the [data-shell] rule in globals.css. */
    <div data-shell className="flex min-h-dvh flex-col bg-canvas">
      <TopBar />
      {/* Gutters: 16 / 24 / 32px. Content caps at 1280px. */}
      <main className="mx-auto w-full max-w-320 flex-1 px-4 pt-8 pb-28 sm:px-6 md:pt-10 md:pb-16 lg:px-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
