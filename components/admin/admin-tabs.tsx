"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "videos", label: "Videos", href: "/admin/videos" },
  { key: "sponsorships", label: "Sponsorships", href: "/admin/sponsorships" },
] as const;

export type AdminTab = (typeof TABS)[number]["key"];

/**
 * Switches between the two admin review queues; counts are pending items.
 * It lives in the admin layout, so switching tabs swaps only the queue below.
 */
export function AdminTabs({ counts }: { counts: Record<AdminTab, number> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin review" className="flex justify-center">
      <div className="inline-flex rounded-full border border-zinc-200/80 bg-zinc-50 p-1">
        {TABS.map((tab) => {
          const current = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                current
                  ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(9,9,11,0.08)]"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  className={`min-w-[18px] rounded-full px-1.5 text-center text-[10.5px] tabular-nums leading-[18px] ${
                    current ? "bg-brand text-on-brand" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {counts[tab.key]}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
