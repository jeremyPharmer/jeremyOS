"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";

/**
 * Home header Open / Close entry (RB-032).
 * Always visible; grey + inactive when that ritual is done for today.
 * No dismiss / skip.
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
        doneLabel="Open done"
      />
      <OpenCloseButton
        label="Close"
        href="/evening"
        done={eveningDone}
        doneLabel="Close done"
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
  if (done) {
    return (
      <span
        className="home-open-close-btn home-open-close-btn-done"
        aria-disabled="true"
        title={doneLabel}
      >
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className="home-open-close-btn">
      {label}
    </Link>
  );
}
