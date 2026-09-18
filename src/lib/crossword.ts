import type { RebuildState } from "./types";

/** Default / legacy mini size. Prefer `puzzleSize(puzzle)`. */
export const CROSSWORD_SIZE = 5;

/** Curated mini crossword — `#` = black cell. Square grids, typically 5–7. */
export type MiniCrosswordPuzzle = {
  id: string;
  /** Square rows; letters = solution, `#` = block. Length = grid size. */
  rows: string[];
  across: { num: number; clue: string }[];
  down: { num: number; clue: string }[];
};

/** Side length of a square puzzle. */
export function puzzleSize(puzzle: MiniCrosswordPuzzle): number {
  return puzzle.rows.length;
}

export type CrosswordCell = {
  row: number;
  col: number;
  index: number;
  black: boolean;
  number?: number;
  solution: string;
};

export type CrosswordDayProgress = {
  date: string;
  started: boolean;
  solved: boolean;
  /** Gave up via Solve — answers shown; grid locked; not a win */
  revealed?: boolean;
  /** Length `size²`; `""` empty, letter, or `"#"` for black */
  cells: string[];
};

export type DailyCrosswordState = {
  attempts: number;
  completed: number;
  current?: CrosswordDayProgress;
};

/**
 * Hand-authored + generated pack — classic and ladder 5×5 shapes.
 * Answer words must stay unique across the whole pack (enforced in tests).
 * Rotate by day-of-year (~50+ day cycle). Prefer pack growth over DATE_PUZZLES pins.
 */
