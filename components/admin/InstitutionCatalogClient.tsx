"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Institution {
  id: string;
  name: string;
  code: string;
  type: "school" | "company";
  bookCount: number;
}

interface ParsedBook {
  isbn: string;
  title: string;
  author: string;
  available_copies?: number;
}

/** Minimal CSV line splitter: handles simple double-quoted fields, not full RFC 4180 (no embedded newlines in a field). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCatalogText(text: string): { books: ParsedBook[]; error: string | null } {
  const trimmed = text.trim();
  if (!trimmed) return { books: [], error: "Paste some CSV or JSON first." };

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return { books: [], error: "JSON must be an array of books." };
      return {
        books: parsed.map((b) => ({
          isbn: String(b.isbn ?? ""),
          title: String(b.title ?? ""),
          author: String(b.author ?? ""),
          available_copies: Number(b.available_copies ?? 1),
        })),
        error: null,
      };
    } catch {
      return { books: [], error: "Couldn't parse that JSON." };
    }
  }

  const lines = trimmed.split("\n").filter((l) => l.trim());
  const looksLikeHeader = /isbn/i.test(lines[0]) && /title/i.test(lines[0]);
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;

  const books = dataLines.map((line) => {
    const [isbn, title, author, copies] = parseCsvLine(line);
    return { isbn: isbn ?? "", title: title ?? "", author: author ?? "", available_copies: copies ? Number(copies) : 1 };
  });

  return { books, error: null };
}

export function InstitutionCatalogClient() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"school" | "company">("school");
  const [creating, setCreating] = useState(false);

  const [catalogText, setCatalogText] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/institution-catalog");
    const data = await res.json().catch(() => ({}));
    const list: Institution[] = res.ok ? data.institutions ?? [] : [];
    setInstitutions(list);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    setLoading(false);
  }

  async function createInstitution() {
    setError("");
    if (!newName.trim() || !newCode.trim()) {
      setError("Fill in name and code.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/institution-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_institution", name: newName.trim(), code: newCode.trim(), type: newType }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't create that institution.");
      return;
    }
    setNewName("");
    setNewCode("");
    await load();
  }

  async function uploadCatalog() {
    setError("");
    setMessage("");
    if (!selectedId) {
      setError("Pick an institution first.");
      return;
    }
    const { books, error: parseError } = parseCatalogText(catalogText);
    if (parseError) {
      setError(parseError);
      return;
    }
    setUploading(true);
    const res = await fetch("/api/admin/institution-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upload_books", institutionId: selectedId, books }),
    });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't upload that catalog.");
      return;
    }
    setMessage(`Uploaded ${data.uploaded} books.`);
    setCatalogText("");
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-admin-primary">Institution Catalogs</h1>
      <p className="mt-1 text-admin-muted">Upload a school or company&apos;s library so kids see availability badges.</p>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-admin-primary">New institution</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="Code (unique)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "school" | "company")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
          >
            <option value="school">School</option>
            <option value="company">Company</option>
          </select>
        </div>
        <Button variant="secondary" className="mt-3" disabled={creating} onClick={createInstitution}>
          {creating ? "Creating…" : "Create institution"}
        </Button>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-admin-primary">Upload catalog</h2>
        {loading ? (
          <p className="mt-2 text-sm text-admin-muted">Loading…</p>
        ) : institutions.length === 0 ? (
          <p className="mt-2 text-sm text-admin-muted">Create an institution first.</p>
        ) : (
          <>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.bookCount} books)
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm text-admin-muted">
              Paste CSV (isbn,title,author,available_copies — header row optional) or a JSON array of{" "}
              {`{ isbn, title, author, available_copies }`}.
            </p>
            <textarea
              value={catalogText}
              onChange={(e) => setCatalogText(e.target.value)}
              rows={10}
              placeholder={"isbn,title,author,available_copies\n9780000000001,Charlotte's Web,E.B. White,3"}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none focus:border-slate-400 focus:ring-2"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
            <Button variant="secondary" className="mt-3" disabled={uploading} onClick={uploadCatalog}>
              {uploading ? "Uploading…" : "Upload catalog"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
