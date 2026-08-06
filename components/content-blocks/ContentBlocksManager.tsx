"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Scope = "child" | "classroom";
type BlockType = "book" | "author" | "topic_keyword";

interface Target {
  id: string;
  label: string;
}

interface BlockRow {
  id: string;
  block_type: BlockType;
  author_name: string | null;
  keyword: string | null;
  book: { title: string; author: string } | null;
  targetId: string;
}

function summarize(block: BlockRow): string {
  if (block.block_type === "author") return `Author: ${block.author_name}`;
  if (block.block_type === "topic_keyword") return `Topic: ${block.keyword}`;
  if (block.book) return `Book: ${block.book.title} by ${block.book.author}`;
  return "Book";
}

/**
 * Add/remove content blocks for a single child (scope="child") or
 * classroom (scope="classroom"). Reads and writes public.content_blocks
 * directly via the browser Supabase client — RLS (migration 017) already
 * restricts a parent to their own linked children and a teacher to their
 * own classrooms, so no API route is needed for this.
 */
export function ContentBlocksManager({
  scope,
  blockerId,
  targets,
  emptyTargetsMessage,
}: {
  scope: Scope;
  blockerId: string;
  targets: Target[];
  emptyTargetsMessage: string;
}) {
  const supabase = createClient();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [blockType, setBlockType] = useState<BlockType>("author");
  const [authorName, setAuthorName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBlocks() {
    setLoading(true);
    const targetColumn = scope === "child" ? "child_id" : "classroom_id";
    const { data } = await supabase
      .from("content_blocks")
      .select(`id, block_type, author_name, keyword, target:${targetColumn}, book:books(title, author)`)
      .eq("blocked_by", blockerId);

    setBlocks(
      (data ?? []).map((row) => {
        const bookData = Array.isArray(row.book) ? row.book[0] ?? null : row.book;
        return {
          id: row.id,
          block_type: row.block_type,
          author_name: row.author_name,
          keyword: row.keyword,
          book: bookData,
          targetId: row.target,
        } as BlockRow;
      })
    );
    setLoading(false);
  }

  async function addBlock() {
    setMessage("");
    if (!targetId) {
      setMessage(emptyTargetsMessage);
      return;
    }
    if (blockType === "author" && !authorName.trim()) return;
    if (blockType === "topic_keyword" && !keyword.trim()) return;
    if (blockType === "book" && !bookTitle.trim()) return;

    const payload: Record<string, unknown> = {
      blocked_by: blockerId,
      scope,
      block_type: blockType,
      child_id: scope === "child" ? targetId : null,
      classroom_id: scope === "classroom" ? targetId : null,
    };
    if (blockType === "author") payload.author_name = authorName.trim();
    if (blockType === "topic_keyword") payload.keyword = keyword.trim();
    if (blockType === "book") {
      // Book blocks need a books.id — treat the typed title as a keyword
      // block instead so it still takes effect immediately without a
      // lookup step. (A future pass could add a book search/picker here.)
      payload.block_type = "topic_keyword";
      payload.keyword = bookTitle.trim();
    }

    const { error } = await supabase.from("content_blocks").insert(payload);
    if (error) {
      setMessage("Couldn't add that block: " + error.message);
      return;
    }
    setAuthorName("");
    setKeyword("");
    setBookTitle("");
    await loadBlocks();
  }

  async function removeBlock(id: string) {
    const { error } = await supabase.from("content_blocks").delete().eq("id", id);
    if (error) {
      setMessage("Couldn't remove that block: " + error.message);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const blocksForTarget = blocks.filter((b) => b.targetId === targetId);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold">Content controls</h2>
      <p className="mt-1 text-sm text-slate-500">
        Block a specific book, author, or topic from recommendations, search, Pip chat, and quizzes.
      </p>

      {targets.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyTargetsMessage}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTargetId(t.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  targetId === t.id ? "bg-kids-purple text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Block type</label>
              <select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as BlockType)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-violet-400 focus:ring-2"
              >
                <option value="author">Author</option>
                <option value="topic_keyword">Topic keyword</option>
                <option value="book">Specific book (by title)</option>
              </select>
            </div>
            {blockType === "author" && (
              <Input placeholder="Author name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
            )}
            {blockType === "topic_keyword" && (
              <Input placeholder="e.g. ghosts, zombies" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            )}
            {blockType === "book" && (
              <Input placeholder="Book title" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
            )}
            <Button variant="secondary" onClick={addBlock}>
              Add block
            </Button>
          </div>
          {message && <p className="mt-2 text-sm text-red-600">{message}</p>}

          <ul className="mt-4 space-y-2">
            {loading && <li className="text-sm text-slate-400">Loading…</li>}
            {!loading && blocksForTarget.length === 0 && (
              <li className="text-sm text-slate-400">No blocks yet for this {scope === "child" ? "child" : "classroom"}.</li>
            )}
            {blocksForTarget.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2 text-sm">
                <span>{summarize(b)}</span>
                <button type="button" onClick={() => removeBlock(b.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
