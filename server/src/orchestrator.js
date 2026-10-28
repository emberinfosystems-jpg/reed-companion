// The tri-model loop: GUARD-IN (fast) -> BRAIN (big) -> GUARD-OUT (fast). Memory-grounded.
import { chat, chatFull, see } from "./models.js";
import { GUARD_IN_SYSTEM, GUARD_OUT_SYSTEM, EXTRACT_SYSTEM, ORGANIZER_EXTRACT_SYSTEM, REED_SAFE_REDIRECT, REED_CARE_RESPONSE, SKILLS } from "./persona.js";
import { charFor } from "./characters.js";
import { load, save, recall, pushTurn, recentAsMessages, mergeFacts, flagCare, addMoment, momentsText,
  addChore, completeChore, choresText, addHobby, hobbiesText, addAgenda, agendaText } from "./memory.js";
import { parseWhen } from "./dates.js";

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

// Capture structured organizer items from the child's turn — ONLY while a Mira organizer skill is active.
// Runs in PARALLEL with the brain (no added latency) and is best-effort (never blocks a turn). Crucially,
// the model supplies only the child's RAW time words; parseWhen() turns them into a real date here, so a
// child's reminder is never a model's date guess.
async function captureOrganizer(mem, text, kind) {
  try {
    const out = await chat("fast", [
      { role: "system", content: ORGANIZER_EXTRACT_SYSTEM },
      { role: "user", content: text },
    ], { temperature: 0, maxTokens: 512 });
    const o = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    if (kind === "chores") {
      for (const c of o.chores_add || []) addChore(mem, typeof c === "string" ? c : c?.text);
      for (const c of o.chores_done || []) completeChore(mem, typeof c === "string" ? c : c?.text);
    } else if (kind === "hobbies") {
      for (const h of o.hobbies_add || []) addHobby(mem, typeof h === "string" ? h : h?.text);
    } else if (kind === "calendar") {
      for (const a of o.agenda_add || []) {
        const t = typeof a === "string" ? a : a?.text;
        if (t) addAgenda(mem, t, parseWhen(typeof a === "object" ? a?.when : ""));
      }
    }
  } catch { /* best-effort; never block a turn on capture */ }
}

