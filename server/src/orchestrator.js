// The tri-model loop: GUARD-IN (fast) -> BRAIN (big) -> GUARD-OUT (fast). Memory-grounded.
import { chat } from "./models.js";
import { REED_SYSTEM, GUARD_IN_SYSTEM, GUARD_OUT_SYSTEM, EXTRACT_SYSTEM, REED_SAFE_REDIRECT, REED_CARE_RESPONSE, SKILLS } from "./persona.js";
import { load, save, recall, pushTurn, recentAsMessages, mergeFacts, flagCare } from "./memory.js";

// Pull durable facts from the child's message (fast model) and merge into the profile.
async function extractFacts(mem, text) {
  try {
    const out = await chat("fast", [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: text },
    ], { temperature: 0, maxTokens: 512 });   // reasoning headroom; JSON is sliced out below
    const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
    mergeFacts(mem, JSON.parse(json));
  } catch { /* extraction is best-effort; never block a turn on it */ }
}

// Deterministic self-harm net: clear phrasing ALWAYS escalates to CARE, regardless of model/context.
// Escalate-only (can never downgrade), and tight enough to skip benign "the needle hurt me".
const CARE_PATTERN = /\b(hurt|harm|cut|kill|hurting|cutting|killing)\s+myself\b|\b(want\s+to|wanna|gonna|going\s+to)\s+die\b|\bdon'?t\s+want\s+to\s+(live|be\s+here|be\s+alive|exist)\b|\bend\s+(my\s+life|it\s+all)\b|\bno\s+reason\s+to\s+(live|be\s+here)\b|\bkill\s+me\b/i;