export const MINI_CROSSWORDS: MiniCrosswordPuzzle[] = [
  {
    id: "vivid-spoil",
    rows: ["VIVID", "I#I#E", "SPOIL", "I#L#T", "TIARA"],
    across: [
      { num: 1, clue: "Technicolor, as a dream" },
      { num: 4, clue: "Ruin by overindulgence" },
      { num: 5, clue: "Diadem for a pageant" },
    ],
    down: [
      { num: 1, clue: "Drop by, briefly" },
      { num: 2, clue: "Violin’s deeper cousin" },
      { num: 3, clue: "River mouth landform" },
    ],
  },
  {
    id: "ache-lemon",
    rows: ["ACHE#", "X#U#K", "LEMON", "E#O#O", "#CRAB"],
    across: [
      { num: 1, clue: "Dull, lingering pain" },
      { num: 4, clue: "Yellow citrus" },
      { num: 5, clue: "Sideways beach walker" },
    ],
    down: [
      { num: 1, clue: "Car’s drive shaft" },
      { num: 2, clue: "Comic’s secret weapon" },
      { num: 3, clue: "Door or drawer handle" },
    ],
  },
  {
    id: "spree-manor",
    rows: ["SPREE", "U#I#G", "MANOR", "A#S#E", "CLEAT"],
    across: [
      { num: 1, clue: "Bender with a credit card" },
      { num: 4, clue: "Downton-style digs" },
      { num: 5, clue: "Deck-shoe gripper" },
    ],
    down: [
      { num: 1, clue: "Tangy red kebab seasoning" },
      { num: 2, clue: "Lather, ___, repeat" },
      { num: 3, clue: "Heron of marsh fame" },
    ],
  },
  {
    id: "barn-novel",
    rows: ["BARN#", "E#I#S", "NOVEL", "D#E#A", "#DRUM"],
    across: [
      { num: 1, clue: "Hayloft housing" },
      { num: 4, clue: "Bookstore fiction" },
      { num: 5, clue: "Beat-keeper in a kit" },
    ],
    down: [
      { num: 1, clue: "Curve in the road" },
      { num: 2, clue: "Amazon’s namesake waterway" },
      { num: 3, clue: "Shut loudly" },
    ],
  },
  {
    id: "spunk-ardor",
    rows: ["SPUNK", "T#N#A", "ARDOR", "S#U#M", "HYENA"],
    across: [
      { num: 1, clue: "Moxie, informally" },
      { num: 4, clue: "Heat of passion" },
      { num: 5, clue: "Laughing scavenger" },
    ],
    down: [
      { num: 1, clue: "Emergency cash cache" },
      { num: 2, clue: "Excessive, as pressure" },
      { num: 3, clue: "What goes around…" },
    ],
  },
  {
    id: "blue-input",
    rows: ["BLUE#", "R#P#S", "INPUT", "M#E#A", "#TRAY"],
    across: [
      { num: 1, clue: "Feeling down" },
      { num: 4, clue: "What a keyboard provides" },
      { num: 5, clue: "Cafeteria carrier" },
    ],
    down: [
      { num: 1, clue: "Hat’s edge" },
      { num: 2, clue: "Higher, as a floor" },
      { num: 3, clue: "Remain" },
    ],
  },
  {
    id: "weigh-polar",
    rows: ["WEIGH", "I#S#U", "POLAR", "E#E#R", "DITTY"],
    across: [
      { num: 1, clue: "Consider carefully" },
      { num: 4, clue: "Of opposite extremes" },
      { num: 5, clue: "Little song" },
    ],
    down: [
      { num: 1, clue: "Erased, as a slate" },
      { num: 2, clue: "Key in a chain, maybe" },
      { num: 3, clue: "Move with haste" },
    ],
  },
  {
    id: "bold-loyal",
    rows: ["BOLD#", "O#A#P", "LOYAL", "T#E#U", "#FROG"],
    across: [
      { num: 1, clue: "Daring typeface choice" },
      { num: 4, clue: "True-blue, as a friend" },
      { num: 5, clue: "Lily-pad hopper" },
    ],
    down: [
      { num: 1, clue: "Fasten with a nut" },
      { num: 2, clue: "Cake’s frosting plane" },
      { num: 3, clue: "Stop up, as a drain" },
    ],
  },
  {
    id: "video-whips",
    rows: ["VIDEO", "O#R#A", "WHIPS", "E#F#I", "LOTUS"],
    across: [
      { num: 1, clue: "TikTok unit, once" },
      { num: 4, clue: "Beats handily" },
      { num: 5, clue: "Padma’s namesake bloom" },
    ],
    down: [
      { num: 1, clue: "A, E, I, O, or U" },
      { num: 2, clue: "Snowbank mover" },
      { num: 3, clue: "Mirage haven" },
    ],
  },
  {
    id: "cave-actor",
    rows: ["CAVE#", "H#I#T", "ACTOR", "T#A#A", "#CLIP"],
    across: [
      { num: 1, clue: "Bat’s address" },
      { num: 4, clue: "Stage or screen player" },
      { num: 5, clue: "Movie snippet" },
    ],
    down: [
      { num: 1, clue: "Catch up over coffee" },
      { num: 2, clue: "Essential, as a sign" },
      { num: 3, clue: "Snare, as in hunting" },
    ],
  },
  {
    id: "yacht-hoard",
    rows: ["YACHT", "A#H#O", "HOARD", "O#R#A", "ODDLY"],
    across: [
      { num: 1, clue: "Monaco dock resident" },
      { num: 4, clue: "Dragon’s currency" },
      { num: 5, clue: "In a queer way" },
    ],
    down: [
      { num: 1, clue: "Search engine, once a whoop" },
      { num: 2, clue: "Swiss bunches of green" },
      { num: 3, clue: "Calendar’s lead story" },
    ],
  },
  {
    id: "chip-lunch",
    rows: ["CHIP#", "O#N#T", "LUNCH", "D#E#A", "#WREN"],
    across: [
      { num: 1, clue: "Poker ante unit" },
      { num: 4, clue: "Midday meal" },
      { num: 5, clue: "Tiny songbird" },
    ],
    down: [
      { num: 1, clue: "Chilly weather" },
      { num: 2, clue: "Core, as feelings" },
      { num: 3, clue: "Compared with" },
    ],
  },
  {
    id: "clasp-phone",
    rows: ["CLASP", "A#L#I", "PHONE", "E#O#C", "RIFLE"],
    across: [
      { num: 1, clue: "Brooch’s better half" },
      { num: 4, clue: "Dial or FaceTime" },
      { num: 5, clue: "Search thoroughly" },
    ],
    down: [
      { num: 1, clue: "Prank or frolic" },
      { num: 2, clue: "Coolly distant" },
      { num: 3, clue: "Share of the pie" },
    ],
  },
  {
    id: "care-radio",
    rows: ["CARE#", "O#I#H", "RADIO", "E#E#R", "#IRON"],
    across: [
      { num: 1, clue: "Concern or caution" },
      { num: 4, clue: "Dashboard soundtrack" },
      { num: 5, clue: "Press with heat" },
    ],
    down: [
      { num: 1, clue: "Apple’s center" },
      { num: 2, clue: "Horseback competitor" },
      { num: 3, clue: "Brass or French ___" },
    ],
  },
  {
    id: "three-inlet",
    rows: ["THREE", "R#U#N", "INLET", "A#E#R", "DERBY"],
    across: [
      { num: 1, clue: "Crowd’s a ___" },
      { num: 4, clue: "Bay’s little sibling" },
      { num: 5, clue: "Churchill Downs event" },
    ],
    down: [
      { num: 1, clue: "Chord of three tones" },
      { num: 2, clue: "Yardstick wielder" },
      { num: 3, clue: "Admission or debut" },
    ],
  },
  {
    id: "raft-piano",
    rows: ["RAFT#", "O#L#V", "PIANO", "E#M#L", "#ZEST"],
    across: [
      { num: 1, clue: "Huck’s river craft" },
      { num: 4, clue: "Grand or upright" },
      { num: 5, clue: "Lemon’s bright kick" },
    ],
    down: [
      { num: 1, clue: "Climbing aid" },
      { num: 2, clue: "Campfire tongue" },
      { num: 3, clue: "Amp unit" },
    ],
  },
  {
    id: "synth-vegan",
    rows: ["SYNTH", "E#I#O", "VEGAN", "E#H#O", "ROTOR"],
    across: [
      { num: 1, clue: "Moog’s domain, briefly" },
      { num: 4, clue: "No-dairy diner" },
      { num: 5, clue: "Chopper blade hub" },
    ],
    down: [
      { num: 1, clue: "Cut off, as ties" },
      { num: 2, clue: "Owl’s working hours" },
      { num: 3, clue: "Medal-worthy esteem" },
    ],
  },
  {
    id: "apple-draft",
    rows: ["APPLE", "U#L#N", "DRAFT", "I#N#E", "OUTER"],
    across: [
      { num: 1, clue: "Teacher’s desktop gift" },
      { num: 4, clue: "Beer on tap, or a first pass" },
      { num: 5, clue: "External, as a layer" },
    ],
    down: [
      { num: 1, clue: "Podcast or album sound" },
      { num: 2, clue: "Garden green" },
      { num: 3, clue: "Go in" },
    ],
  },
  {
    id: "wasp-score",
    rows: ["WASP#", "I#T#N", "SCORE", "P#V#O", "#VEIN"],
    across: [
      { num: 1, clue: "Picnic pest" },
      { num: 4, clue: "Final tally" },
      { num: 5, clue: "Blood vessel" },
    ],
    down: [
      { num: 1, clue: "Thin strand" },
      { num: 2, clue: "Kitchen heat box" },
      { num: 3, clue: "Gas-station glow" },
    ],
  },
  {
    id: "badge-image",
    rows: ["BADGE", "R#R#V", "IMAGE", "N#M#N", "GIANT"],
    across: [
      { num: 1, clue: "Scout’s sew-on honor" },
      { num: 4, clue: "Public reputation" },
      { num: 5, clue: "Jack’s beanstalk foe" },
    ],
    down: [
      { num: 1, clue: "Carry along" },
      { num: 2, clue: "Stage play" },
      { num: 3, clue: "Calendar happening" },
    ],
  },
  {
    id: "basic-arena",
    rows: ["BASIC", "O#L#O", "ARENA", "R#E#C", "DEPTH"],
    across: [
      { num: 1, clue: "Elementary, as skills" },
      { num: 4, clue: "Gladiator’s venue" },
      { num: 5, clue: "How deep it goes" },
    ],
    down: [
      { num: 1, clue: "Plank meeting" },
      { num: 2, clue: "What you do at night" },
      { num: 3, clue: "Sideline shouter" },
    ],
  },
  {
    id: "catch-panel",
    rows: ["CATCH", "H#R#O", "EXACT", "A#I#E", "PANEL"],
    across: [
      { num: 1, clue: "What a mitt does" },
      { num: 4, clue: "Precise, as a fit" },
      { num: 5, clue: "Discussion group, or wall section" },
    ],
    down: [
      { num: 1, clue: "Bargain-bin priced" },
      { num: 2, clue: "Locomotive convoy" },
      { num: 3, clue: "Lodging with a lobby" },
    ],
  },
{
    id: "flush-intel",
    rows: ["FLUSH", "A#N#O", "INTEL", "L#I#E", "SALES"],
    across: [
      { num: 1, clue: "Poker hand of one suit" },
      { num: 4, clue: "Spy info, for short" },
      { num: 5, clue: "Clearance events" },
    ],
    down: [
      { num: 1, clue: "Flunks" },
      { num: 2, clue: "Up to the time of" },
      { num: 3, clue: "Doughnut centers" },
    ],
  },
  {
    id: "tiles-scowl",
    rows: ["TILES", "A#I#I", "SCOWL", "T#N#K", "ESSAY"],
    across: [
      { num: 1, clue: "Bathroom floor squares" },
      { num: 4, clue: "Angry look" },
      { num: 5, clue: "School paper" },
    ],
    down: [
      { num: 1, clue: "Sip check" },
      { num: 2, clue: "Pride big cats" },
      { num: 3, clue: "Smooth to touch" },
    ],
  },
  {
    id: "globe-anger",
    rows: ["GLOBE", "O#R#A", "ANGER", "L#A#L", "SUNNY"],
    across: [
      { num: 1, clue: "Desktop Earth model" },
      { num: 4, clue: "Hot emotion" },
      { num: 5, clue: "Clear skies" },
    ],
    down: [
      { num: 1, clue: "Soccer scores" },
      { num: 2, clue: "Church keyboard" },
      { num: 3, clue: "Before schedule" },
    ],
  },
  {
    id: "tight-pause",
    rows: ["TIGHT", "Y#A#E", "PAUSE", "E#G#N", "STEPS"],
    across: [
      { num: 1, clue: "Snug, as jeans" },
      { num: 4, clue: "Brief stop" },
      { num: 5, clue: "Staircase parts" },
    ],
    down: [
      { num: 1, clue: "Kinds or sorts" },
      { num: 2, clue: "Fuel meter" },
      { num: 3, clue: "High-school ages" },
    ],
  },
  {
    id: "scene-radar",
    rows: ["SCENE", "E#L#A", "RADAR", "U#E#T", "MIRTH"],
    across: [
      { num: 1, clue: "Movie setting" },
      { num: 4, clue: "Airport tracker" },
      { num: 5, clue: "Glee" },
    ],
    down: [
      { num: 1, clue: "Lab vial contents" },
      { num: 2, clue: "Older of two" },
      { num: 3, clue: "Third planet" },
    ],
  },
  {
    id: "brown-dense",
    rows: ["BROWN", "A#W#E", "DENSE", "L#E#D", "YARDS"],
    across: [
      { num: 1, clue: "Coffee-order color" },
      { num: 4, clue: "Thick, as fog" },
      { num: 5, clue: "Football gain units" },
    ],
    down: [
      { num: 1, clue: "In a poor way" },
      { num: 2, clue: "Deed holder" },
      { num: 3, clue: "Requires" },
    ],
  },
  {
    id: "aware-raise",
    rows: ["AWARE", "C#M#L", "RAISE", "E#N#C", "SHORT"],
    across: [
      { num: 1, clue: "In the know" },
      { num: 4, clue: "Salary bump" },
      { num: 5, clue: "Not tall" },
    ],
    down: [
      { num: 1, clue: "Farm parcels" },
      { num: 2, clue: "___ acid" },
      { num: 3, clue: "Vote in" },
    ],
  },
  {
    id: "sheet-ultra",
    rows: ["SHEET", "O#X#R", "ULTRA", "L#R#C", "SHADE"],
    across: [
      { num: 1, clue: "Bed linen piece" },
      { num: 4, clue: "Extreme prefix" },
      { num: 5, clue: "Tree cover" },
    ],
    down: [
      { num: 1, clue: "Spiritual selves" },
      { num: 2, clue: "Bonus scene" },
      { num: 3, clue: "Faint leftover" },
    ],
  },
  {
    id: "phase-worse",
    rows: ["PHASE", "O#P#V", "WORSE", "E#I#R", "RALLY"],
    across: [
      { num: 1, clue: "Moon stage" },
      { num: 4, clue: "Not as good" },
      { num: 5, clue: "Pep event" },
    ],
    down: [
      { num: 1, clue: "Electrical might" },
      { num: 2, clue: "Fools' Day month" },
      { num: 3, clue: "Each and ___" },
    ],
  },
  {
    id: "sweet-angel",
    rows: ["SWEET", "H#D#E", "ANGEL", "F#E#L", "TESTS"],
    across: [
      { num: 1, clue: "Sugary" },
      { num: 4, clue: "Halo wearer" },
      { num: 5, clue: "Classroom quizzes" },
    ],
    down: [
      { num: 1, clue: "Elevator passage" },
      { num: 2, clue: "Page borders" },
      { num: 3, clue: "Narrates" },
    ],
  },
  {
    id: "great-mourn",
    rows: ["GREAT", "A#Q#U", "MOURN", "E#A#E", "SOLAR"],
    across: [
      { num: 1, clue: "Wonderful" },
      { num: 4, clue: "Grieve" },
      { num: 5, clue: "Sun-powered" },
    ],
    down: [
      { num: 1, clue: "PlayStation fare" },
      { num: 2, clue: "Same in amount" },
      { num: 3, clue: "Radio dial" },
    ],
  },
  {
    id: "crash-email",
    rows: ["CRASH", "H#W#E", "EMAIL", "A#R#P", "TIDES"],
    across: [
      { num: 1, clue: "Auto wreck" },
      { num: 4, clue: "Inbox message" },
      { num: 5, clue: "Beach ebbs" },
    ],
    down: [
      { num: 1, clue: "Break the rules" },
      { num: 2, clue: "Oscar or Emmy" },
      { num: 3, clue: "Lends a hand" },
    ],
  },
  {
    id: "inter-coast",
    rows: ["INTER", "N#E#A", "COAST", "U#M#E", "RISKS"],
    across: [
      { num: 1, clue: "Burial, old-style" },
      { num: 4, clue: "Shoreline" },
      { num: 5, clue: "Takes chances" },
    ],
    down: [
      { num: 1, clue: "Bring upon oneself" },
      { num: 2, clue: "League sides" },
      { num: 3, clue: "Hotel prices" },
    ],
  },
  {
    id: "crime-music",
    rows: ["CRIME", "A#S#X", "MUSIC", "P#U#E", "STEEL"],
    across: [
      { num: 1, clue: "Lawbreaking" },
      { num: 4, clue: "Playlist stuff" },
      { num: 5, clue: "Beam metal" },
    ],
    down: [
      { num: 1, clue: "Scout sites" },
      { num: 2, clue: "Magazine edition" },
      { num: 3, clue: "Do great" },
    ],
  },
  {
    id: "wages-thorn",
    rows: ["WAGES", "A#R#I", "THORN", "C#A#C", "HINGE"],
    across: [
      { num: 1, clue: "Hourly pay" },
      { num: 4, clue: "Rose prickle" },
      { num: 5, clue: "Door pivot" },
    ],
    down: [
      { num: 1, clue: "Observe" },
      { num: 2, clue: "Complaint sound" },
      { num: 3, clue: "From then on" },
    ],
  },
  {
    id: "owned-balls",
    rows: ["OWNED", "R#Y#I", "BALLS", "I#O#C", "TENTS"],
    across: [
      { num: 1, clue: "Had title to" },
      { num: 4, clue: "Sports spheres" },
      { num: 5, clue: "Canvas shelters" },
    ],
    down: [
      { num: 1, clue: "Planet path" },
      { num: 2, clue: "Stocking material" },
      { num: 3, clue: "Frisbee shapes" },
    ],
  },
  {
    id: "bones-unite",
    rows: ["BONES", "O#O#T", "UNITE", "N#S#A", "DREAM"],
    across: [
      { num: 1, clue: "Skeleton parts" },
      { num: 4, clue: "Join together" },
      { num: 5, clue: "Sleep story" },
    ],
    down: [
      { num: 1, clue: "Tied up" },
      { num: 2, clue: "Unwanted sound" },
      { num: 3, clue: "Kettle output" },
    ],
  },
  {
    id: "spray-agree",
    rows: ["SPRAY", "T#U#I", "AGREE", "T#A#L", "SALAD"],
    across: [
      { num: 1, clue: "Aerosol burst" },
      { num: 4, clue: "See eye to eye" },
      { num: 5, clue: "Leafy bowl" },
    ],
    down: [
      { num: 1, clue: "Box-score numbers" },
      { num: 2, clue: "Not urban" },
      { num: 3, clue: "Give way" },
    ],
  },
  {
    id: "match-light",
    rows: ["MATCH", "E#I#A", "LIGHT", "O#E#C", "NORTH"],
    across: [
      { num: 1, clue: "Soccer contest" },
      { num: 4, clue: "Lamp output" },
      { num: 5, clue: "Compass point" },
    ],
    down: [
      { num: 1, clue: "Watermelon kin" },
      { num: 2, clue: "Striped cat" },
      { num: 3, clue: "Egg opening" },
    ],
  },
  {
    id: "hosts-rouse",
    rows: ["HOSTS", "O#Q#P", "ROUSE", "S#A#N", "ENDED"],
    across: [
      { num: 1, clue: "Party throwers" },
      { num: 4, clue: "Wake up" },
      { num: 5, clue: "Came to a close" },
    ],
    down: [
      { num: 1, clue: "Derby runner" },
      { num: 2, clue: "Police unit" },
      { num: 3, clue: "Shell out" },
    ],
  },
  {
    id: "films-order",
    rows: ["FILMS", "R#O#U", "ORDER", "S#G#G", "THEME"],
    across: [
      { num: 1, clue: "Movie night picks" },
      { num: 4, clue: "Menu request" },
      { num: 5, clue: "Party motif" },
    ],
    down: [
      { num: 1, clue: "Window ice" },
      { num: 2, clue: "Cabin" },
      { num: 3, clue: "Power spike" },
    ],
  },
  {
    id: "racks-using",
    rows: ["RACKS", "O#R#I", "USING", "N#S#H", "DEPOT"],
    across: [
      { num: 1, clue: "Spice shelf rods" },
      { num: 4, clue: "Making use of" },
      { num: 5, clue: "Bus station" },
    ],
    down: [
      { num: 1, clue: "Circular" },
      { num: 2, clue: "Like a potato chip" },
      { num: 3, clue: "Vision" },
    ],
  },
  {
    id: "nails-whose",
    rows: ["NAILS", "E#V#H", "WHOSE", "E#R#L", "ROYAL"],
    across: [
      { num: 1, clue: "Hammer targets" },
      { num: 4, clue: "___ side are you on?" },
      { num: 5, clue: "Fit for a king" },
    ],
    down: [
      { num: 1, clue: "More recent" },
      { num: 2, clue: "Piano key material" },
      { num: 3, clue: "Taco exterior" },
    ],
  },

  {
    id: "nerve-clamp",
    rows: ["NERVE", "I#O#M", "CLAMP", "E#D#T", "RUSTY"],
    across: [
      { num: 1, clue: "Audacity" },
      { num: 4, clue: "Hold tight tool" },
      { num: 5, clue: "Needs oil" },
    ],
    down: [
      { num: 1, clue: "More pleasant" },
      { num: 2, clue: "Highways" },
      { num: 3, clue: "Not full" },
    ],
  },
  {
    id: "lyric-ulcer",
    rows: ["LYRIC", "A#E#A", "ULCER", "G#A#R", "HAPPY"],
    across: [
      { num: 1, clue: "Song words" },
      { num: 4, clue: "Stomach woe" },
      { num: 5, clue: "Glad" },
    ],
    down: [
      { num: 1, clue: "Chuckle" },
      { num: 2, clue: "Summary" },
      { num: 3, clue: "Tote" },
    ],
  },
  {
    id: "craft-maple",
    rows: ["CRAFT", "O#L#E", "MAPLE", "E#H#T", "TEACH"],
    across: [
      { num: 1, clue: "Handmade art" },
      { num: 4, clue: "Syrup tree" },
      { num: 5, clue: "Instruct" },
    ],
    down: [
      { num: 1, clue: "Shooting visitor" },
      { num: 2, clue: "First Greek letter" },
      { num: 3, clue: "Dentist's concern" },
    ],
  },
  {
    id: "cloud-oxide",
    rows: ["CLOUD", "L#L#W", "OXIDE", "C#V#L", "KNEEL"],
    across: [
      { num: 1, clue: "Sky puff" },
      { num: 4, clue: "Rust relative" },
      { num: 5, clue: "Get down on one knee" },
    ],
    down: [
      { num: 1, clue: "Wall timepiece" },
      { num: 2, clue: "Martini garnish" },
      { num: 3, clue: "Reside" },
    ],
  },
  {
    id: "mango-dance",
    rows: ["MANGO", "E#I#C", "DANCE", "A#J#A", "LEARN"],
    across: [
      { num: 1, clue: "Tropical fruit" },
      { num: 4, clue: "Club activity" },
      { num: 5, clue: "Study up" },
    ],
    down: [
      { num: 1, clue: "Podium prize" },
      { num: 2, clue: "Stealth fighter" },
      { num: 3, clue: "Vast sea" },
    ],
  },
  {
    id: "waves-villa",
    rows: ["WAVES", "O#A#E", "VILLA", "E#E#T", "NOTES"],
    across: [
      { num: 1, clue: "Surf sets" },
      { num: 4, clue: "Luxury house" },
      { num: 5, clue: "Classroom jottings" },
    ],
    down: [
      { num: 1, clue: "Like fabric" },
      { num: 2, clue: "Parking helper" },
      { num: 3, clue: "Theater places" },
    ],
  },
  {
    id: "inns-lobby",
    rows: ["INNS#", "D#O#M", "LOBBY", "E#L#T", "#TECH"],
    across: [
      { num: 1, clue: "Roadside lodgings" },
      { num: 4, clue: "Hotel entrance hall" },
      { num: 5, clue: "Silicon Valley field" },
    ],
    down: [
      { num: 1, clue: "Not working" },
      { num: 2, clue: "High-born" },
      { num: 3, clue: "Ancient legend" },
    ],
  },
  {
    id: "meal-above",
    rows: ["MEAL#", "E#B#K", "ABOVE", "T#D#E", "#DEEP"],
    across: [
      { num: 1, clue: "Breakfast or dinner" },
      { num: 4, clue: "Overhead" },
      { num: 5, clue: "Not shallow" },
    ],
    down: [
      { num: 1, clue: "Butcher's stock" },
      { num: 2, clue: "Home" },
      { num: 3, clue: "Retain" },
    ],
  },
  {
    id: "luck-trend",
    rows: ["LUCK#", "A#L#I", "TREND", "E#A#O", "#INTL"],
    across: [
      { num: 1, clue: "Good fortune" },
      { num: 4, clue: "Viral direction" },
      { num: 5, clue: "Global, for short" },
    ],
    down: [
      { num: 1, clue: "After schedule" },
      { num: 2, clue: "Not dirty" },
      { num: 3, clue: "Teen crush" },
    ],
  },
  {
    id: "vary-shape",
    rows: ["VARY#", "I#E#B", "SHAPE", "A#D#D", "#EYES"],
    across: [
      { num: 1, clue: "Differ" },
      { num: 4, clue: "Form or outline" },
      { num: 5, clue: "Peepers" },
    ],
    down: [
      { num: 1, clue: "Passport stamp" },
      { num: 2, clue: "All set" },
      { num: 3, clue: "Places to sleep" },
    ],
  },
  {
    id: "plan-table",
    rows: ["PLAN#", "U#R#R", "TABLE", "S#O#A", "#GRID"],
    across: [
      { num: 1, clue: "Itinerary" },
      { num: 4, clue: "Dinner surface" },
      { num: 5, clue: "City street pattern" },
    ],
    down: [
      { num: 1, clue: "Golf green shots" },
      { num: 2, clue: "Garden arch" },
      { num: 3, clue: "Scan a book" },
    ],
  },
  {
    id: "hats-grain",
    rows: ["HATS#", "I#R#K", "GRAIN", "H#I#O", "#SLOW"],
    across: [
      { num: 1, clue: "Headwear" },
      { num: 4, clue: "Wheat unit" },
      { num: 5, clue: "Not fast" },
    ],
    down: [
      { num: 1, clue: "Altitude word" },
      { num: 2, clue: "Hiking path" },
      { num: 3, clue: "Be aware" },
    ],
  }
];

