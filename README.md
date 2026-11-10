# FitLog

FitLog is a private, mobile-first health tracker for Tipu, Shrutika GK, and Saukan. Each person signs in with a username and password; account creation is limited to the three manually provisioned accounts.

## Set up

1. For a new Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. For an existing project, run migrations in order: `20261109000100_profile_calorie_inputs.sql`, `20261109000200_create_weigh_ins.sql`, `20261109000300_food_entries_and_protein_settings.sql`, `20261109000400_food_entry_guessed_flag.sql`, `20261109000500_user_food_memory.sql`, `20261109000600_quick_adds.sql`, `20261109000700_gemini_food_opt_in.sql`, `20261109000800_food_memory_servings.sql`, `20261110000100_create_exercise_logs.sql`, `20261110000200_edit_quick_adds.sql`, `20261110000300_weekly_reflection_consent.sql`, `20261110000400_gemini_meal_ideas_consent.sql`, `20261110000500_clear_my_fitlog_data.sql`, `20261110000600_user_gemini_keys.sql`, `20261110000700_gemini_coach_opt_in.sql`, and `20261110000800_fitlog_coach_rate_limit.sql`.
2. Copy `.env.example` to `.env.local` and set the Supabase URL, anon key, encryption secret, and optionally the shared Gemini key. The service-role key is only needed to provision the three accounts. Never expose it to browser code or commit it.
3. In Supabase Auth, enable email/password sign-in and disable public sign-ups. FitLog uses internal addresses for usernames, so it does not send sign-in links.
4. Run `npm install`, then `npm run dev`.

## Create the three accounts

With the service-role key in `.env.local`, run `npm run provision:users` once. It creates `tipu`, `shrutikagk`, and `saukan` and prints a different random starter password for each new account. Share each username and password privately with that person. The script skips existing users; reset an existing password in the Supabase dashboard. Each person can change their password under Profile after signing in. There is no self-signup or email-based password recovery.

Local development and production both use the same Supabase username/password login and per-user row-level security. The app does not log you out when switching environments; any existing Supabase browser session is kept.

If Today, Exercise, or Progress reports that a database table is missing, verify `.env.local` points to the intended Supabase project and run the migration named on the setup screen in that project’s SQL Editor. After applying it, refresh the page; if the table still is not detected, refresh the Supabase schema cache and confirm the migration was applied to the configured project.

### Free hosting

Vercel Hobby is the recommended host for this Next.js app; Supabase Free can provide Auth and Postgres. Connect the GitHub repository to Vercel and import it as a Next.js project. Before deploying, apply all Supabase migrations above and provision the accounts.

In Vercel Project Settings → Environment Variables, configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_USER_KEY_ENCRYPTION_SECRET` (required for personal Gemini keys)
- `GEMINI_API_KEY` (optional shared fallback key for accounts without their own)

Generate a new encryption secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and keep it only in local/Vercel server environment variables. Do not change or lose it after users save keys; encrypted personal keys cannot be decrypted without the same secret. Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel; it is only needed locally when provisioning accounts.

After the first deploy, set the deployed app URL as the Supabase Auth Site URL and add it to the allowed redirect URLs. Use HTTPS and verify login, password change, logging, and each Gemini feature. Vercel Hobby is free for personal projects; check its current usage limits and terms before using it commercially. Supabase Free includes 500 MB database space and can pause projects after one week of inactivity, so occasional wake-up may be needed.

For faster signed-in requests, deploy the Vercel Functions in the same or a nearby region as the Supabase project. Check the Supabase project region in its dashboard before changing the Vercel function region; a distant region adds network delay to every database request.

The Profile page is a concise overview. Settings contains nutrition, the encrypted personal Gemini key, separate FitLog Coach consent, food memory, password, and data management. Gemini features activate automatically when a personal or shared key is configured; a personal key takes precedence over the shared server key. Gemini calls remain user-triggered, and Settings explains what each feature sends. FitLog Coach stays off until separately enabled, can only read profile/log context, keeps chat history temporarily in the page rather than saving it, and is limited to 10 replies per signed-in user per rolling hour. Demo mode does not store personal keys.

The Settings page has a **Clear all data** action. It permanently removes your FitLog profile, logs, saved foods, preferences, and encrypted personal Gemini key, but keeps your sign-in account. You must complete onboarding again to use the app.

Unfinished food, exercise, weight, and profile forms can be restored from session-only browser drafts. Drafts remain in the current tab, are never sent to Supabase until you submit, exclude passwords, and are cleared after successful saves or when signing out.

## Food and goals

Today supports Gemini food parsing with one optional portion follow-up for ambiguous amounts, optional on-demand meal ideas, manual entry, and saved food favorites that can be added in one tap or edited without changing past entries. Manual entry includes a locally bundled, searchable catalog of 528 Indian food records with nutrition values derived from IFCT 2017; it loads only when searched and makes no runtime API/database request. Values are per 100 g edible portion, scale by the entered gram amount, and are marked guessed until the user verifies them. This is an ingredient/food composition catalog, not a prepared-recipe database; preparation and household portions vary. Attribution and the source package's MIT license are included in `src/data/IFCT2017-LICENSE.txt`. Guessed portions and nutrition are labeled for review. Users can correct estimates and remember only values they have verified. Meal ideas use only today’s macro totals and up to eight saved favorite names, and never write to the journal. FitLog Coach is an optional read-only chat on Today and Profile; after a separate Settings opt-in, each message sends profile details, today’s food and exercise entries, recent seven-day totals, and recent weigh-ins to Gemini. Answers are prompted to cite dates, acknowledge missing or guessed data, and avoid resolving conflicting records silently; the UI also shows the exact evidence summary sent with each reply. Chat history is temporary and not saved by FitLog, and each user has a limit of 10 Coach replies per rolling hour. Nutrition values are estimates. The separate Exercise tab supports private push-up logging and daily history. Gemini parsing never saves anything until the user reviews and edits the preview. Google’s unpaid Gemini API tier may use submitted content to improve its services and may allow human review; Google advises against submitting personal or sensitive information to unpaid services. Food memory has a separate opt-in and is sent only with matching descriptions when enabled.

## Progress and activity

Progress includes weekly (7-day), monthly (30-day), and yearly (12-calendar-month) charts for logged calories, protein, weigh-ins, and push-ups. A gentle check-in streak counts a day when at least one food or exercise log is saved; multiple logs count once, and weigh-ins or calorie targets do not count. The weekly goal is three days, Monday through Sunday in the app’s India timezone. This week’s progress is shown separately from consecutive completed-week streaks, which are only updated after a week ends. The feature is descriptive, not a judgment or medical measure. Progress also shows how many food entries in the selected period are marked as estimates; those entries remain included in nutrition totals, and unmarked manual values are not independently verified. An optional, on-demand Gemini reflection uses only FitLog-calculated seven-day totals and weekday logging counts; it does not send food names, individual entries, or weight. Google’s unpaid API tier may use submitted content to improve Google services and may allow human review. A monthly calendar marks dates with entries and links back to that day’s journal. Nutrition averages use days with food entries; weight chart points are averages of recorded weigh-ins within each interval. Empty days are not treated as zero-intake days.

The editable calorie estimate is in `src/lib/calorie-target.ts`. Targets are general estimates, not medical advice.