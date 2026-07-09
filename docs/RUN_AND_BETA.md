# Run Book Buddy locally & launch beta

## How the app is built

Book Buddy is a **single Next.js 14 app** that serves both frontend and backend:

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | React + Tailwind, App Router | Pages for kids, parents, teachers |
| **Backend** | Next.js API routes (`app/api/*`) | Reading logs, shelf, classroom join, etc. |
| **Database & auth** | Supabase (hosted) | Users, books, RLS, email/password login |
| **AI (optional)** | Anthropic API | Reading game quizzes; **demo quiz if no key** |

You do **not** run a separate backend server. `npm run dev` starts everything on port 3000.

---

## Prerequisites

1. **[Node.js 20+](https://nodejs.org/)** — includes `npm`
2. **Supabase project** — you already have one (`bcnlcwukhhxqlatkyha.supabase.co`)
3. **Git** (optional, for deploy)

---

## One-time setup

### Step 1 — Database

In [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, run **in order**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_booktok_likes_policy.sql`

If you already ran `001`, only run `002`.

### Step 2 — Auth settings

**Authentication → URL Configuration**

| Setting | Local dev | Production (after Vercel deploy) |
|---------|-----------|----------------------------------|
| Site URL | `http://localhost:3000` | `https://your-app.vercel.app` |
| Redirect URLs | `http://localhost:3000/auth/callback` | Same + `https://your-app.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/reset-password` | `https://your-app.vercel.app/auth/reset-password` |

**Authentication → Providers → Email**

- For easy beta testing: turn **off** “Confirm email” so sign-up works instantly.

### Step 3 — Environment file

In the project root, `.env.local` should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bcnlcwukhhxqlatkyha.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional — leave empty for beta without AI bills
ANTHROPIC_API_KEY=
```

Copy from Supabase → **Settings → API**.

---

## Run locally

Open **PowerShell** or **Terminal**:

```powershell
cd C:\Users\vrisa\Projects\book-buddy
npm install
npm run dev
```

Open **http://localhost:3000**

### Health check

Visit **http://localhost:3000/api/health**

Expected:

```json
{ "status": "ok", "supabase": true, "anthropic": false, "missingEnv": [] }
```

If `misconfigured`, fix the missing variables in `.env.local` and restart `npm run dev`.

### Production build test (optional)

```powershell
npm run build
npm run start
```

Fix any errors before deploying.

---

## Try it out (5-minute beta script)

1. **Landing** — http://localhost:3000 → “Get started”
2. **Teacher** — Register as Teacher → note **join code** on Classroom page
3. **Kid** — Register as Kid (new email) → on Home, enter join code
4. **Shelf** — Search “Charlotte’s Web” → add as Reading → Log session → Finish book (confetti)
5. **Challenges** — Open Challenges (auto-enrolls global challenges)
6. **Reading game** — Pick book → demo quiz (no API key needed)
7. **Parent** — Register as Parent → add child in Settings → Books → add book for child

---

## Launch beta on Vercel (free tier)

### 1. Push code to GitHub

```powershell
cd C:\Users\vrisa\Projects\book-buddy
git init
git add .
git commit -m "Book Buddy beta"
```

Create a repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USER/book-buddy.git
git push -u origin main
```

(Use `.gitignore` — `.env.local` must **not** be committed.)

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. **Environment variables** — add the same four as `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY` (optional, can leave empty)

5. **Deploy**

Your beta URL will look like: `https://book-buddy-xyz.vercel.app`

### 3. Update Supabase for production

In Supabase **URL Configuration**, add your Vercel URL to **Site URL** and **Redirect URLs** (see table above).

Redeploy is not required for Supabase-only changes.

### 4. Share with testers

Send testers:

- The **Vercel URL**
- Short instructions: pick role → teacher shares join code → kids join class
- A note that **Pip Chat** is coming soon

### 5. Beta checklist

- [ ] SQL migrations applied
- [ ] Email confirm disabled (or testers check spam)
- [ ] `/api/health` returns `"status":"ok"` on production URL
- [ ] Register/login works for all three roles
- [ ] Service role key only in Vercel env (never in client code)

---

## Custom domain (optional)

Vercel → Project → **Settings → Domains** → add `bookbuddy.yourdomain.com`

Update Supabase redirect URLs to use that domain.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm` not found | Install Node.js, restart terminal |
| Login redirects loop | Check Supabase Site URL matches where you host the app |
| “Unauthorized” on parent add child | `SUPABASE_SERVICE_ROLE_KEY` missing in env |
| BookTok likes don’t update | Run migration `002_booktok_likes_policy.sql` |
| Reading game error | Without API key, demo quiz should still work; restart dev server |
| RLS errors on insert | Re-run migration `001`; confirm user is logged in |

---

## What’s not in beta yet

- Google sign-in
- Pip Chat (AI buddy)
- Email digests for parents

Add `ANTHROPIC_API_KEY` later for real AI quizzes and Pip when you’re ready.