function dayOfYear(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 0);
  const now = Date.UTC(y, m - 1, d);
  return Math.floor((now - start) / 86_400_000);
}

/** Pin a fresh puzzle to a calendar day without reshuffling the pack. */
const DATE_PUZZLES: Record<string, MiniCrosswordPuzzle> = {
  // Empty on purpose: pins that also appear in the rotating pack
  // reuse answers mid-cycle. Grow the pack instead.
};

export function puzzleForDate(date: string): MiniCrosswordPuzzle {
  const pinned = DATE_PUZZLES[date];
  if (pinned) return pinned;
  const pack = MINI_CROSSWORDS;
  const idx = ((dayOfYear(date) % pack.length) + pack.length) % pack.length;
  return pack[idx]!;
}

export function emptyCellsForPuzzle(puzzle: MiniCrosswordPuzzle): string[] {
  const cells: string[] = [];
  for (const row of puzzle.rows) {
    for (const ch of row) {
      cells.push(ch === "#" ? "#" : "");
    }
  }
  return cells;
}

/** Reading-order start numbers for cells that begin an across and/or down. */
export function startNumberMap(
  puzzle: MiniCrosswordPuzzle,
): Map<number, number> {
  const size = puzzleSize(puzzle);
  const map = new Map<number, number>();
  let next = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzle.rows[r]![c] === "#") continue;
      const isAcross =
        (c === 0 || puzzle.rows[r]![c - 1] === "#") &&
        c + 1 < size &&
        puzzle.rows[r]![c + 1] !== "#";
      const isDown =
        (r === 0 || puzzle.rows[r - 1]![c] === "#") &&
        r + 1 < size &&
        puzzle.rows[r + 1]![c] !== "#";
      if (!isAcross && !isDown) continue;
      map.set(r * size + c, next);
      next += 1;
    }
  }
  return map;
}

