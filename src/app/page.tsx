"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { HomeShell } from "@/components/HomeShell";

export default function HomePage() {
  const { state, dashboard, today, loading } = useApp();
  const router = useRouter();

  const morningDone =
    Boolean(today) && state.mornings.some((m) => m.date === today);

  useEffect(() => {
    if (!state.profile?.onboarded) {
      router.replace("/onboarding");
      return;
    }
    // RB-042: first open of the day → Open until sleep quality is logged.
    if (!loading && today && !morningDone) {
      router.replace("/morning");
    }
  }, [state.profile, router, loading, today, morningDone]);

  if (!state.profile?.onboarded || !dashboard) {
    return null;
  }

  if (!morningDone) {
    return (
      <main className="stack">
        <p className="muted">Opening the day…</p>
      </main>
    );
  }

  return <HomeShell today={today} week={dashboard.week} />;
}
