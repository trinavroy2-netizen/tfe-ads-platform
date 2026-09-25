"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const links = [
  {
    href: "/dashboard/ads",
    label: "Ads",
    icon: "ads",
  },
  {
    href: "/dashboard/placements",
    label: "Placements",
    icon: "placements",
  },
  {
    href: "/dashboard/vendors",
    label: "Vendors",
    icon: "vendors",
  },
];

function NavIcon({ type }: { type: string }) {
  if (type === "ads") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  if (type === "placements") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    );
  }

  if (type === "vendors") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 21v-7" />
        <path d="M4 10V3" />
        <path d="M12 21v-9" />
        <path d="M12 8V3" />
        <path d="M20 21v-5" />
        <path d="M20 12V3" />
        <path d="M2 10h4" />
        <path d="M10 8h4" />
        <path d="M18 16h4" />
      </svg>
    );
  }

  return null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  function handleBack() {
    router.back();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-[#2b2b2b] bg-[#151515] text-white">

      {/* TOP */}
      <div className="px-4 pt-4">

        {/* BACK BUTTON */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="mb-7 flex h-8 w-8 items-center justify-center rounded-md border border-[#3a3a3a] bg-[#171717] text-[#aaa] transition hover:bg-[#222] hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* BRAND */}
        <div className="mb-8 px-1">

          <div className="flex items-center gap-3">

            {/* LOGO */}
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3b3b3b] bg-[#202020]">

              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="4"
                />

                <path d="M8 8h8" />
                <path d="M8 12h5" />
                <path d="M8 16h7" />
              </svg>

            </div>

            {/* BRAND TEXT */}
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-white">
                TFE Ads
              </div>

              <div className="mt-0.5 text-[10px] text-[#666]">
                Advertising platform
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto px-3">

        {/* SECTION TITLE */}
        <div className="mb-2 flex items-center justify-between px-2">

          <span className="text-[11px] font-medium uppercase tracking-wide text-[#666]">
            Manage
          </span>

          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#555]"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>

        </div>

        {/* NAV LINKS */}
        <div className="space-y-1">

          {links.map((link) => {
            const isActive = pathname?.startsWith(
              link.href
            );

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  group flex h-10 items-center gap-3 rounded-md px-3
                  text-[13px] transition
                  ${
                    isActive
                      ? "bg-[#252525] text-white"
                      : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
                  }
                `}
              >

                {/* ICON */}
                <span
                  className={`
                    flex h-5 w-5 items-center justify-center
                    ${
                      isActive
                        ? "text-white"
                        : "text-[#777] group-hover:text-[#bbb]"
                    }
                  `}
                >
                  <NavIcon type={link.icon} />
                </span>

                {/* LABEL */}
                <span className="flex-1">
                  {link.label}
                </span>

                {/* ACTIVE INDICATOR */}
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#aaa]" />
                )}

              </Link>
            );
          })}

        </div>

        {/* SYSTEM SECTION */}
        <div className="mt-8">

          <div className="mb-2 flex items-center justify-between px-2">

            <span className="text-[11px] font-medium uppercase tracking-wide text-[#666]">
              System
            </span>

            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#555]"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>

          </div>

          <div className="rounded-md border border-[#252525] bg-[#181818] px-3 py-3">

            <div className="flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-[#777]" />

              <span className="text-xs text-[#888]">
                Advertising system
              </span>

            </div>

            <p className="mt-1 pl-3.5 text-[10px] text-[#555]">
              Vendor ad management
            </p>

          </div>

        </div>

      </nav>

      {/* BOTTOM */}
      <div className="border-t border-[#2b2b2b] p-3">

        {/* USER / PLATFORM */}
        <div className="mb-2 flex items-center gap-3 rounded-md px-2 py-2">

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#202020]">

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#888]"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>

          </div>

          <div className="min-w-0">

            <div className="truncate text-xs font-medium text-[#ccc]">
              Admin
            </div>

            <div className="text-[10px] text-[#555]">
              Management
            </div>

          </div>

        </div>

        {/* LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          className="group flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs text-[#888] transition hover:bg-[#202020] hover:text-white"
        >

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#666] group-hover:text-[#aaa]"
          >
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
          </svg>

          <span>Log out</span>

        </button>

      </div>

    </aside>
  );
}