export function buildGrid(puzzle: MiniCrosswordPuzzle): CrosswordCell[] {
  const size = puzzleSize(puzzle);
  const starts = startNumberMap(puzzle);
  const cells: CrosswordCell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      const ch = puzzle.rows[row]![col]!;
      cells.push({
        row,
        col,
        index,
        black: ch === "#",
        number: starts.get(index),
        solution: ch === "#" ? "#" : ch.toUpperCase(),
      });
    }
  }
  return cells;
}

export function clueStartIndex(
  puzzle: MiniCrosswordPuzzle,
  num: number,
): number | null {
  for (const [index, n] of startNumberMap(puzzle)) {
    if (n === num) return index;
  }
  return null;
}

export function answerAt(
  puzzle: MiniCrosswordPuzzle,
  num: number,
  dir: "across" | "down",
): string {
  const size = puzzleSize(puzzle);
  const start = clueStartIndex(puzzle, num);
  if (start == null) return "";
  const row = Math.floor(start / size);
  const col = start % size;
  let out = "";
  if (dir === "across") {
    for (let c = col; c < size; c++) {
      const ch = puzzle.rows[row]![c]!;
      if (ch === "#") break;
      out += ch;
    }
  } else {
    for (let r = row; r < size; r++) {
      const ch = puzzle.rows[r]![col]!;
      if (ch === "#") break;
      out += ch;
    }
  }
  return out.toUpperCase();
}

