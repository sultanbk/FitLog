import Link from "next/link";

export function BottomNav({ active }: { active: "today" | "progress" | "profile" }) {
  const items = [{ id: "today", label: "Today", href: "/today" }, { id: "progress", label: "Progress", href: "/progress" }, { id: "profile", label: "Profile", href: "/profile" }] as const;
  return <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e6eae3] bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur md:hidden"><div className="mx-auto grid max-w-lg grid-cols-3">{items.map((item) => <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`rounded-xl py-2 text-center text-sm font-medium ${active === item.id ? "text-[#315c35]" : "text-[#81877e]"}`}>{item.label}</Link>)}</div></nav>;
}
