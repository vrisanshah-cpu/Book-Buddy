import { TeacherNav } from "@/components/teacher/TeacherNav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-teacher-bg font-teacher">
      <TeacherNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}