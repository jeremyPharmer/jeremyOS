"use client";

import { SaveGoalsCard } from "@/components/SaveGoalsCard";

export default function SaveGoalsPage() {
  return (
    <main className="fade-in stack save-goals-page">
      <header className="save-goals-page-header">
        <h1>Save goals</h1>
        <p className="muted">
          Track trips, gifts, and general saving — daily inbound chips and
          target dates.
        </p>
      </header>
      <SaveGoalsCard variant="page" />
    </main>
  );
}
