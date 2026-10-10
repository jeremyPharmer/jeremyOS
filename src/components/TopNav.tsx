"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/journey", label: "Health" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const path = usePathname();
  if (
    path.startsWith("/onboarding") ||
    path.startsWith("/login") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/morning") ||
    path.startsWith("/evening")
  ) {
    return null;
  }
  return (
    <nav className="top-nav" aria-label="Primary">
      {LINKS.map((l) => {
        const active =
          path === l.href || (l.href !== "/" && path.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={active ? "nav-link active" : "nav-link"}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
