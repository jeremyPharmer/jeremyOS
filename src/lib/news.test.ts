import { describe, expect, it } from "vitest";
import { parseRssHeadlines } from "./news";

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
