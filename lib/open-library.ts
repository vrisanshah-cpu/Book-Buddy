export interface OpenLibraryBook {
  title: string;
  author: string;
  cover_url: string | null;
  description: string;
}

export async function searchOpenLibrary(
  query: string
): Promise<OpenLibraryBook[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`
  );
  if (!res.ok) return [];

  const data = await res.json();
  const docs = data.docs ?? [];

  return docs.map(
    (doc: {
      title?: string;
      author_name?: string[];
      cover_i?: number;
      first_sentence?: string[];
    }) => ({
      title: doc.title ?? "Unknown Title",
      author: doc.author_name?.[0] ?? "Unknown Author",
      cover_url: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      description: doc.first_sentence?.[0] ?? "",
    })
  );
}
export async function searchByAuthor(author: string): Promise<OpenLibraryBook[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(`author:"${author}"`)}&limit=20`
  );
  if (!res.ok) return [];

  const data = await res.json();
  const docs = data.docs ?? [];

  return docs.map(
    (doc: {
      title?: string;
      author_name?: string[];
      cover_i?: number;
      first_sentence?: string[];
    }) => ({
      title: doc.title ?? "Unknown Title",
      author: doc.author_name?.[0] ?? author,
      cover_url: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      description: doc.first_sentence?.[0] ?? "",
    })
  );
}