export function fillableCount(puzzle: MiniCrosswordPuzzle): number {
  let n = 0;
  for (const row of puzzle.rows) {
    for (const ch of row) if (ch !== "#") n += 1;
  }
  return n;
}

export function filledCount(cells: string[]): number {
  let n = 0;
  for (const ch of cells) {
    if (ch && ch !== "#") n += 1;
  }
  return n;
}

/** Today’s fill % — letters entered ÷ fillable (wrong letters still count). */
export function todayFillPercent(
  puzzle: MiniCrosswordPuzzle,
  cells: string[] | undefined,
): number {
  const total = fillableCount(puzzle);
  if (total === 0) return 0;
  if (!cells?.length) return 0;
  return Math.round((filledCount(cells) / total) * 100);
}

export function isGridSolved(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): boolean {
  const size = puzzleSize(puzzle);
  if (cells.length !== size * size) return false;
  for (let i = 0; i < cells.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    const sol = puzzle.rows[row]![col]!;
    if (sol === "#") continue;
    if ((cells[i] || "").toUpperCase() !== sol.toUpperCase()) return false;
  }
  return true;
}

/** Full solution grid (same shape as playable cells). */
export function solutionCells(puzzle: MiniCrosswordPuzzle): string[] {
  const cells: string[] = [];
  for (const row of puzzle.rows) {
    for (const ch of row) {
      cells.push(ch === "#" ? "#" : ch.toUpperCase());
    }
  }
  return cells;
}

