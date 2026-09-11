/**
 * Thin world-news headlines for evening close (RB-029).
 * Pulls a few major RSS feeds, dedupes, fails soft.
 */

export type NewsHeadline = {
  title: string;
  source: string;
  url?: string;
};

type FeedSource = {
  source: string;
  url: string;
};

const FEEDS: FeedSource[] = [
  {
    source: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    source: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
  },
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
  },
];

const FETCH_MS = 6_000;

function tagContent(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m?.[1]) return undefined;
  // Unwrap CDATA before stripping residual markup.
  const unwrapped = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodeXmlEntities(unwrapped.replace(/<[^>]+>/g, ""));
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .trim();
}

function linkFromItem(block: string): string | undefined {
  const tagged = tagContent(block, "link");
  if (tagged?.startsWith("http")) return tagged;
  const atom = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (atom?.[1]?.startsWith("http")) return atom[1];
  const guid = tagContent(block, "guid");
  if (guid?.startsWith("http")) return guid;
  return undefined;
}

/** Parse RSS / Atom item titles from a feed document. Exported for tests. */
export function parseRssHeadlines(
  xml: string,
  source: string,
  limit = 8,
): NewsHeadline[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const entries =
    items.length > 0
      ? items
      : (xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []);
  const out: NewsHeadline[] = [];
  for (const block of entries) {
    if (out.length >= limit) break;
    const title = tagContent(block, "title");
    if (!title || title.length < 8) continue;
    out.push({
      title,
      source,
      url: linkFromItem(block),
    });
  }
  return out;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(
  feed: FeedSource,
): Promise<NewsHeadline[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(feed.url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "JeremyOS/1.0 (evening news; personal EA)",
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssHeadlines(xml, feed.source);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch 3–5 major world headlines. Soft-fails to [] if feeds are down.
 */
export async function fetchWorldHeadlines(
  limit = 5,
): Promise<NewsHeadline[]> {
  const capped = Math.min(5, Math.max(3, Math.round(limit)));
  const batches = await Promise.all(FEEDS.map((f) => fetchFeed(f)));
  const seen = new Set<string>();
  const out: NewsHeadline[] = [];
  // Round-robin across feeds so one source doesn't dominate.
  let progressed = true;
  let idx = 0;
  while (out.length < capped && progressed) {
    progressed = false;
    for (const batch of batches) {
      if (out.length >= capped) break;
      const item = batch[idx];
      if (!item) continue;
      progressed = true;
      const key = normalizeTitle(item.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    idx += 1;
  }
  return out;
}
