import { TeacherNav } from "@/components/teacher/TeacherNav";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-teacher-bg font-teacher">
      <GoogleAdsense />
      <TeacherNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}