export type CrosswordDir = "across" | "down";

export type CrosswordEntry = {
  num: number;
  dir: CrosswordDir;
  indexes: number[];
};

/** Indexes for one across or down entry starting at `num`. */
export function wordCellIndexes(
  puzzle: MiniCrosswordPuzzle,
  num: number,
  dir: CrosswordDir,
): number[] {
  const size = puzzleSize(puzzle);
  const start = clueStartIndex(puzzle, num);
  if (start == null) return [];
  const row = Math.floor(start / size);
  const col = start % size;
  const indexes: number[] = [];
  if (dir === "across") {
    for (let c = col; c < size; c++) {
      if (puzzle.rows[row]![c] === "#") break;
      indexes.push(row * size + c);
    }
  } else {
    for (let r = row; r < size; r++) {
      if (puzzle.rows[r]![col] === "#") break;
      indexes.push(r * size + col);
    }
  }
  return indexes;
}

/**
 * Across or down clue entry that owns `index` for the given direction.
 * Returns null when that cell isn’t part of a listed clue in `dir`.
 */
export function entryForCell(
  puzzle: MiniCrosswordPuzzle,
  index: number,
  dir: CrosswordDir,
): CrosswordEntry | null {
  const clues = dir === "across" ? puzzle.across : puzzle.down;
  for (const c of clues) {
    const indexes = wordCellIndexes(puzzle, c.num, dir);
    if (indexes.includes(index)) {
      return { num: c.num, dir, indexes };
    }
  }
  return null;
}

