# Skill-packs

A **skill-pack** is a small JSON file that drops a new activity into Reed's engine. Add a file here and
it appears as a new skill chip for its target character(s) — **no code change.** This is the
extensibility primitive behind the "platform": Reed and Mira are two reference *instances* of the shared,
red-teamed engine, and packs are how it grows (a tutor today; a hobby tracker, a bedtime-stories pack, a
post-op rehab coach tomorrow — authored here or, on the roadmap, downloaded from a library).

## Safety is structural, not optional

A pack is **declarative content only**. The loader ([`src/packs.js`](../src/packs.js)) copies *exactly*
the whitelisted fields below and ignores everything else, so a pack **cannot** define behavior around the
guards. Every pack turn still runs the full loop — **guard-in → brain → guard-out** — so even a
user-authored pack inherits the red-teamed safety for free and can never become an escape hatch.

## Format

```json
{
  "id": "tutor-g4",                      // unique, kebab-case
  "label": "Homework Buddy · Grade 4",   // the chip the child sees
  "emoji": "✏️",                         // one emoji
  "grade": "4th grade",                  // optional, shown with the chip
  "subject": "reading & math",           // optional
  "characters": ["reed"],                // which character(s) this pack extends (default: ["reed"])
  "prompt": "…",                         // the activity's voice/method, injected while the pack is active
  "starter": "…",                        // the opening line when the child picks the pack
  "examples": [                          // optional, documentation only — never sent to a model
    { "child": "…", "reed": "…" }
  ]
}
```

Required: `id`, `label`, `emoji`, `prompt`, `starter`. A file may hold one pack object or an array of them.

## The packs here

| File | Pack | Level | Authored by |
|------|------|-------|-------------|
| `tutor-grade4.json` | Homework Buddy · Grade 4 | 4th grade (~age 9) | Nemotron-3-Ultra-550B, human-reviewed |
| `tutor-grade8.json` | Homework Buddy · Grade 8 | 8th grade (~age 13) | Nemotron-3-Ultra-550B, human-reviewed |

The two grade levels prove the pack adapts to the child: the Grade-4 pack breaks arithmetic into small
concrete steps with simple words; the Grade-8 pack uses Socratic questions and multi-step reasoning. Same
engine, same guards, different pack.
