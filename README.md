# FitLog

FitLog is a mobile-first personal health tracker with private profiles, food entries, daily nutrition progress, and weigh-ins.

## Set up

1. For a new Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. For an existing project, run migrations in order: `20261109000100_profile_calorie_inputs.sql`, `20261109000200_create_weigh_ins.sql`, `20261109000300_food_entries_and_protein_settings.sql`, `20261109000400_food_entry_guessed_flag.sql`, then `20261109000500_user_food_memory.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key. Set `NEXT_PUBLIC_SITE_URL` to your app URL when it differs from `http://localhost:3000`.
   Add `GEMINI_API_KEY` to `.env.local` for natural-language food parsing. It is read only by the server route and must not use a `NEXT_PUBLIC_` prefix.
3. In Supabase Authentication, enable email sign-in, keep email confirmation enabled, and add your local and deployed callback URLs (`http://localhost:3000/auth/callback` and your deployed `/auth/callback`) to the allowed redirect URLs.
4. Run `npm install`, then `npm run dev`.

In local development, the login page uses a demo session so you can build without Supabase email delivery. Demo profile, food, and weight data are kept in local HTTP-only cookies and are not written to Supabase. Production uses Supabase Auth and per-user row-level security.

Only the public Supabase URL and anon key are used. Profile reads and writes require a signed-in user, and the database RLS policies restrict each profile row to its owner.

The editable estimate is in `src/lib/calorie-target.ts`. It estimates BMR with Mifflin-St Jeor, multiplies by the selected activity factor for maintenance, and applies a 7,700 kcal/kg adjustment. Planned gain is capped at 0.5 kg/week and planned loss at 0.75 kg/week. A 1,200 kcal/day floor applies to loss goals only; gain and maintenance targets are never raised to that floor. Protein defaults to 1.5 g per kg and can be adjusted from 1.2 to 2.0 g/kg on Profile. These are general estimates, not medical advice.

## Step 2: daily food logging

Open Today to enter foods, update or delete entries, and browse earlier days. Progress contains weigh-ins; Profile contains your calorie calculation and protein setting. The SQL migration creates `food_entries` with owner-only row-level security for reads and writes.

Today also includes Gemini natural-language logging. Gemini parses the text into structured nutrition, but nothing is saved until you review and edit the preview. Estimated values are marked as guessed. The model name is configured once in `src/lib/gemini-config.ts`.

Food memory is off by default. Turn it on in Profile, then choose “Remember this food” for reviewed, non-guessed entries. You can view/edit individual memories, delete them, or clear all. Only matching foods are sent as context to Gemini, and only while memory is enabled. Memory data is stored per user with RLS.

To test AI logging, set `GEMINI_API_KEY` in `.env.local` from Google AI Studio and restart the dev server. Describe several items in the Today box, parse them, review/edit the preview, then save. If Gemini is rate-limited, FitLog shows a retry message. You can still use manual food entry without a Gemini key.

To try it locally, run `npm run dev`, use the demo login, complete onboarding if needed, then add a food entry on Today. Try editing and deleting it, switch to yesterday and back, change protein g/kg in Profile, and add a weigh-in on Progress. For a production/Supabase test, apply the migration above first and sign in with a real Supabase user; verify the food row's `user_id` matches that user's auth ID.

Run the calorie calculation unit tests with `npm test`.
