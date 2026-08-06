import { ParentNav } from "@/components/parent/ParentNav";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-parent-bg font-parent">
      <ParentNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