// Deterministic INTERPERSONAL-SAFETY net: a child disclosing that a PERSON is physically hurting or
// touching them, or a grooming move ("don't tell your mom/dad"), ALWAYS escalates to CARE regardless
// of the model's read. Escalate-only (like the self-harm net) — it can raise to CARE, never lower.
// Deliberately TIGHT: physical-harm disclosures + parent-secret grooming only. It names human subjects
// (he/she/relations/"a man") so benign patient pain ("my needle hurt me", "my tummy hurts") does NOT
// fire, and leaves sibling squabbles ("won't leave me alone"), meet-ups, and ambiguous cases to the
// model + CARE tiebreaker. Verbs use \w* for kid-typo tolerance ("touchin", "hurted"). This exists
// because the child-adversary fuzzer showed the 7B guard fumbles exactly this zone (0/3, 1/3).
const ABUSE_PATTERN = new RegExp([
  // "stop/don't touching me", "quit hitting me", "please stop hurting me"
  /\b(stop|don'?t|quit|please\s+stop)\s+(touch\w*|hit\w*|hurt\w*|grab\w*|kiss\w*|punch\w*|slap\w*)\s+me\b/.source,
  // a PERSON hits/hurts/touches me ("he hits me", "my uncle touched me", "a man hurt me")
  /\b(he|she|they|mom+y?|dad+y?|my\s+(brother|sister|mom+y?|dad+y?|uncle|aunt|cousin|grandpa|grandma|grampa|gramma|step\w*|babysitter|teacher|friend)|uncle|aunt|cousin|someone|somebody|a\s+man|a\s+lady|a\s+guy|a\s+grown[-\s]?up)\s+(hit\w*|hurt\w*|touch\w*|grab\w*|kiss\w*|punch\w*|slap\w*)\s+me\b/.source,
  // touched private parts
  /\btouch\w*\s+my\s+(privates?|private\s+parts?|butt|bum|pee\s*pee)\b/.source,
  // grooming: told to keep it from parents (never part of a guessing game — "secret" alone is not enough)
  /\bdon'?t\s+tell\s+(?:your|my)?\s*(mom+y?|dad+y?|parents?|anyone|nobody|grown)\w*\b/.source,
].join("|"), "i");

async function guardIn(text, recent = []) {
  // Context lets the guard judge short follow-ups ("what's the difference?") instead of fail-closing on them.
  const ctx = recent.slice(-2).map(t => `${t.who === "kid" ? "Child" : "Reed"}: ${t.text}`).join("\n");
  const userMsg = ctx
    ? `Conversation so far:\n${ctx}\n\nNow classify ONLY the child's newest message: "${text}"`
    : text;
  try {
    // maxTokens is generous because the Nemotron guard tier is a REASONING model: it spends
    // tokens thinking before it emits the label. Nebius returns that reasoning on a separate
    // channel, so .content still arrives clean ("OK | chat") — but a tight ceiling truncates it
    // to "" and trips fail-closed. 512 gives it room; harmless for non-reasoning dev models.
    const out = await chat("fast", [
      { role: "system", content: GUARD_IN_SYSTEM },
      { role: "user", content: userMsg },
    ], { temperature: 0, maxTokens: 512 });
    // FAIL-CLOSED: only a clear "OK | ..." is allowed through. CARE wins; anything else (a refusal,
    // garbled output, or no clear OK) is treated as BLOCK — when in doubt, protect the child.
    let decision;
    if (/^\s*CARE\b/i.test(out)) decision = "CARE";
    else if (/^\s*OK\s*\|/i.test(out)) decision = "OK";
    else decision = "BLOCK";
    if (CARE_PATTERN.test(text) || ABUSE_PATTERN.test(text)) decision = "CARE";   // deterministic self-harm + abuse override (escalate-only)
    const intent = (out.match(/OK\s*\|\s*(\w+)/i)?.[1] || "chat").toLowerCase();
    return { decision, intent, raw: out };
  } catch {
    return { decision: (CARE_PATTERN.test(text) || ABUSE_PATTERN.test(text)) ? "CARE" : "BLOCK", intent: "chat", raw: "guard-in error -> fail-closed" };
  }
}

async function guardOut(reply) {
  try {
    const out = await chat("fast", [
      { role: "system", content: GUARD_OUT_SYSTEM },
      { role: "user", content: reply },
    ], { temperature: 0, maxTokens: 512 });   // reasoning headroom + room for a FIX rewrite
    if (/^\s*FIX\b/i.test(out)) return out.replace(/^\s*FIX\s*\|\s*/i, "").trim() || reply;
    return reply;
  } catch { return reply; }
}

async function brain(mem, text) {
  const messages = [
    { role: "system", content: REED_SYSTEM },
    { role: "system", content: `What you remember about this child: ${recall(mem)}` },
  ];
  const skill = mem.activeSkill && SKILLS[mem.activeSkill];
  if (skill) messages.push({ role: "system", content: `You are currently playing a game with the child: ${skill.prompt}` });
  messages.push(...recentAsMessages(mem), { role: "user", content: text });
  // Generous cap: the Nemotron brain tier REASONS before replying, and reasoning tokens count
  // toward the budget. Too low and the actual reply truncates to "" (an empty bubble). 1500 leaves
  // room for the think pass plus a full warm reply; harmless for non-reasoning dev models.
  return chat("big", messages, { temperature: 0.8, maxTokens: 1500 });
}

// Warm, on-brand filler if a model ever returns empty (e.g. a reasoning overrun) — never a blank bubble.
const REED_FILLER = "I'm right here with you. 😊 Tell me more?";

// Child wants out of a game ("done", "stop", "something else").
const EXIT_RE = /\b(all done|i'?m done|stop playing|quit|something else|different game|no more)\b/i;

/** Guard-only path (for red-team / fast safety checks) — runs GUARD-IN, no brain. */
export async function screenOnly(text, recent = []) { return guardIn(text, recent); }

/** reedTurn(childId, text) -> { reply, trace } */
export async function reedTurn(childId, text) {
  const mem = load(childId);
  const gin = await guardIn(text, mem.recent);   // judge the message in the context of the conversation
  pushTurn(mem, "kid", text);

  let reply;
  if (gin.decision === "CARE") {
    reply = REED_CARE_RESPONSE;                 // self-harm/abuse: warm, present, urge a grown-up who's there
    flagCare(mem, text);                        // log the moment (verbatim) for a grown-up to review in the parent page
  } else if (gin.decision === "BLOCK") {
    reply = REED_SAFE_REDIRECT;                 // above-PG content: gentle subject change, no brain call
  } else {
    if (mem.activeSkill && EXIT_RE.test(text)) mem.activeSkill = null;  // let the child leave a game
    // Extract durable facts in PARALLEL with the brain: the reply answers THIS turn's text, and
    // recall() only needs PRIOR facts, so extraction (which saves for next turn) never blocks it.
    const [, draft] = await Promise.all([extractFacts(mem, text), brain(mem, text)]);
    reply = await guardOut(draft);              // screen Reed's OWN output against PG
  }
  if (!reply || !reply.trim()) reply = REED_FILLER;   // never show the child an empty bubble

  pushTurn(mem, "reed", reply);
  save(mem);
  return { reply, trace: { guardIn: gin.raw, decision: gin.decision, intent: gin.intent, skill: mem.activeSkill || null } };
}

/** Start a game skill: sets it active and returns Reed's opening line. */
export async function startSkill(childId, skillId) {
  const skill = SKILLS[skillId];
  if (!skill) throw new Error("unknown skill");
  const mem = load(childId);
  mem.activeSkill = skillId;
  const messages = [
    { role: "system", content: REED_SYSTEM },
    { role: "system", content: `What you remember about this child: ${recall(mem)}` },
    { role: "system", content: skill.prompt },
    { role: "user", content: `[The child chose to play: ${skill.label}] ${skill.starter}` },
  ];
  const draft = await chat("big", messages, { temperature: 0.85, maxTokens: 1200 });
  let reply = await guardOut(draft);
  if (!reply || !reply.trim()) reply = REED_FILLER;
  pushTurn(mem, "reed", reply);
  save(mem);
  return { reply, skill: skillId };
}
