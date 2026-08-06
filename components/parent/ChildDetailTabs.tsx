"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";

interface BookRef {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  genre: string | null;
}
interface EventRef {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
}
interface BadgeRef {
  id: string;
  name: string;
  icon: string;
  description: string | null;
}

interface Props {
  last7Days: { label: string; minutes: number }[];
  currentlyReading: { progressPercent: number; book: BookRef | null }[];
  finishedBooks: { finishedAt: string | null; book: BookRef | null }[];
  wantToRead: { book: BookRef | null }[];
  eventEntries: { progress: number; rank: number | null; event: EventRef | null }[];
  badges: { earnedAt: string; badge: BadgeRef | null }[];
  submissions: {
    id: string;
    title: string;
    votes: number;
    isWinner: boolean;
    createdAt: string;
    competitionTitle: string | null;
  }[];
}

const TABS = ["Overview", "Books", "Reading Time", "Events", "Discover"] as const;
type Tab = (typeof TABS)[number];

function BookRow({ book, right }: { book: BookRef | null; right?: ReactNode }) {
  if (!book) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      {book.cover_url ? (
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded">
          <Image src={book.cover_url} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-slate-200 text-lg">📕</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{book.title}</p>
        <p className="truncate text-sm text-parent-muted">
          {book.author}
          {book.genre ? ` · ${book.genre}` : ""}
        </p>
      </div>
      {right}
    </div>
  );
}

export function ChildDetailTabs(props: Props) {
  const [tab, setTab] = useState<Tab>("Overview");
  const maxMinutes = Math.max(1, ...props.last7Days.map((d) => d.minutes));
  const totalMinutesWeek = props.last7Days.reduce((a, d) => a + d.minutes, 0);

  const placements = props.eventEntries.filter((e) => e.event);
  const wonBooks = props.finishedBooks.filter((b) => b.book);

  return (
    <div className="mt-6">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-[40px] shrink-0 rounded-lg px-4 text-sm font-semibold transition ${
              tab === t ? "bg-parent-primary text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
        {tab === "Overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900">This week</h3>
              <div className="mt-3 flex items-end gap-2">
                {props.last7Days.map((d) => (
                  <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end rounded-md bg-slate-50">
                      <div
                        className="w-full rounded-md bg-parent-primary transition-all"
                        style={{ height: `${Math.max(4, (d.minutes / maxMinutes) * 100)}%` }}
                        title={`${d.minutes} min`}
                      />
                    </div>
                    <span className="text-xs text-parent-muted">{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-parent-muted">{totalMinutesWeek} minutes read this week</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">Badges earned ({props.badges.length})</h3>
              {props.badges.length === 0 ? (
                <p className="mt-2 text-sm text-parent-muted">No badges yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {props.badges.map(
                    (b) =>
                      b.badge && (
                        <span
                          key={b.badge.id}
                          title={b.badge.description ?? b.badge.name}
                          className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800"
                        >
                          <span aria-hidden="true">{b.badge.icon}</span> {b.badge.name}
                        </span>
                      )
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">Writing competitions</h3>
              {props.submissions.length === 0 ? (
                <p className="mt-2 text-sm text-parent-muted">No submissions yet.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {props.submissions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {s.title} {s.isWinner && "🏆"}
                        </p>
                        <p className="text-parent-muted">{s.competitionTitle ?? "Writing competition"}</p>
                      </div>
                      <span className="text-parent-muted">{s.votes} votes</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Books" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900">Currently reading</h3>
              {props.currentlyReading.length === 0 ? (
                <p className="mt-2 text-sm text-parent-muted">Not currently reading anything.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {props.currentlyReading.map(
                    (r, i) =>
                      r.book && (
                        <BookRow
                          key={r.book.id + i}
                          book={r.book}
                          right={<span className="text-sm font-semibold text-parent-primary">{r.progressPercent}%</span>}
                        />
                      )
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Finished ({wonBooks.length})</h3>
              {wonBooks.length === 0 ? (
                <p className="mt-2 text-sm text-parent-muted">No finished books yet.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {wonBooks.map(
                    (r, i) =>
                      r.book && (
                        <BookRow
                          key={r.book.id + i}
                          book={r.book}
                          right={
                            <span className="whitespace-nowrap text-xs text-parent-muted">
                              {r.finishedAt ? new Date(r.finishedAt).toLocaleDateString() : ""}
                            </span>
                          }
                        />
                      )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Reading Time" && (
          <div>
            <h3 className="font-semibold text-slate-900">Last 7 days</h3>
            <div className="mt-3 space-y-2">
              {props.last7Days.map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-10 text-sm text-parent-muted">{d.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-parent-primary"
                      style={{ width: `${Math.max(2, (d.minutes / maxMinutes) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-slate-700">{d.minutes} min</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Events" && (
          <div>
            <h3 className="font-semibold text-slate-900">Weekend event participation</h3>
            {placements.length === 0 ? (
              <p className="mt-2 text-sm text-parent-muted">Hasn&apos;t joined a weekend event yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {placements.map(
                  (e, i) =>
                    e.event && (
                      <div key={e.event.id + i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">{e.event.title}</p>
                          <p className="text-parent-muted">
                            {new Date(e.event.starts_at).toLocaleDateString()} · progress {e.progress}
                          </p>
                        </div>
                        <span className="font-semibold text-parent-primary">
                          {e.rank ? `#${e.rank}` : e.event.status === "closed" ? "Unranked" : "In progress"}
                        </span>
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        )}

        {tab === "Discover" && (
          <div>
            <h3 className="font-semibold text-slate-900">Wants to read ({props.wantToRead.length})</h3>
            {props.wantToRead.length === 0 ? (
              <p className="mt-2 text-sm text-parent-muted">
                Nothing queued up right now — books they save from Discover will show up here.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {props.wantToRead.map((r, i) => r.book && <BookRow key={r.book.id + i} book={r.book} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
