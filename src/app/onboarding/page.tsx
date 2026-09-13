"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  GENDER_OPTIONS,
  SUPPORT_INSPIRATION,
  SUPPORT_LABEL_MAX,
  US_STATES,
  type GenderOption,
} from "@/lib/auth-constants";
import type { RewardCategory, SupportConfig } from "@/lib/types";

const STEPS = [
  "Account",
  "About you",
  "Unlock",
  "Long-term tracking",
  "Money",
  "Rewards",
  "Ready",
] as const;

const CATEGORIES: RewardCategory[] = [
  "clothing",
  "wellness",
  "experiences",
  "growth",
  "travel",
  "food",
  "entertainment",
  "other",
];

type RewardDraft = {
  name: string;
  cost: string;
  category: RewardCategory;
  url: string;
};

function slugify(label: string) {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
  return base || "support";
}

function OnboardingProgress({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="trail-progress" aria-label="Onboarding progress">
      <div className="trail-progress-meta">
        <span className="eyebrow">Step {step + 1} of {STEPS.length}</span>
        <span className="tiny muted">{STEPS[step]}</span>
      </div>
      <div className="trail-progress-track">
        <div className="trail-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="trail-progress-dots">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={
              i < step ? "dot done" : i === step ? "dot current" : "dot"
            }
            title={label}
          />
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { post, authenticated, user, state } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // About
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<GenderOption | "">("");
  const [usState, setUsState] = useState("");

  // Unlock
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [skipPin, setSkipPin] = useState(false);

  // Supports
  const [supports, setSupports] = useState<SupportConfig[]>(() => {
    const med = SUPPORT_INSPIRATION.find((s) => s.type === "medication");
    return med
      ? [{ ...med, enabled: true }]
      : [{ type: "medication", label: "Medication", weeklyTarget: 7, enabled: true }];
  });
  const [customLabel, setCustomLabel] = useState("");
  const [customTarget, setCustomTarget] = useState("3");

  // Money
  const [spend, setSpend] = useState("40");
  const [treatPct, setTreatPct] = useState(70);

  // Rewards
  const [rewards, setRewards] = useState<RewardDraft[]>([
    { name: "", cost: "", category: "wellness", url: "" },
    { name: "", cost: "", category: "experiences", url: "" },
  ]);

  const futurePct = 100 - treatPct;

  useEffect(() => {
    if (user?.onboarded || state.profile?.onboarded) {
      router.replace("/");
    }
  }, [user?.onboarded, state.profile?.onboarded, router]);

  useEffect(() => {
    if (authenticated && user && step === 0) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setStep(1);
    }
  }, [authenticated, user, step]);

  const selectedTypes = useMemo(
    () => new Set(supports.map((s) => s.type)),
    [supports],
  );

  function toggleInspiration(type: string, label: string, weeklyTarget: number) {
    setSupports((prev) => {
      const exists = prev.find((s) => s.type === type);
      if (exists) return prev.filter((s) => s.type !== type);
      return [...prev, { type, label, weeklyTarget, enabled: true }];
    });
  }

  function updateSupportTarget(type: string, weeklyTarget: number) {
    setSupports((prev) =>
      prev.map((s) =>
        s.type === type
          ? { ...s, weeklyTarget: Math.max(0, Math.min(21, weeklyTarget)) }
          : s,
      ),
    );
  }

  function addCustomSupport() {
    const label = customLabel.trim().slice(0, SUPPORT_LABEL_MAX);
    if (!label) return;
    let type = `custom_${slugify(label)}`;
    const existing = new Set(supports.map((s) => s.type));
    let n = 2;
    while (existing.has(type)) type = `custom_${slugify(label)}_${n++}`;
    setSupports((prev) => [
      ...prev,
      {
        type,
        label,
        weeklyTarget: Math.max(0, Math.min(21, Number(customTarget) || 0)),
        enabled: true,
      },
    ]);
    setCustomLabel("");
    setCustomTarget("3");
  }

  async function submitAccountAndAbout() {
    setBusy(true);
    setError("");
    try {
      if (!authenticated) {
        await post("/api/auth/signup", {
          email,
          password,
          confirmPassword: confirm,
          displayName,
          gender,
          usState,
          remember,
        });
      }
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  async function saveUnlock() {
    setBusy(true);
    setError("");
    try {
      if (!skipPin && pin) {
        if (pin !== pinConfirm) {
          throw new Error("PINs do not match");
        }
        if (pin.length !== 4) {
          throw new Error("PIN must be exactly 4 digits");
        }
        await post("/api/auth/pin", { pin });
      }
      await post("/api/auth/session", { remember });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save unlock");
    } finally {
      setBusy(false);
    }
  }

  async function finishOnboarding() {
    setBusy(true);
    setError("");
    try {
      const seed = rewards
        .filter((r) => r.name.trim() && r.cost)
        .map((r) => ({
          name: r.name.trim(),
          estimatedCost: Number(r.cost),
          category: r.category,
          url: r.url.trim() || undefined,
        }));
      await post("/api/onboard", {
        displayName,
        historicalDailySpend: Number(spend),
        supports,
        treatPercent: treatPct,
        futurePercent: futurePct,
        rewards: seed,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start journey");
    } finally {
      setBusy(false);
    }
  }

  if (user?.onboarded || state.profile?.onboarded) return null;

  return (
    <main className="fade-in enroll-shell">
      {step < 6 && <OnboardingProgress step={Math.min(step, 5)} />}

      {step === 0 && (
        <section className="stack enroll-step" key="s0">
          <p className="brand-mark">JeremyOS</p>
          <h1>Set up your personal OS.</h1>
          <p className="muted enroll-lead">
            Create your account to begin. You&apos;re not promising forever —
            you&apos;re choosing a first step.
          </p>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="field">
            <span className="field-label">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton
            onClick={() => {
              setError("");
              if (!email.includes("@")) {
                setError("Enter a valid email");
                return;
              }
              if (password.length < 8) {
                setError("Password must be at least 8 characters");
                return;
              }
              if (password !== confirm) {
                setError("Passwords do not match");
                return;
              }
              setStep(1);
            }}
          >
            Continue
          </PrimaryButton>
          <p className="tiny muted" style={{ textAlign: "center" }}>
            Already enrolled?{" "}
            <Link href="/login" className="text-link">
              Log in
            </Link>
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="stack enroll-step" key="s1">
          <p className="eyebrow">About you</p>
          <h1>Who&apos;s using JeremyOS?</h1>
          <p className="muted enroll-lead">
            A name for encouragement — and a few details so we can keep your
            account private and yours.
          </p>
          <label className="field">
            <span className="field-label">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
            />
          </label>
          <label className="field">
            <span className="field-label">Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderOption)}
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">State</span>
            <select
              value={usState}
              onChange={(e) => setUsState(e.target.value)}
            >
              <option value="">Select…</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton
            onClick={() => {
              if (!displayName.trim()) {
                setError("Display name required");
                return;
              }
              if (!gender) {
                setError("Gender required");
                return;
              }
              if (!usState) {
                setError("State required");
                return;
              }
              void submitAccountAndAbout();
            }}
            disabled={busy}
          >
            {busy ? "Creating account…" : "Create account"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep(0)} disabled={busy}>
            Back
          </SecondaryButton>
        </section>
      )}

      {step === 2 && (
        <section className="stack enroll-step" key="s2">
          <p className="eyebrow">Unlock</p>
          <h1>Keep it private.</h1>
          <p className="muted enroll-lead">
            Optional 4-digit PIN for quick access on any device — or stay signed
            in on this one like you do today.
          </p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me on this device</span>
            </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={skipPin}
              onChange={(e) => setSkipPin(e.target.checked)}
            />
            <span>Skip PIN for now</span>
          </label>
          {!skipPin && (
            <>
              <label className="field">
                <span className="field-label">4-digit PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="••••"
                />
              </label>
              <label className="field">
                <span className="field-label">Confirm PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinConfirm}
                  onChange={(e) =>
                    setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
              </label>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton onClick={() => void saveUnlock()} disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep(1)} disabled={busy}>
            Back
          </SecondaryButton>
        </section>
      )}

      {step === 3 && (
        <section className="stack enroll-step" key="s3">
          <p className="eyebrow">Long-term tracking</p>
          <h1>What do you want to track long-term?</h1>
          <p className="muted enroll-lead">
            These show up on Journey with adherence over time. Pick habits and set how often (times per week).
          </p>
          <div className="chip-row">
            {SUPPORT_INSPIRATION.map((s) => {
              const on = selectedTypes.has(s.type);
              return (
                <button
                  key={s.type}
                  type="button"
                  className={on ? "chip selected" : "chip"}
                  onClick={() =>
                    toggleInspiration(s.type, s.label, s.weeklyTarget)
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="support-tile-grid">
            {supports.map((s) => (
              <div key={s.type} className="support-tile">
                <strong className="support-tile-name">{s.label}</strong>
                <div className="enroll-support-target">
                  <input
                    className="target-input"
                    type="number"
                    min={0}
                    max={21}
                    value={s.weeklyTarget}
                    onChange={(e) =>
                      updateSupportTarget(s.type, Number(e.target.value))
                    }
                    aria-label={`${s.label} times per week`}
                  />
                  <span className="tiny muted">/wk</span>
                </div>
              </div>
            ))}
            <div className="support-tile support-tile-custom">
              <span className="tiny muted support-tile-kicker">Add your own</span>
              <input
                className="support-tile-name-input"
                value={customLabel}
                maxLength={SUPPORT_LABEL_MAX}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Journal"
                aria-label="Custom support name"
              />
              <div className="support-tile-custom-foot">
                <div className="enroll-support-target">
                  <input
                    className="target-input"
                    type="number"
                    min={0}
                    max={21}
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    aria-label="Custom support times per week"
                  />
                  <span className="tiny muted">/wk</span>
                </div>
                <button
                  type="button"
                  className="btn ghost support-tile-add"
                  onClick={addCustomSupport}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton
            onClick={() => {
              if (supports.length === 0) {
                setError("Choose at least one tracker");
                return;
              }
              setError("");
              setStep(4);
            }}
          >
            Save long-term tracking
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep(2)}>Back</SecondaryButton>
        </section>
      )}

      {step === 4 && (
        <section className="stack enroll-step" key="s4">
          <p className="eyebrow">Fund</p>
          <h1>What was your daily spend</h1>
          <p className="muted enroll-lead">
            Each day you progress, this is what you&apos;ll save.
          </p>
          <label className="field">
            <span className="field-label">Estimated $/day</span>
            <input
              type="number"
              min={0}
              step={1}
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
            />
          </label>
          <div className="panel">
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Recommended split
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong>{treatPct}% Treat Yourself</strong> · {futurePct}% Future
            </p>
            <p className="tiny muted">
              Treat is for near-term rewards. Future is longer-horizon park. We
              recommend 70 / 30 — set the mix you want; it applies to every move
              into your fund.
            </p>
            <label className="field" style={{ marginTop: 12 }}>
              <span className="field-label">Treat Yourself %</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={treatPct}
                onChange={(e) => setTreatPct(Number(e.target.value))}
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton
            onClick={() => {
              if (!Number.isFinite(Number(spend)) || Number(spend) < 0) {
                setError("Enter a daily spend amount");
                return;
              }
              setError("");
              setStep(5);
            }}
          >
            Continue
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep(3)}>Back</SecondaryButton>
        </section>
      )}

      {step === 5 && (
        <section className="stack enroll-step" key="s5">
          <p className="eyebrow">Rewards</p>
          <h1>Add a couple rewards to start.</h1>
          <p className="muted enroll-lead">
            Wishlist items you&apos;ll earn with Treat Yourself — same as in
            Rewards. Skip if you want; you can add more later.
          </p>
          {rewards.map((r, idx) => (
            <div key={idx} className="panel stack" style={{ gap: 10 }}>
              <p className="tiny" style={{ margin: 0 }}>
                Reward {idx + 1}
              </p>
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  value={r.name}
                  onChange={(e) =>
                    setRewards((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="New pants, massage…"
                />
              </label>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Cost</span>
                  <input
                    type="number"
                    value={r.cost}
                    onChange={(e) =>
                      setRewards((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, cost: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">Category</span>
                  <select
                    value={r.category}
                    onChange={(e) =>
                      setRewards((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                category: e.target.value as RewardCategory,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="field-label">Buy link (optional)</span>
                <input
                  type="url"
                  value={r.url}
                  onChange={(e) =>
                    setRewards((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, url: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="https://…"
                />
              </label>
            </div>
          ))}
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton onClick={() => void finishOnboarding()} disabled={busy}>
            {busy ? "Finishing setup…" : "Finish setup"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setRewards([
                { name: "", cost: "", category: "wellness", url: "" },
                { name: "", cost: "", category: "experiences", url: "" },
              ]);
              void finishOnboarding();
            }}
            disabled={busy}
          >
            Skip rewards for now
          </SecondaryButton>
          <SecondaryButton onClick={() => setStep(4)} disabled={busy}>
            Back
          </SecondaryButton>
        </section>
      )}

      {step === 6 && (
        <section className="stack enroll-step success-pop" key="s6">
          <p className="eyebrow">Ready</p>
          <h1>You&apos;re set up, {displayName.split(" ")[0] || "friend"}.</h1>
          <p className="muted enroll-lead">
            Day 1 is yours. One day at a time — JeremyOS has your back.
          </p>
          <div className="panel">
            <p className="tiny">Money potentially reclaimed today</p>
            <p className="money money-xl">${Number(spend) || 0}</p>
            <p className="tiny" style={{ marginTop: 12 }}>
              Fund split · {treatPct}% Treat · {futurePct}% Future
            </p>
            <p className="tiny">First meaningful reward · Day 3 · First Win</p>
          </div>
          <PrimaryButton onClick={() => router.push("/morning")}>
            Start the day
          </PrimaryButton>
        </section>
      )}
    </main>
  );
}
