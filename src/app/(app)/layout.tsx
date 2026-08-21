import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-28 pt-8 md:pb-16 md:pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
