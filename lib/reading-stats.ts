export interface ReadingSessionRow {
  date: string;
  minutes_read: number;
}

export function calculateStreak(sessions: ReadingSessionRow[]): number {
  if (sessions.length === 0) return 0;

  const dates = new Set(
    sessions.map((s) => s.date.split("T")[0])
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (dates.has(key)) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export function sumMinutesInRange(
  sessions: ReadingSessionRow[],
  start: Date,
  end: Date
): number {
  const startKey = start.toISOString().split("T")[0];
  const endKey = end.toISOString().split("T")[0];
  return sessions
    .filter((s) => {
      const d = s.date.split("T")[0];
      return d >= startKey && d <= endKey;
    })
    .reduce((acc, s) => acc + (s.minutes_read ?? 0), 0);
}
