"use client";

import { ContentBlocksManager } from "@/components/content-blocks/ContentBlocksManager";

interface Classroom {
  id: string;
  name: string;
}

export function TeacherSettingsClient({
  teacherId,
  classrooms,
}: {
  teacherId: string;
  classrooms: Classroom[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-teacher-muted">Content controls apply to every student in the selected classroom.</p>

      <div className="mt-6">
        <ContentBlocksManager
          scope="classroom"
          blockerId={teacherId}
          targets={classrooms.map((c) => ({ id: c.id, label: c.name }))}
          emptyTargetsMessage="Create a classroom first, then you can set content controls for it."
        />
      </div>
    </div>
  );
}
