import { KidsNav } from "@/components/kids/KidsNav";

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-kids-bg font-kids">
      <KidsNav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
