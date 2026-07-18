"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ParentChildProfileData {
  id: string;
  display_name: string;
}

interface ShelfItem {
  id: string;
  status: string;
  progress_percent: number;
  book: { title: string; author: string };
}

export function ParentBooksClient({ initialChildren }: { initialChildren: ParentChildProfileData[] }) {
  const linkedChildren = initialChildren;
  const supabase = createClient();
  const [selectedChild, setSelectedChild] = useState(linkedChildren[0]?.id ?? "");
  // ...rest of the component (shelf state, useEffect, search, addBook, JSX)
  // stays exactly the same — just delete the
  // `collectParentChildProfiles`/`ParentChildProfile` import.