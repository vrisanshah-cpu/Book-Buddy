# Book Buddy

A safe reading companion for kids 5–12, with parent and teacher dashboards.  
**Stack:** Next.js 14 (frontend + API) · Supabase (auth + database) · Optional Anthropic (quizzes / Pip later).

---

## Architecture (frontend + backend)

```
Browser  →  Next.js (pages + API routes)  →  Supabase (Postgres + Auth)
                ↑
         No separate backend server
```

- **Frontend:** `app/kids`, `app/parent`, `app/teacher`, `app/auth`
- **Backend:** `app/api/*` (reading, shelf, classroom, booktok, etc.)
- **Data:** Supabase tables + Row Level Security

---

## Quick start

**Full guide:** [docs/RUN_AND_BETA.md](docs/RUN_AND_BETA.md) (local run + Vercel beta launch)

```powershell
cd C:\Users\vrisa\Projects\book-buddy
npm install
npm run dev
```

Open **http://localhost:3000** · Health check: **http://localhost:3000/api/health**

### Before first run

1. Run SQL in Supabase: `supabase/migrations/001_initial_schema.sql` and `002_booktok_likes_policy.sql`
2. Configure `.env.local` (see `.env.example`) — Supabase keys required; **Anthropic optional**
3. Supabase Auth: set redirect URLs; disable email confirm for easy testing

### Verify setup (Windows)

```powershell
.\scripts\verify-setup.ps1
```

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client-safe key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Parent create-child (server only) |
| `ANTHROPIC_API_KEY` | No | AI quizzes; **demo quiz used if empty** |

Never commit `.env.local`.

---

## Beta testing on Vercel

1. Push repo to GitHub (without `.env.local`)
2. [vercel.com](https://vercel.com) → Import project → add env vars
3. Update Supabase **Site URL** + **Redirect URLs** to your Vercel domain
4. Share link with testers

Details: [docs/RUN_AND_BETA.md](docs/RUN_AND_BETA.md)

---

## Features (current)

- **Kids:** shelf, challenges, reading game (demo or AI), BookTok, book clubs, classroom join
- **Parents:** dashboard, child books, settings, book clubs
- **Teachers:** classroom codes, progress + CSV, book lists, challenges, club moderation
- **Not yet:** Google login, Pip Chat
- **Feedback:** Google Form embed at `/feedback` + modal from nav (beta survey)

---

## Security

Rotate Supabase keys if they were exposed. Service role key must only live in server env (Vercel / `.env.local`).
