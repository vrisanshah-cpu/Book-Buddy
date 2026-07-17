"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AdminPost {
  id: string;
  type: "blog" | "video";
  title: string;
  body: string;
  video_url: string | null;
  cover_image_url: string | null;
  pinned: boolean;
  published_at: string;
}

const emptyForm = {
  type: "blog" as "blog" | "video",
  title: "",
  body: "",
  video_url: "",
  cover_image_url: "",
  pinned: false,
};

export function AdminPostComposer() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/posts");
    if (!res.ok) {
      setError("Couldn't load posts.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  function startEdit(post: AdminPost) {
    setEditingId(post.id);
    setForm({
      type: post.type,
      title: post.title,
      body: post.body,
      video_url: post.video_url ?? "",
      cover_image_url: post.cover_image_url ?? "",
      pinned: post.pinned,
    });
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSaving(true);
    setError("");

    const res = editingId
      ? await fetch("/api/admin/posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        })
      : await fetch("/api/admin/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save that post.");
      return;
    }

    startNew();
    load();
  }

  async function togglePin(post: AdminPost) {
    const res = await fetch("/api/admin/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, pinned: !post.pinned }),
    });
    if (!res.ok) {
      setError("Couldn't update pin status.");
      return;
    }
    load();
  }

  async function remove(postId: string) {
    if (!confirm("Delete this post? This can't be undone.")) return;
    const res = await fetch(`/api/admin/posts?id=${postId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete that post.");
      return;
    }
    if (editingId === postId) startNew();
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Blog &amp; Video Posts</h1>
      <p className="mt-1 text-slate-500">
        Pinned posts show as a banner at the top of every kid&apos;s BookTok feed.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">{editingId ? "Edit post" : "New post"}</h2>

        <div className="mt-4 flex items-center gap-4">
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "blog" | "video" })}
          >
            <option value="blog">Blog</option>
            <option value="video">Video</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            />
            Pin to top of BookTok
          </label>
        </div>

        <div className="mt-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Body</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            rows={5}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </div>

        {form.type === "video" && (
          <div className="mt-3">
            <Input
              label="Video URL (YouTube or Vimeo)"
              placeholder="https://www.youtube.com/watch?v=…"
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            />
          </div>
        )}

        <div className="mt-3">
          <Input
            label="Cover image URL (optional)"
            value={form.cover_image_url}
            onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Publish"}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={startNew}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">All posts</h2>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold text-slate-900">
                  {p.pinned && "📌 "}
                  {p.title} <span className="text-xs font-normal text-slate-400">({p.type})</span>
                </p>
                <p className="text-xs text-slate-400">{new Date(p.published_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="!text-xs" onClick={() => togglePin(p)}>
                  {p.pinned ? "Unpin" : "Pin"}
                </Button>
                <Button variant="secondary" className="!text-xs" onClick={() => startEdit(p)}>
                  Edit
                </Button>
                <Button variant="ghost" className="!text-xs text-red-500" onClick={() => remove(p.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-slate-500">No posts yet.</p>}
        </div>
      )}
    </div>
  );
}