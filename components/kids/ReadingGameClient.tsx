"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface ShelfBook {
  id: string;
  book: { id: string; title: string; author: string; description: string | null };
}

interface Question {
  question: string;
  options: string[];
  correct: string;
}

export function ReadingGameClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [selected, setSelected] = useState<ShelfBook | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [step, setStep] = useState<"pick" | "quiz" | "done">("pick");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<
  { display_name: string; score: number }[]
>([]);

  useEffect(() => {
    supabase
      .from("user_books")
      .select("id, book:books(id, title, author, description)")
      .eq("user_id", userId)
      .then(({ data }) => setBooks((data as unknown as ShelfBook[]) ?? []));

    loadLeaderboard();
  }, [userId, supabase]);

  async function loadLeaderboard() {
    const { data: ts } = await supabase
      .from("teacher_student")
      .select("classroom_id")
      .eq("student_id", userId)
      .limit(1)
      .maybeSingle();

    if (!ts?.classroom_id) return;

    const { data: classmates } = await supabase
      .from("teacher_student")
      .select("student_id")
      .eq("classroom_id", ts.classroom_id);

    const ids = classmates?.map((c) => c.student_id) ?? [userId];

    const { data: scores } = await supabase
      .from("reading_game_scores")
      .select("user_id, score, users(display_name)")
      .in("user_id", ids)
      .order("score", { ascending: false })
      .limit(10);

      setLeaderboard(
        (scores ?? []).map((s) => {
          const userData = Array.isArray(s.users) ? s.users[0] : s.users;
          return {
            display_name: (userData as { display_name: string })?.display_name ?? "Reader",
            score: s.score,
          };
        })
      );
  }

  async function startQuiz(book: ShelfBook) {
    setLoading(true);
    setSelected(book);
    const res = await fetch("/api/reading-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        title: book.book.title,
        author: book.book.author,
        description: book.book.description,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.questions) {
      setQuestions(data.questions);
      setStep("quiz");
      setAnswers({});
    } else if (data.error) {
      alert(data.error);
    }
  }

  async function submitQuiz() {
    let correct = 0;
    questions.forEach((q, i) => {
      const picked = answers[i]?.charAt(0);
      if (picked === q.correct) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);

    await fetch("/api/reading-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        bookId: selected!.book.id,
        score: pct,
        correct,
        total: questions.length,
      }),
    });

    setStep("done");
    loadLeaderboard();
  }

  if (step === "done") {
    return (
      <div className="text-center">
        <h1 className="font-kids-display text-3xl font-bold">Quiz complete!</h1>
        <p className="mt-4 text-6xl font-bold text-kids-purple">{score}%</p>
        <Button variant="kids" className="mt-8" onClick={() => setStep("pick")}>
          Play again
        </Button>
      </div>
    );
  }

  if (step === "quiz" && questions.length) {
    return (
      <div>
        <h1 className="font-kids-display text-2xl font-bold">{selected?.book.title}</h1>
        <div className="mt-6 space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="rounded-2xl bg-white p-5 shadow-md">
              <p className="font-semibold">
                {i + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers({ ...answers, [i]: opt })}
                    className={`block w-full rounded-xl border-2 px-4 py-2 text-left text-sm ${
                      answers[i] === opt
                        ? "border-kids-purple bg-violet-50"
                        : "border-slate-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="kids"
          fullWidth
          className="mt-6"
          disabled={Object.keys(answers).length < questions.length}
          onClick={submitQuiz}
        >
          See my score
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Reading Game</h1>
      <p className="mt-2 text-slate-600">Pick a book and answer 5 questions!</p>

{loading ? (
        <p className="mt-8">Generating quiz…</p>
      ) : (
        <div className="mt-6 space-y-2">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => startQuiz(b)}
              className="w-full rounded-xl bg-white p-4 text-left shadow-md hover:shadow-lg"
            >
              <p className="font-bold">{b.book.title}</p>
              <p className="text-sm text-slate-500">{b.book.author}</p>
            </button>
          ))}
          {books.length === 0 && (
            <p className="text-slate-500">Add books to your shelf first!</p>
          )}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-10 rounded-2xl bg-white p-5 shadow-md">
          <h2 className="font-bold">Class leaderboard</h2>
          <ol className="mt-3 space-y-1">
            {leaderboard.map((row, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span>{row.display_name}</span>
                <span className="font-semibold">{row.score}%</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
