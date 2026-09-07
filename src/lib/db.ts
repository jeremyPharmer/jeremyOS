import { promises as fs } from "fs";
import path from "path";
import { emptyState } from "./journey";
import { normalizeState } from "./fund";
import type { GenderOption } from "./auth-constants";
import type { GoogleCalendarLink, RebuildState } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
export const DB_PATH = path.join(DATA_DIR, "db.json");
const DB_TMP_PATH = path.join(DATA_DIR, "db.json.tmp");

export type PasswordReset = {
  tokenHash: string;
  expiresAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  pinHash?: string;
  gender: GenderOption;
  usState: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string;
  passwordReset?: PasswordReset | null;
  /** Google Calendar OAuth tokens — server-only, never sent to the client */
  googleCalendar?: GoogleCalendarLink;
  /** Per-user journey / fund state */
  state: RebuildState;
};

export type DbRoot = {
  version: 2;
  users: UserRecord[];
  /**
   * Former single-tenant db.json contents awaiting claim by the first
   * admin signup (prod Hx migration).
   */
  legacyState?: RebuildState | null;
};

function isLegacyState(raw: unknown): raw is RebuildState {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    !("version" in o && o.version === 2 && Array.isArray(o.users)) &&
    ("profile" in o || "mornings" in o || "fund" in o)
  );
}

export function emptyDb(): DbRoot {
  return { version: 2, users: [], legacyState: null };
}

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function normalizeDb(raw: unknown): DbRoot {
  if (isLegacyState(raw)) {
    return {
      version: 2,
      users: [],
      legacyState: normalizeState(raw),
    };
  }
  if (!raw || typeof raw !== "object") return emptyDb();
  const o = raw as Partial<DbRoot>;
  if (o.version === 2 && Array.isArray(o.users)) {
    return {
      version: 2,
      users: o.users.map((u) => ({
        ...u,
        email: String(u.email || "").toLowerCase(),
        state: normalizeState(u.state ?? emptyState()),
      })),
      legacyState: o.legacyState
        ? normalizeState(o.legacyState)
        : o.legacyState === null
          ? null
          : null,
    };
  }
  return emptyDb();
}

/**
 * If db.json has trailing junk (e.g. an extra `}`), recover the first
 * complete top-level JSON value. Returns null when recovery is impossible.
 */
export function recoverJsonText(raw: string): string | null {
  const start = raw.search(/[\{\[]/);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

function parseDbRaw(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (firstError) {
    const recovered = recoverJsonText(raw);
    if (!recovered || recovered === raw) throw firstError;
    try {
      const parsed = JSON.parse(recovered) as unknown;
      console.error(
        "[db] Recovered db.json after JSON parse failure; trailing junk was ignored",
      );
      return parsed;
    } catch {
      throw firstError;
    }
  }
}

export async function readDb(): Promise<DbRoot> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return normalizeDb(parseDbRaw(raw));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    // Missing file → first boot. Corrupt/unreadable existing file must NOT
    // silently become an empty DB (that looks like a brand-new install and
    // the next write would wipe founder data).
    if (code === "ENOENT") return emptyDb();
    throw error;
  }
}

export async function writeDb(db: DbRoot): Promise<void> {
  await ensureDataDir();
  const normalized = normalizeDb(db);
  const payload = JSON.stringify(normalized, null, 2);
  // Atomic replace avoids torn/corrupt files if the process dies mid-write.
  await fs.writeFile(DB_TMP_PATH, payload, "utf8");
  await fs.rename(DB_TMP_PATH, DB_PATH);
}

let updateChain: Promise<unknown> = Promise.resolve();

export async function updateDb(
  fn: (db: DbRoot) => DbRoot | Promise<DbRoot>,
): Promise<DbRoot> {
  const run = updateChain.then(async () => {
    const current = await readDb();
    const next = await fn(current);
    await writeDb(next);
    return normalizeDb(next);
  });
  // Keep the chain alive even when a write fails so later updates still queue.
  updateChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function findUserByEmail(
  db: DbRoot,
  email: string,
): UserRecord | undefined {
  const key = email.trim().toLowerCase();
  return db.users.find((u) => u.email === key);
}

export function findUserById(
  db: DbRoot,
  id: string,
): UserRecord | undefined {
  return db.users.find((u) => u.id === id);
}

export function publicUser(u: UserRecord) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    gender: u.gender,
    usState: u.usState,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    hasPin: Boolean(u.pinHash),
    onboarded: Boolean(u.state.profile?.onboarded),
  };
}
