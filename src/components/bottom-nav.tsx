import Link from "next/link";
import { NavigationIcon, navigationItems, type NavigationId } from "@/components/navigation";

export function BottomNav({ active }: { active: NavigationId }) {
  return (
    <nav aria-label="Main navigation" className="fit-bottom-nav fixed inset-x-0 bottom-0 z-20 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {navigationItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active === item.id ? "page" : undefined}
            className={active === item.id ? "fit-mobile-nav-link is-active" : "fit-mobile-nav-link"}
          >
            <span className="fit-mobile-nav-icon"><NavigationIcon id={item.id} /></span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
