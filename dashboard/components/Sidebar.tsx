
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import { LogOut } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/vendors", label: "Vendors" },
  { href: "/dashboard/placements", label: "Placements" },
  { href: "/dashboard/ads", label: "Advertisements" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/integration", label: "Integration" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className="
        w-48 shrink-0
        h-screen
        sticky top-0
        overflow-hidden
        bg-[var(--admin-surface)]
        border-r border-[var(--admin-border)]
        p-3
        flex flex-col
      "
    >
      {/* Brand */}
      <div className="mb-6 px-2 shrink-0">
        <div
          className="
            text-base font-semibold
            tracking-tight
            text-[var(--admin-foreground)]
          "
        >
          MSI Ads Platform
        </div>

        <div
          className="
            mt-0.5 text-[11px]
            text-[var(--admin-muted)]
          "
        >
          Multi-vendor advertising
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto min-h-0">
        {links.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(l.href);

          return (
            <Link
              key={l.href}
              href={l.href}
              className={`
                relative flex items-center
                min-h-[34px]
                px-3 py-1.5
                rounded-md
                text-[13px] font-medium
                transition-colors duration-150
                ${
                  active
                    ? "text-white"
                    : `
                      text-[var(--admin-muted)]
                      hover:text-[var(--admin-foreground)]
                      hover:bg-[var(--admin-surface-hover)]
                    `
                }
              `}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="
                    absolute left-0 top-1/2
                    -translate-y-1/2
                    w-[2px] h-4
                    rounded-r
                    bg-white
                  "
                />
              )}

              <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>

    {/* Logout */}
    <div className="shrink-0 pt-3 flex justify-center">
      <button
        type="button"
        title="Log out"
        aria-label="Log out"
        className="
          flex items-center justify-center
          w-9 h-9
          rounded-md
          text-[var(--admin-muted)]
          hover:text-[var(--admin-foreground)]
          hover:bg-[var(--admin-surface-hover)]
          transition-colors duration-150
        "
        onClick={() => {
          clearToken();
          router.push("/login");
        }}
      >
        <LogOut size={15} strokeWidth={1.8} />
      </button>
    </div>
    </aside>
  );
}