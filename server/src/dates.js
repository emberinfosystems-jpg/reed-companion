// Deterministic date handling for Mira's organizer calendar. The MODEL never computes a date — it only
// copies the child's own time words ("tomorrow", "Friday", "October 30"). THIS file turns those words into
// a real ISO date (YYYY-MM-DD) with plain arithmetic, so a child's reminder is never silently wrong.
// (LLMs are unreliable at date math — same class of failure as diff-line arithmetic — so we never trust
// a model with a kid's "when".) parseWhen() returns an ISO date or null; humanizeDate() reads one back warmly.

const WD = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; };

// first 3 letters of a month name -> 0-based index, or -1
const monthIndex = (word) =>
  ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
    String(word || "").slice(0, 3).toLowerCase(),
  );

// A month+day with no year: this year, or next year if it has already passed.
function fromMonthDay(mIdx, day, base) {
  if (mIdx < 0 || !(day >= 1 && day <= 31)) return null;
  let d = startOfDay(new Date(base.getFullYear(), mIdx, day));
  if (d < base) d = startOfDay(new Date(base.getFullYear() + 1, mIdx, day));
  return ymd(d);
}

const NUM_WORDS = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

/**
 * Turn a child's time phrase into an ISO date (YYYY-MM-DD), deterministically. Returns null if the phrase
 * carries no parseable date (the item is still kept, just without a date). `now` is injectable for tests.
 */
export function parseWhen(phrase, now = new Date()) {
  if (!phrase || typeof phrase !== "string") return null;
  const s = phrase.trim().toLowerCase();
  if (!s) return null;
  const base = startOfDay(now);

  // relative words (order matters: "day after tomorrow" before "tomorrow")
  if (/\b(today|tonight|this (morning|afternoon|evening|afternoon)|right now)\b/.test(s)) return ymd(base);
  if (/\bday[-\s]?after[-\s]?tomorrow\b/.test(s)) return ymd(addDays(base, 2));
  if (/\btomorrow\b/.test(s)) return ymd(addDays(base, 1));
  if (/\bnext week\b/.test(s)) return ymd(addDays(base, 7));

  // "in N days/weeks" — digits or small number words
  let m = s.match(/\bin\s+(\d{1,3})\s+(days?|weeks?)\b/);
  if (m) return ymd(addDays(base, parseInt(m[1], 10) * (/week/.test(m[2]) ? 7 : 1)));
  m = s.match(/\bin\s+(a|one|two|three|four|five|six|seven)\s+(days?|weeks?)\b/);
  if (m) return ymd(addDays(base, NUM_WORDS[m[1]] * (/week/.test(m[2]) ? 7 : 1)));

  // weekday, optionally "next". Bare weekday = the coming one (today if it IS that weekday);
  // "next <weekday>" pushes a full week only when that weekday is today.
  const wd = s.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (wd) {
    const target = WD.indexOf(wd[2]);
    let delta = (target - base.getDay() + 7) % 7;
    if (wd[1] && delta === 0) delta = 7;
    return ymd(addDays(base, delta));
  }

  // month + day: "october 30", "oct 30th"
  m = s.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m && monthIndex(m[1]) >= 0) return fromMonthDay(monthIndex(m[1]), parseInt(m[2], 10), base);
  // day + month: "30th of october", "30 oct"
  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\b/);
  if (m && monthIndex(m[2]) >= 0) return fromMonthDay(monthIndex(m[2]), parseInt(m[1], 10), base);
  // numeric US "10/30" or "10-30"
  m = s.match(/\b(\d{1,2})[/\-](\d{1,2})\b/);
  if (m) return fromMonthDay(parseInt(m[1], 10) - 1, parseInt(m[2], 10), base);

  return null;
}

/** Read an ISO date back in warm, kid-friendly words relative to `now`. */
export function humanizeDate(iso, now = new Date()) {
  if (!iso || typeof iso !== "string") return "";
  const [y, mo, da] = iso.split("-").map(Number);
  if (!y || !mo || !da) return "";
  const d = startOfDay(new Date(y, mo - 1, da));
  const base = startOfDay(now);
  const delta = Math.round((d - base) / 86400000);
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta === -1) return "yesterday";
  if (delta > 1 && delta < 7) return WD[d.getDay()].replace(/^./, (c) => c.toUpperCase());
  if (delta >= 7 && delta < 14) return `next ${WD[d.getDay()].replace(/^./, (c) => c.toUpperCase())}`;
  return `${MON_SHORT[mo - 1]} ${da}`;
}

/** YYYY-MM-DD for "today" per `now` — used to drop past items from the agenda. */
export const todayISO = (now = new Date()) => ymd(startOfDay(now));
