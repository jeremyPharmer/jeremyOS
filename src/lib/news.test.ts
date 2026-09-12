import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchBriefingHeadlines,
  isBillsSeason,
  parseRssHeadlines,
} from "./news";

describe("parseRssHeadlines", () => {
  it("extracts titles, sources, and links from RSS items", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>Markets steady after rate decision</title>
          <link>https://example.com/a</link>
        </item>
        <item>
          <title><![CDATA[Storms hit the coast]]></title>
          <guid>https://example.com/b</guid>
        </item>
        <item>
          <title>Hi</title>
          <link>https://example.com/short</link>
        </item>
      </channel></rss>`;
    const headlines = parseRssHeadlines(xml, "Test Wire", 5);
    expect(headlines).toHaveLength(2);
    expect(headlines[0]).toEqual({
      title: "Markets steady after rate decision",
      source: "Test Wire",
      url: "https://example.com/a",
    });
    expect(headlines[1]?.title).toBe("Storms hit the coast");
    expect(headlines[1]?.url).toBe("https://example.com/b");
  });

  it("parses Atom entries", () => {
    const xml = `<?xml version="1.0"?>
      <feed>
        <entry>
          <title>Peace talks resume in the capital</title>
          <link href="https://example.com/atom" />
        </entry>
      </feed>`;
    const headlines = parseRssHeadlines(xml, "Atom Wire");
    expect(headlines).toHaveLength(1);
    expect(headlines[0]?.title).toMatch(/Peace talks/);
    expect(headlines[0]?.url).toBe("https://example.com/atom");
  });
});

describe("isBillsSeason", () => {
  it("is true from Aug 1 through March 1 inclusive", () => {
    expect(isBillsSeason("2026-08-01")).toBe(true);
    expect(isBillsSeason("2026-12-15")).toBe(true);
    expect(isBillsSeason("2027-03-01")).toBe(true);
    expect(isBillsSeason("2026-03-02")).toBe(false);
    expect(isBillsSeason("2026-07-31")).toBe(false);
  });
});

describe("fetchBriefingHeadlines", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function rss(items: { title: string; link: string }[]): string {
    return `<?xml version="1.0"?><rss><channel>${items
      .map(
        (i) =>
          `<item><title>${i.title}</title><link>${i.link}</link></item>`,
      )
      .join("")}</channel></rss>`;
  }

  it("merges world headlines and injects a Bills story in season", async () => {
    const worldBodies = [
      rss([
        {
          title: "Global markets open higher on growth data",
          link: "https://ex/1",
        },
        {
          title: "Climate talks resume in Geneva today",
          link: "https://ex/2",
        },
      ]),
      rss([
        {
          title: "Peace summit draws regional leaders now",
          link: "https://ex/3",
        },
        {
          title: "Tech firms report steady quarterly results",
          link: "https://ex/4",
        },
      ]),
      rss([
        {
          title: "Storms sweep across the southern coast",
          link: "https://ex/5",
        },
      ]),
    ];
    const billsBody = rss([
      {
        title: "Buffalo Bills prepare for Sunday kickoff",
        link: "https://ex/bills",
      },
    ]);

    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("Buffalo+Bills") || url.includes("Buffalo%20Bills")) {
          return new Response(billsBody, { status: 200 });
        }
        const body = worldBodies[call % worldBodies.length] ?? worldBodies[0]!;
        call += 1;
        return new Response(body, { status: 200 });
      }),
    );

    const headlines = await fetchBriefingHeadlines("2026-09-12", 5);
    expect(headlines.length).toBeLessThanOrEqual(5);
    expect(headlines.length).toBeGreaterThanOrEqual(3);
    expect(
      headlines.some(
        (h) => /bills/i.test(h.title) || /bills/i.test(h.source),
      ),
    ).toBe(true);
  });

  it("skips Bills feed outside season", async () => {
    const worldBodies = [
      rss([
        {
          title: "Global markets open higher on growth data",
          link: "https://ex/1",
        },
      ]),
      rss([
        {
          title: "Peace summit draws regional leaders now",
          link: "https://ex/2",
        },
      ]),
      rss([
        {
          title: "Storms sweep across the southern coast",
          link: "https://ex/3",
        },
      ]),
    ];
    let call = 0;
    const fetchMock = vi.fn(
      async (_input?: RequestInfo | URL, _init?: RequestInit) => {
        const body = worldBodies[call % worldBodies.length]!;
        call += 1;
        return new Response(body, { status: 200 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const headlines = await fetchBriefingHeadlines("2026-06-15", 5);
    expect(headlines.every((h) => !/bills/i.test(h.title))).toBe(true);
    const urls = fetchMock.mock.calls.map((c) => String(c[0] ?? ""));
    expect(urls.every((u) => !u.includes("Buffalo"))).toBe(true);
  });
});
