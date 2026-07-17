import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
      <p className="mt-1 text-slate-500">Site-wide controls — only visible to your account.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/featured-books" className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md">
          <h2 className="font-semibold text-slate-900">Featured Books</h2>
          <p className="mt-1 text-sm text-slate-500">Curate books shown to every kid and on the landing page.</p>
        </Link>
        <Link href="/admin/posts" className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md">
          <h2 className="font-semibold text-slate-900">Blog &amp; Video Posts</h2>
          <p className="mt-1 text-sm text-slate-500">Publish posts pinned to the top of BookTok.</p>
        </Link>
      </div>
    </div>
  );
}