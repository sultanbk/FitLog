import Link from "next/link";

export function BottomNav({ active }: { active: "today" | "exercise" | "progress" | "profile" | "settings" }) {
  const items = [{ id: "today", label: "Today", href: "/today" }, { id: "exercise", label: "Exercise", href: "/exercise" }, { id: "progress", label: "Progress", href: "/progress" }, { id: "profile", label: "Profile", href: "/profile" }, { id: "settings", label: "Settings", href: "/settings" }] as const;
  return <nav aria-label="Main navigation" className="fit-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur lg:hidden"><div className="mx-auto grid max-w-xl grid-cols-5">{items.map((item) => <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`rounded-lg py-2.5 text-center text-xs font-medium transition-colors sm:text-sm ${active === item.id ? "text-[#3e5944]" : "text-[#7b8077] hover:text-[#3e5944]"}`}>{item.label}</Link>)}</div></nav>;
}
