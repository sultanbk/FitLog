import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { NavigationIcon, navigationItems, type NavigationId } from "@/components/navigation";

export function AppShell({ active, children, mobileAction, sidebarFooter }: { active: NavigationId; children: ReactNode; mobileAction?: ReactNode; sidebarFooter?: ReactNode }) {
  const activeItem = navigationItems.find((item) => item.id === active)!;
  return (
    <div className="fit-app">
      <aside className="fit-sidebar">
        <Link href="/today" className="fit-brand" aria-label="FitLog home">
          <span className="fit-brand-mark" aria-hidden="true"><span /></span>
          <span className="fit-brand-word">FitLog<span className="fit-brand-period">.</span></span>
        </Link>
        <div className="fit-sidebar-intro">
          <p className="fit-sidebar-caption">YOUR SPACE</p>
          <p className="fit-sidebar-subtitle">Small steps, in one place.</p>
        </div>
        <nav aria-label="Main navigation" className="fit-sidebar-nav">
          <p className="fit-nav-section-label">OVERVIEW</p>
          {navigationItems.map((item) => (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "fit-nav-link is-active" : "fit-nav-link"}>
              <span className="fit-nav-icon-wrap"><NavigationIcon id={item.id} /></span>
              <span>{item.label}</span>
              {active === item.id && <span className="fit-nav-active-mark" aria-hidden="true" />}
            </Link>
          ))}
        </nav>
        <div className="fit-sidebar-bottom">
          {!sidebarFooter && <div className="fit-sidebar-note"><span className="fit-note-spark" aria-hidden="true">✳</span><p>A little attention, day by day.</p></div>}
          {sidebarFooter && <div className="fit-sidebar-account">{sidebarFooter}</div>}
          <p className="fit-sidebar-version">YOUR PERSONAL HEALTH JOURNAL</p>
        </div>
      </aside>
      <header className="fit-mobile-header">
        <div className="fit-mobile-heading">
          <Link href="/today" className="fit-brand" aria-label="FitLog home">
            <span className="fit-brand-mark" aria-hidden="true"><span /></span>
            <span className="fit-brand-word">FitLog<span className="fit-brand-period">.</span></span>
          </Link>
          <span className="fit-mobile-divider" aria-hidden="true" />
          <span className="fit-mobile-current">{activeItem.label}</span>
        </div>
        {mobileAction ?? <Link href="/profile" className="fit-mobile-profile" aria-label="Open profile"><NavigationIcon id="profile" /></Link>}
      </header>
      <main className="fit-main">
        <div className="fit-content">{children}</div>
      </main>
      <BottomNav active={active} />
    </div>
  );
}