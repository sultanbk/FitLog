# FitLog

Step 1 of FitLog: email magic-link login, private profile onboarding, and a calorie-target dashboard.

## Set up

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key. Set `NEXT_PUBLIC_SITE_URL` to your app URL when it differs from `http://localhost:3000`.
3. In Supabase Authentication, enable email sign-in and add your local and deployed callback URLs (`http://localhost:3000/auth/callback` and your deployed `/auth/callback`) to the allowed redirect URLs.
4. Run `npm install`, then `npm run dev`.

Only the public Supabase URL and anon key are used. Profile reads and writes require a signed-in user, and the database RLS policies restrict each profile row to its owner.

The editable estimate is in `src/lib/calorie-target.ts`. It uses a simple weight-based maintenance estimate and limits the planned change to 0.5 kg per week; height is collected and saved but does not change this estimate. This is not medical advice.
