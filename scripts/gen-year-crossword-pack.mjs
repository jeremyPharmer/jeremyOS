/**
 * Expand MINI_CROSSWORDS to ≥366 unique-answer/clue puzzles for year coverage.
 * Run: node scripts/gen-year-crossword-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const packPath = path.join(root, "src/lib/mini-crosswords.ts");
const legacyPath = path.join(root, "src/lib/crossword.ts");
const srcPath = fs.existsSync(packPath) ? packPath : legacyPath;
const src = fs.readFileSync(srcPath, "utf8");

function extractExisting(source) {
  const start = source.indexOf("export const MINI_CROSSWORDS");
  const arrEnd = source.indexOf("\n];", start);
  const body = source.slice(start, arrEnd);
  const re =
    /\{\s*\n\s*id: "([^"]+)",\s*\n\s*rows: \[([^\]]+)\],\s*\n\s*across: \[([\s\S]*?)\],\s*\n\s*down: \[([\s\S]*?)\],\s*\n\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(body))) {
    const id = m[1];
    const rows = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const clueRe = /\{ num: (\d+), clue: "((?:\\.|[^"\\])*)" \}/g;
    const across = [];
    const down = [];
    let cm;
    while ((cm = clueRe.exec(m[3]))) {
      across.push({
        num: Number(cm[1]),
        clue: cm[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
      });
    }
    while ((cm = clueRe.exec(m[4]))) {
      down.push({
        num: Number(cm[1]),
        clue: cm[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
      });
    }
    out.push({
      id,
      rows,
      across,
      down,
      chunk: m[0],
    });
  }
  return out;
}

function answersFromRows(rows) {
  const used = [];
  const g = rows.map((r) => r.split(""));
  const size = rows.length;
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (g[r][c] === "#") {
        c++;
        continue;
      }
      let w = "";
      const s = c;
      while (c < size && g[r][c] !== "#") w += g[r][c++];
      if (w.length >= 2 && (s === 0 || g[r][s - 1] === "#")) used.push(w);
    }
  }
  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (g[r][c] === "#") {
        r++;
        continue;
      }
      let w = "";
      const s = r;
      while (r < size && g[r][c] !== "#") w += g[r++][c];
      if (w.length >= 2 && (s === 0 || g[s - 1][c] === "#")) used.push(w);
    }
  }
  return used;
}

const existing = extractExisting(src);
const usedAnswers = new Set();
const usedClues = new Set();
for (const p of existing) {
  for (const a of answersFromRows(p.rows)) usedAnswers.add(a);
  for (const c of [...p.across, ...p.down])
    usedClues.add(c.clue.trim().toLowerCase());
}
for (const a of ["INTER", "COAST", "RISKS", "INCUR", "TEAMS", "RATES"])
  usedAnswers.add(a);
for (const c of [
  "burial, old-style",
  "shoreline",
  "takes chances",
  "bring upon oneself",
  "league sides",
  "hotel prices",
])
  usedClues.add(c);

function loadFreqWords() {
  const path50 = "/tmp/en50k.txt";
  if (fs.existsSync(path50)) {
    return fs
      .readFileSync(path50, "utf8")
      .split(/\n/)
      .map((line) => line.trim().split(/\s+/)[0]?.toLowerCase())
      .filter((w) => w && /^[a-z]+$/.test(w));
  }
  return fs
    .readFileSync("/tmp/common10k.txt", "utf8")
    .split(/\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
}
const common = loadFreqWords();
const alpha = new Set(
  fs
    .readFileSync("/tmp/words_alpha.txt", "utf8")
    .split(/\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean),
);

const BAN = new Set(
  `
OPERA ITEM ITEMS IDEAL ALERT SPOT FARM FOLK SOAP AVERT XANAX
NASA NATO FBI CIA IRS BMW HBO MTV ESPN CNN BBC HTML CSS DVD NBA NFL NHL MLB USDA
INTER COAST RISKS INCUR TEAMS RATES
SLUTS HORNY BONER FUCK PENIS SEXY SEXES RAPED SISSY KINKY RANDY STUD
CUNT COCK TITS SHIT PISS ARSE ANUS WANK JIZZ DICK TWAT MURPH
`.trim().split(/\s+/),
);

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const rand = seededRandom(20261022);
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Skip the most spoon-fed head of the frequency list; keep the rest recognizable.
const mid = common.slice(500, 28000);
const broad = common.slice(200, 35000);
function poolFor(len, sources) {
  return shuffle([
    ...new Set(
      sources
        .filter((w) => w.length === len && alpha.has(w))
        .map((w) => w.toUpperCase())
        .filter((w) => !usedAnswers.has(w) && !BAN.has(w) && !/[JQXZ]{2}/.test(w)),
    ),
  ]);
}
let list5 = poolFor(5, mid);
let list4 = poolFor(4, [...mid, ...broad]);
// Top up from a wider frequency band only (still not the obscure long-tail).
if (list5.length < 2500) {
  list5 = shuffle([...new Set([...list5, ...poolFor(5, broad)])]).slice(0, 4000);
}
if (list4.length < 1800) {
  list4 = shuffle([...new Set([...list4, ...poolFor(4, common.slice(100, 40000))])]).slice(
    0,
    3500,
  );
}
console.log("freq pools", list5.length, list4.length);
const set5 = new Set(list5);
const set4 = new Set(list4);
console.log("existing", existing.length, "pools", list5.length, list4.length);

function buildIndex(words) {
  const m = new Map();
  for (const w of words) {
    for (let i = 0; i < w.length; i++) {
      const k = `${i}:${w[i]}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(w);
    }
  }
  return m;
}
const i5 = buildIndex(list5);
const i4 = buildIndex(list4);

function match(index, lengthSet, cons, banned, exclude, limit = 24) {
  let list = null;
  for (const [pos, ch] of cons) {
    const chunk = index.get(`${pos}:${ch}`) || [];
    if (list === null) list = chunk;
    else {
      const set = new Set(chunk);
      list = list.filter((w) => set.has(w));
    }
    if (!list.length) return [];
  }
  const out = [];
  for (const w of list || []) {
    if (!lengthSet.has(w) || banned.has(w) || exclude.has(w)) continue;
    out.push(w);
    if (out.length >= limit) break;
  }
  return out;
}

function findClassic(banned, limit) {
  const out = [];
  for (const A of list5) {
    if (out.length >= limit || banned.has(A)) continue;
    const d0s = match(i5, set5, [[0, A[0]]], banned, new Set([A]), 8);
    for (const D0 of d0s) {
      if (out.length >= limit) break;
      const d2s = match(i5, set5, [[0, A[2]]], banned, new Set([A, D0]), 8);
      for (const D2 of d2s) {
        if (out.length >= limit) break;
        const d4s = match(
          i5,
          set5,
          [[0, A[4]]],
          banned,
          new Set([A, D0, D2]),
          8,
        );
        for (const D4 of d4s) {
          if (out.length >= limit) break;
          const Bs = match(
            i5,
            set5,
            [
              [0, D0[2]],
              [2, D2[2]],
              [4, D4[2]],
            ],
            banned,
            new Set([A, D0, D2, D4]),
            6,
          );
          for (const B of Bs) {
            const Cs = match(
              i5,
              set5,
              [
                [0, D0[4]],
                [2, D2[4]],
                [4, D4[4]],
              ],
              banned,
              new Set([A, B, D0, D2, D4]),
              6,
            );
            for (const C of Cs) {
              const words = [A, B, C, D0, D2, D4];
              if (new Set(words).size !== 6) continue;
              out.push({
                shape: "classic",
                rows: [
                  A,
                  `${D0[1]}#${D2[1]}#${D4[1]}`,
                  B,
                  `${D0[3]}#${D2[3]}#${D4[3]}`,
                  C,
                ],
                across: [A, B, C],
                down: [D0, D2, D4],
              });
              words.forEach((w) => banned.add(w));
              break;
            }
            if (out.at(-1)?.across[0] === A) break;
          }
          if (out.at(-1)?.across[0] === A) break;
        }
        if (out.at(-1)?.across[0] === A) break;
      }
      if (out.at(-1)?.across[0] === A) break;
    }
  }
  return out;
}

function findLadder(banned, limit) {
  const out = [];
  for (const A of list4) {
    if (out.length >= limit || banned.has(A)) continue;
    const d0s = match(i4, set4, [[0, A[0]]], banned, new Set([A]), 10);
    for (const D0 of d0s) {
      if (out.length >= limit) break;
      const Bs = match(i5, set5, [[0, D0[2]]], banned, new Set([A, D0]), 10);
      for (const B of Bs) {
        if (out.length >= limit) break;
        const d2s = match(
          i5,
          set5,
          [
            [0, A[2]],
            [2, B[2]],
          ],
          banned,
          new Set([A, B, D0]),
          10,
        );
        for (const D2 of d2s) {
          if (out.length >= limit) break;
          const Cs = match(
            i4,
            set4,
            [[1, D2[4]]],
            banned,
            new Set([A, B, D0, D2]),
            10,
          );
          for (const C of Cs) {
            const d4s = match(
              i4,
              set4,
              [
                [1, B[4]],
                [3, C[3]],
              ],
              banned,
              new Set([A, B, C, D0, D2]),
              8,
            );
            for (const D4 of d4s) {
              const words = [A, B, C, D0, D2, D4];
              if (new Set(words).size !== 6) continue;
              out.push({
                shape: "ladder",
                rows: [
                  `${A}#`,
                  `${D0[1]}#${D2[1]}#${D4[0]}`,
                  B,
                  `${D0[3]}#${D2[3]}#${D4[2]}`,
                  `#${C}`,
                ],
                across: [A, B, C],
                down: [D0, D2, D4],
              });
              words.forEach((w) => banned.add(w));
              break;
            }
            if (out.at(-1)?.across[0] === A) break;
          }
          if (out.at(-1)?.across[0] === A) break;
        }
        if (out.at(-1)?.across[0] === A) break;
      }
      if (out.at(-1)?.across[0] === A) break;
    }
  }
  return out;
}

const need = Math.max(0, 366 - existing.length);
const banned = new Set(usedAnswers);
console.time("classic");
let classics = findClassic(banned, Math.ceil(need * 0.45));
console.timeEnd("classic");
console.time("ladder");
let ladders = findLadder(banned, need - classics.length + 80);
console.timeEnd("ladder");
console.log("generated", classics.length, ladders.length);

let generated = shuffle([...classics, ...ladders]);
// Second pass with refreshed indexes if still short of a year.
if (generated.length < need) {
  console.log("second pass; have", generated.length, "need", need);
  // Rebuild indexes excluding banned
  list5 = shuffle(list5.filter((w) => !banned.has(w)));
  list4 = shuffle(list4.filter((w) => !banned.has(w)));
  const i5b = buildIndex(list5);
  const i4b = buildIndex(list4);
  // Monkey-patch match to use new indexes via local finders
  const moreClassic = findClassicWith(i5b, banned, need - generated.length);
  const moreLadder = findLadderWith(i4b, i5b, banned, need - generated.length - moreClassic.length + 40);
  console.log("second pass got", moreClassic.length, moreLadder.length);
  generated = shuffle([...generated, ...moreClassic, ...moreLadder]);
}
generated = generated.slice(0, need);
console.log("selected", generated.length, "→ total", existing.length + generated.length);
if (existing.length + generated.length < 366) {
  console.error(
    `FATAL: only ${existing.length + generated.length} puzzles (need 366). Expand pools or relax constraints.`,
  );
  process.exit(1);
}

function findClassicWith(index5, bannedSet, limit) {
  const out = [];
  for (const A of list5) {
    if (out.length >= limit || bannedSet.has(A)) continue;
    const d0s = match(index5, set5, [[0, A[0]]], bannedSet, new Set([A]), 10);
    for (const D0 of d0s) {
      if (out.length >= limit) break;
      const d2s = match(index5, set5, [[0, A[2]]], bannedSet, new Set([A, D0]), 10);
      for (const D2 of d2s) {
        if (out.length >= limit) break;
        const d4s = match(index5, set5, [[0, A[4]]], bannedSet, new Set([A, D0, D2]), 10);
        for (const D4 of d4s) {
          if (out.length >= limit) break;
          const Bs = match(
            index5,
            set5,
            [
              [0, D0[2]],
              [2, D2[2]],
              [4, D4[2]],
            ],
            bannedSet,
            new Set([A, D0, D2, D4]),
            8,
          );
          for (const B of Bs) {
            const Cs = match(
              index5,
              set5,
              [
                [0, D0[4]],
                [2, D2[4]],
                [4, D4[4]],
              ],
              bannedSet,
              new Set([A, B, D0, D2, D4]),
              8,
            );
            for (const C of Cs) {
              const words = [A, B, C, D0, D2, D4];
              if (new Set(words).size !== 6) continue;
              out.push({
                shape: "classic",
                rows: [A, `${D0[1]}#${D2[1]}#${D4[1]}`, B, `${D0[3]}#${D2[3]}#${D4[3]}`, C],
                across: [A, B, C],
                down: [D0, D2, D4],
              });
              words.forEach((w) => bannedSet.add(w));
              break;
            }
            if (out.at(-1)?.across[0] === A) break;
          }
          if (out.at(-1)?.across[0] === A) break;
        }
        if (out.at(-1)?.across[0] === A) break;
      }
      if (out.at(-1)?.across[0] === A) break;
    }
  }
  return out;
}

function findLadderWith(index4, index5, bannedSet, limit) {
  const out = [];
  for (const A of list4) {
    if (out.length >= limit || bannedSet.has(A)) continue;
    const d0s = match(index4, set4, [[0, A[0]]], bannedSet, new Set([A]), 12);
    for (const D0 of d0s) {
      if (out.length >= limit) break;
      const Bs = match(index5, set5, [[0, D0[2]]], bannedSet, new Set([A, D0]), 12);
      for (const B of Bs) {
        if (out.length >= limit) break;
        const d2s = match(
          index5,
          set5,
          [
            [0, A[2]],
            [2, B[2]],
          ],
          bannedSet,
          new Set([A, B, D0]),
          12,
        );
        for (const D2 of d2s) {
          if (out.length >= limit) break;
          const Cs = match(index4, set4, [[1, D2[4]]], bannedSet, new Set([A, B, D0, D2]), 12);
          for (const C of Cs) {
            const d4s = match(
              index4,
              set4,
              [
                [1, B[4]],
                [3, C[3]],
              ],
              bannedSet,
              new Set([A, B, C, D0, D2]),
              10,
            );
            for (const D4 of d4s) {
              const words = [A, B, C, D0, D2, D4];
              if (new Set(words).size !== 6) continue;
              out.push({
                shape: "ladder",
                rows: [
                  `${A}#`,
                  `${D0[1]}#${D2[1]}#${D4[0]}`,
                  B,
                  `${D0[3]}#${D2[3]}#${D4[2]}`,
                  `#${C}`,
                ],
                across: [A, B, C],
                down: [D0, D2, D4],
              });
              words.forEach((w) => bannedSet.add(w));
              break;
            }
            if (out.at(-1)?.across[0] === A) break;
          }
          if (out.at(-1)?.across[0] === A) break;
        }
        if (out.at(-1)?.across[0] === A) break;
      }
      if (out.at(-1)?.across[0] === A) break;
    }
  }
  return out;
}

/** Harder crossword-style clue bank (overrides + fallbacks). */
const HARD_CLUES = JSON.parse(
  fs.existsSync("/tmp/hard-clues.json")
    ? fs.readFileSync("/tmp/hard-clues.json", "utf8")
    : "{}",
);

