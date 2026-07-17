import { ParentNav } from "@/components/parent/ParentNav";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-parent-bg font-parent">
      <GoogleAdsense />
      <ParentNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}