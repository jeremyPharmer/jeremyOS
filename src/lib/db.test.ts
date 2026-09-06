import { describe, expect, it } from "vitest";
import { normalizeDb, recoverJsonText } from "./db";

describe("recoverJsonText", () => {
  it("strips a trailing extra brace from otherwise valid db.json", () => {
    const good = JSON.stringify(
      { version: 2, users: [], legacyState: null },
      null,
      2,
    );
    const recovered = recoverJsonText(`${good}}`);
    expect(recovered).toBe(good);
    expect(normalizeDb(JSON.parse(recovered!))).toEqual({
      version: 2,
      users: [],
      legacyState: null,
    });
  });

  it("returns null for truncated JSON that never closes", () => {
    expect(recoverJsonText('{"version": 2, "users": [')).toBeNull();
  });
});

describe("normalizeDb", () => {
  it("keeps users when recovering from trailing-junk parse", () => {
    const payload = {
      version: 2 as const,
      users: [
        {
          id: "user_test",
          email: "KeepMe@Example.com",
          passwordHash: "x",
          gender: "prefer_not" as const,
          usState: "CA",
          displayName: "Keep Me",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastLoginAt: "2026-01-01T00:00:00.000Z",
          state: {},
        },
      ],
      legacyState: null,
    };
    const raw = `${JSON.stringify(payload)}}`;
    const recovered = recoverJsonText(raw);
    expect(recovered).not.toBeNull();
    const db = normalizeDb(JSON.parse(recovered!));
    expect(db.users).toHaveLength(1);
    expect(db.users[0]?.email).toBe("keepme@example.com");
  });
});
