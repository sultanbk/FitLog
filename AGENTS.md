# FitLog – project rules

## What this is
A private health tracker for me and friends: users log food (typed text parsed by AI, or one-tap quick adds), exercise (push-ups), and weight, against personal goals.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (auth + Postgres)
- Gemini API, called ONLY from server-side API routes
- Deploy on free tiers (Vercel + Supabase)

## Hard rules
1. Data is private by default. Use Supabase row-level security so a user can only read their own rows.
2. Sharing is opt-in, per friend, via a `shares` table. Never expose another user's data without a share record.
3. API keys live in environment variables, never in browser code or git.
4. AI food parsing must return strict JSON; validate it in code. Never save AI output without showing an editable preview first.
5. Mark uncertain AI estimates as "guessed" so the user can check them.
6. Goals need safe limits (cap weekly weight change) and show a small "not medical advice" note.
7. Keep the Gemini model name in one config constant (models get retired).
8. Handle 429 rate-limit errors with a friendly retry message.

## Data tables
profiles, food_entries, quick_adds, exercise_logs, weigh_ins, shares, food_memory (a user's corrected "my usual" items)

## Working style
- Build one small feature per task, then stop.
- Explain changes in plain language.
- Don't add features I didn't ask for.