/** Prefer `dir`, else the other direction, else null. */
export function entryForCellPrefer(
  puzzle: MiniCrosswordPuzzle,
  index: number,
  dir: CrosswordDir,
): CrosswordEntry | null {
  return (
    entryForCell(puzzle, index, dir) ??
    entryForCell(puzzle, index, dir === "across" ? "down" : "across")
  );
}

export function entryHasLetters(
  cells: string[],
  indexes: number[],
): boolean {
  return indexes.some((i) => {
    const ch = cells[i];
    return Boolean(ch && ch !== "#");
  });
}

/**
 * True when the entry has at least one letter that Clear would remove
 * (ignores letters already locked by a fully correct crossing word).
 */
export function entryHasClearableLetters(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  indexes: number[],
): boolean {
  const keep = correctWordCellIndexes(puzzle, cells);
  return indexes.some((i) => {
    const ch = cells[i];
    return Boolean(ch && ch !== "#" && !keep.has(i));
  });
}

/**
 * Wipe letters for one clue entry.
 * Leaves black cells alone, and keeps letters already marked correct
 * via a completed across/down word (so Clear won’t trash a good cross).
 */
export function clearEntryCells(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  indexes: number[],
): string[] {
  const keep = correctWordCellIndexes(puzzle, cells);
  const next = [...cells];
  for (const i of indexes) {
    if (next[i] === "#") continue;
    if (keep.has(i)) continue;
    next[i] = "";
  }
  return next;
}

/** Next fillable cell along an across/down run, or null at the edge. */
export function nextCellInDirection(
  puzzle: MiniCrosswordPuzzle,
  index: number,
  dir: CrosswordDir,
  step: 1 | -1,
): number | null {
  const size = puzzleSize(puzzle);
  const row = Math.floor(index / size);
  const col = index % size;
  let r = row;
  let c = col;
  if (dir === "across") c += step;
  else r += step;
  if (r < 0 || r >= size || c < 0 || c >= size) {
    return null;
  }
  if (puzzle.rows[r]![c] === "#") return null;
  return r * size + c;
}

/** True when every letter of that entry is filled and matches the solution. */
export function isWordCorrect(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  num: number,
  dir: CrosswordDir,
): boolean {
  const indexes = wordCellIndexes(puzzle, num, dir);
  if (indexes.length < 2) return false;
  const size = puzzleSize(puzzle);
  for (const i of indexes) {
    const row = Math.floor(i / size);
    const col = i % size;
    const sol = puzzle.rows[row]![col]!;
    const got = (cells[i] || "").toUpperCase();
    if (!got || got !== sol.toUpperCase()) return false;
  }
  return true;
}

/**
 * Cells that belong to at least one fully correct across/down word.
 * Used to flash “got it” feedback while the puzzle is still open.
 */
export function correctWordCellIndexes(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): Set<number> {
  const out = new Set<number>();
  for (const c of puzzle.across) {
    if (isWordCorrect(puzzle, cells, c.num, "across")) {
      for (const i of wordCellIndexes(puzzle, c.num, "across")) out.add(i);
    }
  }
  for (const c of puzzle.down) {
    if (isWordCorrect(puzzle, cells, c.num, "down")) {
      for (const i of wordCellIndexes(puzzle, c.num, "down")) out.add(i);
    }
  }
  return out;
}

export function normalizeDailyCrossword(
  raw: DailyCrosswordState | undefined,
): DailyCrosswordState {
  return {
    attempts: Math.max(0, Math.floor(raw?.attempts ?? 0)),
    completed: Math.max(0, Math.floor(raw?.completed ?? 0)),
    current: raw?.current
      ? {
          date: raw.current.date,
          started: Boolean(raw.current.started),
          solved: Boolean(raw.current.solved),
          revealed: Boolean(raw.current.revealed),
          cells: Array.isArray(raw.current.cells)
            ? raw.current.cells.map((c) =>
                c === "#" ? "#" : String(c || "").toUpperCase().slice(0, 1),
              )
            : [],
        }
      : undefined,
  };
}