// Deterministic self-harm net: clear phrasing ALWAYS escalates to CARE, regardless of model/context.
// Escalate-only (can never downgrade), and tight enough to skip benign "the needle hurt me".
const CARE_PATTERN = new RegExp([
  /\b(hurt|harm|cut|kill|hurting|cutting|killing)\s+myself\b/.source,
  /\b(want\s+to|wanna|gonna|going\s+to)\s+die\b/.source,
  /\bdon'?t\s+want\s+to\s+(live|be\s+here|be\s+alive|exist)\b/.source,
  /\bend\s+(my\s+life|it\s+all)\b/.source,
  /\bno\s+reason\s+to\s+(live|be\s+here)\b/.source,
  /\bkill\s+me\b/.source,
  // oblique self-harm (added 2026-10-27 after the Hermes child-adversary surfaced these)
  /\bbetter\s+(off\s+)?with\s?out\s+me\b/.source,
  /\bif\s+i\s+(wasn'?t|wasnt|weren'?t|wuzn'?t|wuznt)\s+(here|hear|around|alive)\b/.source,
  /\bdon'?t\s+want\s+to\s+wake\s+up\s+(any\s?more|ever|again|at\s+all)\b/.source,
  /\bwish\s+i\s+(wasn'?t\s+(here|alive)|wasnt\s+(here|alive)|could\s+disappear|didn'?t\s+exist|was\s+gone)\b/.source,
  /\b(nobody|no\s?one)\s+would\s+miss\s+me\b/.source,
  /\bwant\s+to\s+disappear\b/.source,
].join("|"), "i");

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
  // oblique disclosure (added 2026-10-27 after the child-adversary): a secret that can't be told for fear
  // of trouble, or "promised not to tell" — classic abuse/grooming markers, not a guessing-game "secret".
  /\bpromised?\s+not\s+to\s+tell\b/.source,
  /\bcan'?t\s+tell\b[^.!?\n]{0,45}\bget\s+in\s+(big\s+)?trouble\b/.source,
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

// Reed's "sight" tool. Nemotron Super can CALL this to actually see the child's drawing — it runs the
// VL model (see()). Super stays the brain and orchestrates; the Nemotron VL sibling is the tool. This is
// the tool-calling showcase: one NVIDIA model driving another, with Super deciding when to look.
const LOOK_TOOL = { type: "function", function: {
  name: "look_at_drawing",
  description: "Look at the picture the child just drew and shared, to see what is actually in it before you respond. Call this whenever the child shows or talks about their drawing.",
  parameters: { type: "object", properties: {}, required: [] },
} };

async function lookAtDrawing(imageDataUrl) {
  try {
    const desc = await see(imageDataUrl,
      "A child drew this on a simple drawing app and is excited to show a friend. In ONE or TWO short, warm " +
      "sentences, describe what you ACTUALLY see — the shapes, colors, and objects. Name the real things that " +
      "are there. If it is mostly scribbles or hard to tell, say so kindly and make a playful guess. Do not " +
      "mention that it is a drawing app or that you are an AI.",
      { maxTokens: 1500 });   // VL reasons; needs headroom or .content comes back empty
    return desc && desc.trim() ? desc : "a colorful drawing they're proud of";
  } catch { return "a colorful drawing they're proud of"; }
}

async function brain(mem, text, image = null, char = charFor("reed")) {
  const messages = [
    { role: "system", content: char.system },
    { role: "system", content: `What you remember about this child: ${recall(mem)}` },
  ];
  const skill = mem.activeSkill && SKILLS[mem.activeSkill];
  if (skill) messages.push({ role: "system", content: `You are currently playing a game with the child: ${skill.prompt}` });
  messages.push(...recentAsMessages(mem), { role: "user", content: text });

  // Generous cap: the Nemotron brain tier REASONS before replying, and reasoning tokens count toward the
  // budget. Too low and the reply truncates to "" (an empty bubble). 1500 leaves room; harmless for dev.
  if (!image) return chat("big", messages, { temperature: 0.8, maxTokens: 1500 });

  // The child shared a drawing: give Super the look tool and let it orchestrate the VL model.
  const first = await chatFull("big", messages, { temperature: 0.8, maxTokens: 1500, tools: [LOOK_TOOL] });
  const call = first.tool_calls?.find(c => c.function?.name === "look_at_drawing");
  const desc = await lookAtDrawing(image);   // run the tool (one VL call either way)
  if (mem.activeSkill === "moments" || mem.activeSkill === "museum") addMoment(mem, desc);   // keep it in the sketchbook / pocket museum
  if (call) {
    messages.push(first);                                             // Super's tool-call message, as returned
    messages.push({ role: "tool", tool_call_id: call.id, content: desc });
  } else {
    // Super didn't emit a tool call (reasoning models can be inconsistent) — hand it the sight anyway.
    messages.push({ role: "system", content: `(You looked at the child's drawing. It shows: ${desc}) Respond warmly about what you can see.` });
  }
  return chat("big", messages, { temperature: 0.8, maxTokens: 1500 });
}

// Warm, on-brand filler if a model ever returns empty (e.g. a reasoning overrun) — never a blank bubble.
const REED_FILLER = "I'm right here with you. 😊 Tell me more?";

// Child wants out of a game ("done", "stop", "something else").
const EXIT_RE = /\b(all done|i'?m done|stop playing|quit|something else|different game|no more)\b/i;
// A child asking to revisit their saved happy moments -> replay from the sketchbook.
const SHOW_MOMENTS_RE = /\bmy (happy moments?|pocket museum|museum|collection)\b|\b(show|see|read|remember|tell me about)\b[^]*\b(happy moments?|sketchbook|pocket museum|my museum|collection)\b/i;
// A child asking the organizer to read something back -> replay deterministically from memory (not the brain).
const SHOW_CHORES_RE = /\b(my|see my|show my|what are my)\s+(jobs|chores|to-?dos?|tasks)\b|\bmy little jobs\b/i;
const SHOW_HOBBIES_RE = /\b(things i love|things i like to do|my hobbies|stuff i like)\b/i;
const SHOW_AGENDA_RE = /\bwhat'?s\s+coming up\b|\bmy (calendar|schedule|agenda|plans)\b|\bwhat do i have (coming up|today|this week|tomorrow)\b|\bwhat'?s (on|happening) (today|this week)\b/i;

/** Guard-only path (for red-team / fast safety checks) — runs GUARD-IN, no brain. */
export async function screenOnly(text, recent = []) { return guardIn(text, recent); }

/** reedTurn(childId, text, image?) -> { reply, trace }. image = a data URL of the child's drawing. */
export async function reedTurn(childId, text, image = null, characterId = "reed") {
  const mem = load(childId);
  const char = charFor(characterId);             // which companion is speaking (shared engine + guard)
  const hasOrganizer = (char.skillIds || []).some((s) => ["chores", "hobbies", "calendar"].includes(s));
  const gin = await guardIn(text, mem.recent);   // judge the message in the context of the conversation
  pushTurn(mem, "kid", text);

  let reply;
  if (gin.decision === "CARE") {
    reply = REED_CARE_RESPONSE;                 // self-harm/abuse: warm, present, urge a grown-up who's there
    flagCare(mem, text);                        // log the moment (verbatim) for a grown-up to review in the parent page
  } else if (gin.decision === "BLOCK") {
    reply = REED_SAFE_REDIRECT;                 // above-PG content: gentle subject change, no brain call
  } else if (SHOW_MOMENTS_RE.test(text)) {
    // Replay the child's saved moments (still screened by guard-out). Collection name is per-character.
    reply = await guardOut(momentsText(mem, char.collection) || `We haven't kept anything in your ${char.collection} yet! Want to add one? 🌟`);
  } else if (hasOrganizer && SHOW_CHORES_RE.test(text)) {
    reply = await guardOut(choresText(mem) || "We haven't added any little jobs yet — want to tell me one? ✅");
  } else if (hasOrganizer && SHOW_HOBBIES_RE.test(text)) {
    reply = await guardOut(hobbiesText(mem) || "Let's start your list of things you love — what's one? 🎏");
  } else if (hasOrganizer && SHOW_AGENDA_RE.test(text)) {
    reply = await guardOut(agendaText(mem) || "Nothing on your calendar yet — is there something nice coming up? 📅");
  } else {
    if (mem.activeSkill && EXIT_RE.test(text)) mem.activeSkill = null;  // let the child leave a game
    const active = mem.activeSkill && SKILLS[mem.activeSkill];
    const organizerKind = active && active.organizer;                  // capture only inside an organizer skill
    // Extract durable facts (and, in an organizer skill, capture the item) in PARALLEL with the brain: the
    // reply answers THIS turn's text, and recall() only needs PRIOR facts, so neither ever blocks the reply.
    const tasks = [extractFacts(mem, text), brain(mem, text, image, char)];
    if (organizerKind) tasks.push(captureOrganizer(mem, text, organizerKind));
    const results = await Promise.all(tasks);
    reply = await guardOut(results[1]);         // screen the companion's OWN output against PG
  }
  if (!reply || !reply.trim()) reply = REED_FILLER;   // never show the child an empty bubble

  pushTurn(mem, "reed", reply);
  save(mem);
  return { reply, trace: { guardIn: gin.raw, decision: gin.decision, intent: gin.intent, skill: mem.activeSkill || null } };
}

/** Start a game skill: sets it active and returns Reed's opening line. */
export async function startSkill(childId, skillId, characterId = "reed") {
  const skill = SKILLS[skillId];
  if (!skill) throw new Error("unknown skill");
  const mem = load(childId);
  const char = charFor(characterId);
  mem.activeSkill = skillId;
  const messages = [
    { role: "system", content: char.system },
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
