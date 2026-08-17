import { ParentNav } from "@/components/parent/ParentNav";
import { ParentFooter } from "@/components/parent/ParentFooter";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-parent-bg font-parent">
      <ParentNav />
      <main className="flex-1 p-8">
        {children}
        <ParentFooter />
      </main>
    </div>
  );
}
