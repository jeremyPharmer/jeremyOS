/**
 * One world anniversary for “On this date” (Wikipedia on-this-day feed).
 * Rules-based pick; fails soft.
 */

export type OnThisDayEvent = {
  year: number;
  text: string;
  url?: string;
};

type WikiOnThisDayItem = {
  year?: number;
  text?: string;
  pages?: { content_urls?: { desktop?: { page?: string } } }[];
};

const FETCH_MS = 6_000;
const USER_AGENT = "JeremyOS/1.0 (personal OS; on-this-day)";

function monthDay(date: string): { mm: string; dd: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { mm: date.slice(5, 7), dd: date.slice(8, 10) };
}

/** Stable index from YYYY-MM-DD so the same day keeps the same pick. */
export function stablePickIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % length;
}

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const HEAVY_RE =
  /\b(murder|killed|killing|assassin|lynch|massacre|suicide|rape|bombing|crashed|crash|died|death|executed|beheaded)\b/i;

function isHeavy(text: string): boolean {
  return HEAVY_RE.test(text);
}

/** Prefer concise selected anniversaries; fall back across the list. */
export function pickOnThisDayEvent(
  items: WikiOnThisDayItem[],
  date: string,
): OnThisDayEvent | null {
  const usable = items
    .map((item) => {
      const year = Number(item.year);
      const text = cleanText(String(item.text ?? ""));
      if (!Number.isFinite(year) || year < 1 || text.length < 24) return null;
      const url = item.pages?.[0]?.content_urls?.desktop?.page;
      return {
        year,
        text: text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text,
        url: url?.startsWith("http") ? url : undefined,
      } satisfies OnThisDayEvent;
    })
    .filter((x): x is OnThisDayEvent => x != null);

  if (usable.length === 0) return null;

  const light = usable.filter((e) => !isHeavy(e.text));
  const poolSource = light.length > 0 ? light : usable;

  // Prefer mid-length copy (not a one-liner, not a wall of text).
  const ranked = [...poolSource].sort((a, b) => {
    const score = (t: string) => {
      const n = t.length;
      if (n >= 60 && n <= 160) return 0;
      if (n < 60) return 60 - n;
      return n - 160;
    };
    return score(a.text) - score(b.text);
  });
  const pool = ranked.slice(0, Math.min(8, ranked.length));
  return pool[stablePickIndex(date, pool.length)] ?? pool[0] ?? null;
}

export async function fetchOnThisDayEvent(
  date: string,
): Promise<OnThisDayEvent | null> {
  const md = monthDay(date);
  if (!md) return null;

  const urls = [
    `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${md.mm}/${md.dd}`,
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${md.mm}/${md.dd}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_MS),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { selected?: WikiOnThisDayItem[] };
      const picked = pickOnThisDayEvent(data.selected ?? [], date);
      if (picked) return picked;
    } catch {
      /* try next */
    }
  }
  return null;
}
