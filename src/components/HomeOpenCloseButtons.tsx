"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";

/**
 * Home header Open / Close entry (RB-032).
 * Always visible and clickable — muted when that ritual is done so you can
 * reopen today's edition. No dismiss / skip.
 */
export function HomeOpenCloseButtons() {
  const { state, today } = useApp();
  const morningDone = state.mornings.some((m) => m.date === today);
  const eveningDone = state.evenings.some((e) => e.date === today);

  return (
    <div className="home-open-close" role="group" aria-label="Daily briefing">
      <OpenCloseButton
        label="Open"
        href="/morning"
        done={morningDone}
        doneLabel="Read today's Open"
      />
      <OpenCloseButton
        label="Close"
        href="/evening"
        done={eveningDone}
        doneLabel="Read today's Close"
      />
    </div>
  );
}

function OpenCloseButton({
  label,
  href,
  done,
  doneLabel,
}: {
  label: string;
  href: string;
  done: boolean;
  doneLabel: string;
}) {
  return (
    <Link
      href={href}
      className={
        done
          ? "home-open-close-btn home-open-close-btn-done"
          : "home-open-close-btn"
      }
      title={done ? doneLabel : undefined}
      aria-label={done ? doneLabel : label}
    >
      {label}
    </Link>
  );
}
