import { AppShell } from "@/components/app-shell";
import type { DatabaseSetupIssue } from "@/lib/database-setup";

type Props = {
  active: "today" | "exercise" | "progress" | "profile" | "settings";
  issue: DatabaseSetupIssue;
};

export function DatabaseSetupNotice({ active, issue }: Props) {
  return (
    <AppShell active={active}>
      <section className="fit-card mx-auto mt-8 max-w-2xl" aria-labelledby="database-setup-title">
        <p className="fit-eyebrow">One setup step needed</p>
        <h1 id="database-setup-title" className="mt-2 text-3xl">Connect this page to your database</h1>
        <p className="mt-3 text-sm leading-6 text-[#62685f]">
          {issue.column ? (
            <>FitLog can’t find <code className="rounded bg-[#f3f1eb] px-1.5 py-0.5">public.{issue.table}.{issue.column}</code> in the configured Supabase project.</>
          ) : (
            <>FitLog can’t find <code className="rounded bg-[#f3f1eb] px-1.5 py-0.5">public.{issue.table}</code> in the configured Supabase project.</>
          )}
          Your existing entries are not changed by this check.
        </p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#454c42]">
          <li>Confirm that this app’s <code className="rounded bg-[#f3f1eb] px-1.5 py-0.5">.env.local</code> points to the Supabase project you intend to use.</li>
          <li>Open that project’s Supabase Dashboard, then open <strong>SQL Editor</strong>.</li>
          <li>For an existing project, apply any unapplied migrations in the order listed in the README, including:
            <ul className="mt-2 space-y-1">
              {issue.migrations.map((migration) => (
                <li key={migration}><code className="rounded bg-[#f3f1eb] px-1.5 py-0.5">{migration}</code></li>
              ))}
            </ul>
          </li>
          <li>Return here and refresh. If you already applied the migrations, run <code className="rounded bg-[#f3f1eb] px-1.5 py-0.5">{"NOTIFY pgrst, 'reload schema';"}</code> in SQL Editor and confirm they were applied to this project.</li>
        </ol>
        <p className="mt-5 border-t border-[#efede7] pt-4 text-xs leading-5 text-[#7b8077]">
          For a new project, use <code>supabase/schema.sql</code> instead of applying individual migrations.
        </p>
      </section>
    </AppShell>
  );
}
