import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

const items = [
  { id: "today", label: "Today", href: "/today" },
  { id: "exercise", label: "Exercise", href: "/exercise" },
  { id: "progress", label: "Progress", href: "/progress" },
  { id: "profile", label: "Profile", href: "/profile" },
] as const;

export function AppShell({ active, children, mobileAction, sidebarFooter }: { active: (typeof items)[number]["id"]; children: ReactNode; mobileAction?: ReactNode; sidebarFooter?: ReactNode }) {
  return (
    <div className="fit-app">
      <aside className="fit-sidebar">
        <Link href="/today" className="fit-brand" aria-label="FitLog home">FitLog<span>.</span></Link>
        <p className="fit-sidebar-caption">YOUR JOURNAL</p>
        <nav aria-label="Main navigation" className="fit-sidebar-nav">
          {items.map((item) => (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "fit-nav-link is-active" : "fit-nav-link"}>
              <span className="fit-nav-dot" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="fit-sidebar-note">{sidebarFooter ?? "A little attention, day by day."}</div>
      </aside>
      <header className="fit-mobile-header">
        <Link href="/today" className="fit-brand" aria-label="FitLog home">FitLog<span>.</span></Link>
        {mobileAction ?? <Link href="/profile" className="fit-mobile-profile">Profile</Link>}
      </header>
      <main className="fit-main">
        <div className="fit-content">{children}</div>
      </main>
      <BottomNav active={active} />
    </div>
  );
}