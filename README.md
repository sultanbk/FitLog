# FitLog

FitLog is a private, mobile-first health tracker for Tipu, Shrutika GK, and Saukan. Each person signs in with a username and password; account creation is limited to the three manually provisioned accounts.

## Set up

1. For a new Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. For an existing project, run migrations in order: `20261109000100_profile_calorie_inputs.sql`, `20261109000200_create_weigh_ins.sql`, `20261109000300_food_entries_and_protein_settings.sql`, `20261109000400_food_entry_guessed_flag.sql`, `20261109000500_user_food_memory.sql`, `20261109000600_quick_adds.sql`, `20261109000700_gemini_food_opt_in.sql`, `20261109000800_food_memory_servings.sql`, `20261110000100_create_exercise_logs.sql`, `20261110000200_edit_quick_adds.sql`, `20261110000300_weekly_reflection_consent.sql`, and `20261110000400_gemini_meal_ideas_consent.sql`.
2. Copy `.env.example` to `.env.local` and set the Supabase URL, anon key, Gemini key, and service-role key. The service-role key is only needed to provision the three accounts. Never expose it to browser code or commit it.
3. In Supabase Auth, enable email/password sign-in and disable public sign-ups. FitLog uses internal addresses for usernames, so it does not send sign-in links.
4. Run `npm install`, then `npm run dev`.

## Create the three accounts

With the service-role key in `.env.local`, run `npm run provision:users` once. It creates `tipu`, `shrutikagk`, and `saukan` and prints a different random starter password for each new account. Share each username and password privately with that person. The script skips existing users; reset an existing password in the Supabase dashboard. Each person can change their password under Profile after signing in. There is no self-signup or email-based password recovery.

Local development and production both use the same Supabase username/password login and per-user row-level security. The app does not log you out when switching environments; any existing Supabase browser session is kept.

If Today, Exercise, or Progress reports that a database table is missing, verify `.env.local` points to the intended Supabase project and run the migration named on the setup screen in that project’s SQL Editor. After applying it, refresh the page; if the table still is not detected, refresh the Supabase schema cache and confirm the migration was applied to the configured project.

Unfinished food, exercise, weight, and profile forms can be restored from session-only browser drafts. Drafts remain in the current tab, are never sent to Supabase until you submit, exclude passwords, and are cleared after successful saves or when signing out.

## Food and goals

Today supports Gemini food parsing with one optional portion follow-up for ambiguous amounts, optional on-demand meal ideas, manual entry, and saved food favorites that can be added in one tap or edited without changing past entries. Guessed portions and nutrition are labeled for review. Users can correct estimates and remember only values they have verified. Meal ideas are separately opt-in, use only today’s macro totals and up to eight saved favorite names, and never write to the journal. Nutrition values are estimates. The separate Exercise tab supports private push-up logging and daily history. Gemini parsing is opt-in in Profile; nothing is saved until the user reviews and edits the preview. Google’s unpaid Gemini API tier may use submitted content to improve its services and may allow human review. Food memory has a separate opt-in and is sent only with matching descriptions when enabled.

## Progress and activity

Progress includes weekly (7-day), monthly (30-day), and yearly (12-calendar-month) charts for logged calories, protein, weigh-ins, and push-ups. An optional, on-demand Gemini reflection uses only FitLog-calculated seven-day totals and weekday logging counts; it does not send food names, individual entries, or weight, and requires separate consent in Profile. Google’s unpaid API tier may use submitted content to improve Google services and may allow human review. A monthly calendar marks dates with entries and links back to that day’s journal. Nutrition averages use days with food entries; weight chart points are averages of recorded weigh-ins within each interval. Empty days are not treated as zero-intake days.

The editable calorie estimate is in `src/lib/calorie-target.ts`. Targets are general estimates, not medical advice.