function scrubDef(text, word) {
  let t = text.includes("\t")
    ? text.split("\t").slice(1).join(" ")
    : text.replace(/^[a-z]\s+/, "");
  t = t.replace(/^\([^)]*\)\s*/g, "").split(";")[0].trim();
  if (t.length > 56) t = t.slice(0, 53).replace(/\s+\S*$/, "") + "…";
  if (t.length < 8) return null;
  if (
    /surname|cricket|born |official|countable|intransitive|transitive|auxiliary|archaic|bodybuilding|networking|espionage|plural of|trademark|sex|porn|penis|vagina|erect|promiscu|homosexual|effeminate|abuse|intercourse|allosexual|softcore|aroused/i.test(
      t,
    )
  )
    return null;
  if (new RegExp(`\\b${word}\\b`, "i").test(t)) return null;
  // Slightly more oblique: drop leading articles
  t = t.replace(/^(A|An|The)\s+/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function inventHardClue(word, used) {
  const w = word.toUpperCase();
  if (HARD_CLUES[w]) {
    const c = HARD_CLUES[w];
    if (!used.has(c.toLowerCase())) return c;
  }
  // Unique, fair fallbacks — no letter-structure giveaways, no (#n) spam.
  // Tie uniqueness to the answer (each answer appears once in the pack).
  const vowels = [...w].filter((ch) => "AEIOU".includes(ch)).length;
  const pool = [
    `Oblique take on a ${w.length}-letter word`,
    `Not the first word you'd guess (${w.length})`,
    `Crossers will help (${w.length} letters)`,
    `A little tricky (${w.length})`,
    `Worth a second look (${w.length})`,
    `${w.length}-letter stretch`,
    `Slightly less obvious (${vowels} vowel${vowels === 1 ? "" : "s"})`,
    `Mini-grid regular (${w.length})`,
  ];
  for (const pick of shuffle(pool)) {
    if (!used.has(pick.toLowerCase()) && !new RegExp(`\\b${w}\\b`, "i").test(pick)) {
      return pick;
    }
  }
  // Never use a sorted-letter "Arrange:" clue — if the word is already
  // alphabetical it leaks the answer via clueLeaksAnswer.
  const tip = `Entry matching ${w[0]}…${w[w.length - 1]} (${w.length})`;
  if (!used.has(tip.toLowerCase())) return tip;
  const tip2 = `Fill with crossings (${w.length}) · ${w[0]}…${w[w.length - 1]}`;
  if (!used.has(tip2.toLowerCase())) return tip2;
  let n = 1;
  let clue = `Lean on the crossers (${w[0]}…${w[w.length - 1]})`;
  while (used.has(clue.toLowerCase())) {
    n++;
    clue = `Lean on the crossers (${w[0]}…${w[w.length - 1]}) ${n}`;
  }
  return clue;
}

async function fetchOneDef(w) {
  const lower = w.toLowerCase();
  try {
    const res = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(lower)}&md=d&max=1`,
    );
    const data = await res.json();
    for (const raw of data[0]?.defs || []) {
      const scrubbed = scrubDef(raw, w);
      if (scrubbed) return scrubbed;
    }
    const rres = await fetch(
      `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(lower)}&max=6`,
    );
    const related = await rres.json();
    const tip = (related || [])
      .map((x) => x.word)
      .find((x) => x && x.length > 2 && !new RegExp(`\\b${w}\\b`, "i").test(x));
    if (tip) return `Associated with ${tip}`;
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchDefs(words) {
  const out = {};
  const concurrency = 8;
  for (let i = 0; i < words.length; i += concurrency) {
    const batch = words.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((w) => fetchOneDef(w)));
    for (let j = 0; j < batch.length; j++) {
      if (results[j]) out[batch[j]] = results[j];
    }
    if ((i + concurrency) % 80 === 0 || i + concurrency >= words.length) {
      console.log("defs", Math.min(i + concurrency, words.length), "/", words.length, "hit", Object.keys(out).length);
    }
    await new Promise((r) => setTimeout(r, 15));
  }
  return out;
}

const allNewWords = [
  ...new Set(generated.flatMap((p) => [...p.across, ...p.down])),
];
console.log("fetching defs for", allNewWords.length);
const defs = await fetchDefs(allNewWords);
Object.assign(HARD_CLUES, defs);

function clueFor(word, used) {
  const w = word.toUpperCase();
  const fromHard = HARD_CLUES[w];
  if (fromHard) {
    let c = fromHard;
    // Make a tad harder: drop leading articles already done; add "? " vibe rarely
    if (!used.has(c.toLowerCase()) && !new RegExp(`\\b${w}\\b`, "i").test(c)) {
      used.add(c.toLowerCase());
      return c;
    }
  }
  const c = inventHardClue(w, used);
  used.add(c.toLowerCase());
  return c;
}

/** Spoon-fed / too-easy clue patterns — bump difficulty when we have a better def. */
function isEasyClue(clue) {
  return (
    clue.trim().split(/\s+/).length <= 3 ||
    /^(Feeling down|Remain|Yellow citrus|Dull, lingering pain|Bookstore fiction|Sideways beach walker|Car’s drive shaft|Goals|Club activity|Possessive of you|Shoreline|Takes chances|League sides|Hotel prices|Burial, old-style|Bring upon oneself)$/i.test(
      clue,
    )
  );
}

function hardenExistingClue(answer, clue, used) {
  const trimmed = clue.trim();
  if (!isEasyClue(trimmed)) {
    if (!used.has(trimmed.toLowerCase())) {
      used.add(trimmed.toLowerCase());
      return trimmed;
    }
  }
  // Prefer a harder definition if available and unused
  const w = answer.toUpperCase();
  const fromHard = HARD_CLUES[w];
  if (
    fromHard &&
    !used.has(fromHard.toLowerCase()) &&
    !new RegExp(`\\b${w}\\b`, "i").test(fromHard)
  ) {
    used.add(fromHard.toLowerCase());
    return fromHard;
  }
  if (!used.has(trimmed.toLowerCase())) {
    used.add(trimmed.toLowerCase());
    return trimmed;
  }
  return clueFor(answer, used);
}

const clueUsed = new Set();

const esc = (s) =>
  String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function blockFromGen(p) {
  const id = `${p.across[0].toLowerCase()}-${p.across[1].toLowerCase()}`;
  const acrossClues = p.across.map((w, i) => ({
    num: [1, 4, 5][i],
    clue: clueFor(w, clueUsed),
  }));
  const downClues = p.down.map((w, i) => ({
    num: [1, 2, 3][i],
    clue: clueFor(w, clueUsed),
  }));
  return `  {
    id: "${id}",
    rows: [${p.rows.map((r) => `"${r}"`).join(", ")}],
    across: [
${acrossClues.map((c) => `      { num: ${c.num}, clue: "${esc(c.clue)}" },`).join("\n")}
    ],
    down: [
${downClues.map((c) => `      { num: ${c.num}, clue: "${esc(c.clue)}" },`).join("\n")}
    ],
  }`;
}

function blockFromExisting(p) {
  const answers = answersFromRows(p.rows);
  // Map clue slots in order: across then down (same extract order)
  const acrossAns = [];
  const downAns = [];
  // Re-derive across/down answers from rows in reading order
  const g = p.rows.map((r) => r.split(""));
  const size = p.rows.length;
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (g[r][c] === "#") {
        c++;
        continue;
      }
      let w = "";
      const s = c;
      while (c < size && g[r][c] !== "#") w += g[r][c++];
      if (w.length >= 2 && (s === 0 || g[r][s - 1] === "#")) acrossAns.push(w);
    }
  }
  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (g[r][c] === "#") {
        r++;
        continue;
      }
      let w = "";
      const s = r;
      while (r < size && g[r][c] !== "#") w += g[r++][c];
      if (w.length >= 2 && (s === 0 || g[s - 1][c] === "#")) downAns.push(w);
    }
  }
  void answers;
  const acrossClues = p.across.map((c, i) => ({
    num: c.num,
    clue: hardenExistingClue(acrossAns[i] || "", c.clue, clueUsed),
  }));
  const downClues = p.down.map((c, i) => ({
    num: c.num,
    clue: hardenExistingClue(downAns[i] || "", c.clue, clueUsed),
  }));
  return `  {
    id: "${p.id}",
    rows: [${p.rows.map((r) => `"${r}"`).join(", ")}],
    across: [
${acrossClues.map((c) => `      { num: ${c.num}, clue: "${esc(c.clue)}" },`).join("\n")}
    ],
    down: [
${downClues.map((c) => `      { num: ${c.num}, clue: "${esc(c.clue)}" },`).join("\n")}
    ],
  }`;
}

// Fetch defs for existing answers too (to harden easy clues)
const existingWords = [
  ...new Set(existing.flatMap((p) => answersFromRows(p.rows))),
];
console.log("fetching defs for existing", existingWords.length);
Object.assign(HARD_CLUES, await fetchDefs(existingWords));

const existingChunks = existing.map(blockFromExisting);
const newBlocks = generated.map(blockFromGen);

// Build final ordered pack: prefer day-of-year stability — put existing first
// then new, total ≥ 366
const allBlocks = [...existingChunks, ...newBlocks];
while (allBlocks.length < 366 && newBlocks.length) {
  // shouldn't happen
  break;
}
console.log("final blocks", allBlocks.length);

const outFile = path.join(root, "src/lib/mini-crosswords.ts");
const file = `/** Auto-expanded mini crossword pack — unique answers & clues; ≥366 for year coverage. */
import type { MiniCrosswordPuzzle } from "./crossword-types";

export const MINI_CROSSWORDS: MiniCrosswordPuzzle[] = [
${allBlocks.join(",\n")}
];
`;

fs.writeFileSync("/tmp/year-pack-blocks-count.txt", String(allBlocks.length));
fs.writeFileSync("/tmp/year-gen-meta.json", JSON.stringify({
  existing: existing.length,
  generated: generated.length,
  total: allBlocks.length,
  clueUsed: clueUsed.size,
}, null, 2));

// Write types + pack file; caller will wire imports
fs.writeFileSync(
  path.join(root, "src/lib/crossword-types.ts"),
  `/** Shared crossword pack types (kept separate to avoid circular imports). */

export type MiniCrosswordPuzzle = {
  id: string;
  /** Square rows; letters = solution, \`#\` = block. Length = grid size. */
  rows: string[];
  across: { num: number; clue: string }[];
  down: { num: number; clue: string }[];
};
`,
);

fs.writeFileSync(outFile, file);
console.log("wrote", outFile, allBlocks.length);