export function bannerText(
  completed: number,
  attempts: number,
): string {
  const safeCompleted = Math.max(0, Math.floor(completed));
  const safeAttempts = Math.max(0, Math.floor(attempts));
  const frac = `${safeCompleted}/${safeAttempts}`;
  if (safeAttempts <= 0) return `${frac} · —`;
  const rate = Math.round((safeCompleted / safeAttempts) * 100);
  return `${frac} · ${rate}%`;
}

export type CrosswordAction =
  | { action: "start"; date: string }
  | { action: "save"; date: string; cells: string[] }
  | { action: "complete"; date: string; cells?: string[] }
  | { action: "reveal"; date: string };

export function applyCrosswordAction(
  state: RebuildState,
  payload: CrosswordAction,
): RebuildState {
  const puzzle = puzzleForDate(payload.date);
  let dc = normalizeDailyCrossword(state.dailyCrossword);
  const expectedLen = puzzleSize(puzzle) * puzzleSize(puzzle);
  let sameDay = dc.current?.date === payload.date ? dc.current : undefined;
  // Pack/size can change for a date mid-day — drop incompatible fills.
  if (sameDay && sameDay.cells.length !== expectedLen) {
    sameDay = {
      ...sameDay,
      solved: false,
      revealed: false,
      cells: emptyCellsForPuzzle(puzzle),
    };
    dc = { ...dc, current: sameDay };
  }

  if (payload.action === "start") {
    if (sameDay?.started) {
      return { ...state, dailyCrossword: dc };
    }
    const next: DailyCrosswordState = {
      attempts: dc.attempts + 1,
      completed: dc.completed,
      current: {
        date: payload.date,
        started: true,
        solved: false,
        revealed: false,
        cells: emptyCellsForPuzzle(puzzle),
      },
    };
    return { ...state, dailyCrossword: next };
  }

  if (!sameDay?.started) {
    return { ...state, dailyCrossword: dc };
  }

  // Locked after a real solve or a give-up reveal — no further edits.
  if (sameDay.solved || sameDay.revealed) {
    return { ...state, dailyCrossword: dc };
  }

  if (payload.action === "reveal") {
    const next: DailyCrosswordState = {
      attempts: dc.attempts,
      completed: dc.completed,
      current: {
        date: payload.date,
        started: true,
        solved: false,
        revealed: true,
        cells: solutionCells(puzzle),
      },
    };
    return { ...state, dailyCrossword: next };
  }

  const cells = normalizeCells(
    puzzle,
    payload.action === "save"
      ? payload.cells
      : (payload.cells ?? sameDay.cells),
  );

  const solved = isGridSolved(puzzle, cells);
  const next: DailyCrosswordState = {
    attempts: dc.attempts,
    completed: solved ? dc.completed + 1 : dc.completed,
    current: {
      date: payload.date,
      started: true,
      solved,
      revealed: false,
      cells,
    },
  };
  return { ...state, dailyCrossword: next };
}

function normalizeCells(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): string[] {
  const base = emptyCellsForPuzzle(puzzle);
  return base.map((b, i) => {
    if (b === "#") return "#";
    const raw = (cells[i] || "").toUpperCase().replace(/[^A-Z]/g, "");
    return raw.slice(0, 1);
  });
}

/** True when the clue contains the answer as a whole word (case-insensitive). */
export function clueLeaksAnswer(clue: string, answer: string): boolean {
  const a = answer.trim().toUpperCase();
  if (a.length < 2) return false;
  const re = new RegExp(`\\b${a.replace(/[^A-Z]/g, "")}\\b`, "i");
  return re.test(clue);
}

/** Validate pack integrity (tests). */
export function assertPuzzleValid(puzzle: MiniCrosswordPuzzle): void {
  const size = puzzleSize(puzzle);
  if (size < 5 || size > 9) {
    throw new Error(`${puzzle.id}: size ${size} out of range 5–9`);
  }
  for (const row of puzzle.rows) {
    if (row.length !== size) {
      throw new Error(`${puzzle.id}: row length ${row.length} ≠ ${size}`);
    }
  }
  const nums = startNumberMap(puzzle);
  for (const c of puzzle.across) {
    if (![...nums.values()].includes(c.num)) {
      throw new Error(`${puzzle.id}: missing across start ${c.num}`);
    }
    const a = answerAt(puzzle, c.num, "across");
    if (a.length < 2) throw new Error(`${puzzle.id}: across ${c.num} short`);
    if (clueLeaksAnswer(c.clue, a)) {
      throw new Error(
        `${puzzle.id}: across ${c.num} clue leaks answer "${a}"`,
      );
    }
  }
  for (const c of puzzle.down) {
    if (![...nums.values()].includes(c.num)) {
      throw new Error(`${puzzle.id}: missing down start ${c.num}`);
    }
    const a = answerAt(puzzle, c.num, "down");
    if (a.length < 2) throw new Error(`${puzzle.id}: down ${c.num} short`);
    if (clueLeaksAnswer(c.clue, a)) {
      throw new Error(`${puzzle.id}: down ${c.num} clue leaks answer "${a}"`);
    }
  }
  const clueTexts = [...puzzle.across, ...puzzle.down].map((c) =>
    c.clue.trim().toLowerCase(),
  );
  const seen = new Set<string>();
  for (const text of clueTexts) {
    if (seen.has(text)) {
      throw new Error(`${puzzle.id}: duplicate clue "${text}"`);
    }
    seen.add(text);
  }
}
