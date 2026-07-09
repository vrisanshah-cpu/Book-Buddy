import { getProfile } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherClassroomPage() {
  const { profile } = await getProfile();
  const supabase = await createClient();

  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("*")
    .eq("teacher_id", profile?.id ?? "");

  const { data: students } = await supabase
    .from("teacher_student")
    .select(`student_id, student:users!student_id (display_name, xp)`)
    .eq("teacher_id", profile?.id ?? "");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Classroom</h1>
      <p className="mt-1 text-teacher-muted">
        {profile?.school_name ? `${profile.school_name} · ` : ""}
        {profile?.grade_levels ?? "Manage your students"}
      </p>

      {(classrooms ?? []).map((c) => (
        <div
          key={c.id}
          className="mt-6 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6"
        >
          <h2 className="font-semibold text-slate-900">{c.name}</h2>
          <p className="mt-2 text-sm text-slate-600">Join code for students:</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-teacher-primary">
            {c.join_code}
          </p>
        </div>
      ))}

      {(!classrooms || classrooms.length === 0) && (
        <p className="mt-4 text-slate-500">
          No classroom yet. Re-register or run setup to create one.
        </p>
      )}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Students</h2>
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">XP</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                  No students linked yet. Share your join code!
                </td>
              </tr>
            ) : (
              students?.map((s) => {
                const studentData = Array.isArray(s.student) ? s.student[0] : s.student;
                const u = studentData as { display_name: string; xp: number };
                return (
                  <tr key={s.student_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{u.display_name}</td>
                    <td className="px-4 py-3">{u.xp ?? 0}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
