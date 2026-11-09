export const navigationItems = [
  { id: "today", label: "Today", href: "/today" },
  { id: "exercise", label: "Exercise", href: "/exercise" },
  { id: "progress", label: "Progress", href: "/progress" },
  { id: "profile", label: "Profile", href: "/profile" },
  { id: "settings", label: "Settings", href: "/settings" },
] as const;

export type NavigationId = (typeof navigationItems)[number]["id"];

export function NavigationIcon({ id }: { id: NavigationId }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="fit-nav-icon" {...common}>
      {id === "today" && <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.5V20h11V9.5M9.5 20v-6h5v6" /></>}
      {id === "exercise" && <><path d="M7 8v8M4.5 9.5v5M17 8v8m2.5-6.5v5M7 12h10" /></>}
      {id === "progress" && <><path d="M4 19.5h16" /><path d="m5.5 15 4-4 3 2.5 5.5-6" /><path d="M15.5 7.5H18v2.5" /></>}
      {id === "profile" && <><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.5-3.5 2.7-5.25 6.5-5.25s6 1.75 6.5 5.25" /></>}
      {id === "settings" && <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.2 13.5 1.1.8-1.6 2.8-1.3-.5a7.5 7.5 0 0 1-1.5.9l-.2 1.4h-3.2l-.2-1.4a7.5 7.5 0 0 1-1.5-.9l-1.3.5-1.6-2.8 1.1-.8a7 7 0 0 1 0-1.8l-1.1-.8 1.6-2.8 1.3.5a7.5 7.5 0 0 1 1.5-.9l.2-1.4h3.2l.2 1.4a7.5 7.5 0 0 1 1.5.9l1.3-.5 1.6 2.8-1.1.8a7 7 0 0 1 0 1.8Z" /></>}
    </svg>
  );
}
