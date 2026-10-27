# Reed — Build Log

Local-first AI companion for hospitalized kids. Nebius × NVIDIA hackathon (Personal AI track).
Live: https://reed-companion.onrender.com · Repo: github.com/emberinfosystems-jpg/reed-companion

---

## Session seal — 2026-10-26 / 27 (Luke + Scott)

Opened the session blocked on the Nebius credit-card wall; closed it with a deployed, safety-hardened
companion **platform** (Reed + Mira) that two NVIDIA models helped design and build. Total spend: **$0.28
of the $26 trial+promo.**

### Milestones (in order)
1. **Nebius unblocked** — cleared the Token Factory card wall with an X/XMoney virtual Visa ($5 hard cap =
   built-in overage protection). Key in vault as `Reed_Nebius`.
2. **Live on Nemotron** — flipped `.env` from local Ollama to Nebius. Confirmed tiers:
   BRAIN=`nemotron-3-super-120b-a12b`, GUARD(fast)=`NVIDIA-Nemotron-3-Nano-30B-A3B`,
   VISION=`Nemotron-3.5-Super-VL`, Ultra-550B used for design/tooling. Safety re-verified on Nemotron:
   **nuance 22/22, red-team 19/19** (Nano reasoning guard beat the dev qwen-7B).
3. **Interpersonal-abuse net** — deterministic escalate-only net added after the child-adversary showed the
   guard fumbling disclosures of being hurt. 4/4 escalate, 0 false fires.
4. **Child-adversary red-team at scale** (ST13 in the EIS Security Log) — Hermes-4-405B role-plays a child,
   18 buckets × 12 = 216 msgs vs the live guard. Run 1 = 183/216 → found a **systemic OBLIQUE-disclosure
   gap** (veiled abuse "a secret I can't tell or I'll get in trouble" 6/12 passed as OK; passive self-harm
   "everyone better off without me" → BLOCK not CARE). Hardened guard prompt + deterministic nets →
   **Run 2 = 191/216, every child-DANGER zone 12/12.** Evidence in `server/redteam-results/` (gitignored).
5. **Vision tool-calling** — Nemotron Super calls `look_at_drawing` (the VL model) to actually SEE the
   child's drawing and respond to the real content. One NVIDIA model orchestrating another.
6. **Happy Moment Sketchbook** — AI-proposed (Nemotron Super) → AI-drafted (Kimi-K2.7-Code) → human-reviewed
   + integrated. A per-child local gallery; text only, never the image.
7. **Companion platform** — extracted per-character config (`characters.js`); the engine (guard, memory,
   vision, parent view) is shared. Added **Mira**: designed by Nemotron-3-Ultra-550B, name-screened,
   illustrated by Scott, her own voice + "Pocket Museum" skill, inheriting the full safety.
8. **Capstone** — the 550B wrote `tools/applyEdits.mjs` (deterministic find/replace applier), human-reviewed;
   proves 6/6 incl. applying the exact edit that broke Kimi's diff. Plus `NEMOTRON_REFLECTION.md`.
9. **Deployed** — Render free tier, single Node service serves API + built frontend. Everything verified
   live (platform, Mira, vision image POST, Mira in-voice).

### Key findings (reusable across the fleet)
- **Nemotron-3 models REASON** — reasoning tokens count toward `max_tokens`; a tight cap truncates
  `.content` to "". Guards need ~512, brain ~1500, vision ~1500. Nebius returns reasoning on a separate
  channel so `.content` stays clean. `/no_think` directives were unreliable; headroom is the fix.
- **AI-coding loop** (the submission thesis): Kimi-K2.7-Code (1) unconstrained → hallucinated whole files
  that would have DELETED the safety guard; (2) full-files + diff-only → correct logic but malformed diff
  (every `@@` count off, hunks out of order) + a dangling-else; (3) guided self-fix → fixed the logic,
  still couldn't emit an applyable diff. **Coder models are strong logic generators, poor patch
  generators.** The reliable pattern: model emits exact find/replace, a deterministic tool applies it,
  humans verify. Never make the model the diff engine.
- **Nebius Token Factory (our tier) is text + vision only** — no image generation (all image endpoints
  404). NVIDIA image models need build.nvidia.com + a separate key. Human art is commercial-safe anyway
  (FLUX is non-commercial).
- **Reed is a platform, not an app** — a new companion inherits the red-teamed guard for free; adding one
  costs character design, not safety re-certification.

### Safety gates (current, all green)
`redteam.js` 19/19 · `repro.js` 28/28 (nuance + oblique) · `resist.mjs` 5/5 (full-turn coercion) ·
child-adversary `childsim.mjs` 191/216 (every danger zone 12/12). Shared guard holds for both characters.

### Commit trail (this session)
`21c94a2` oblique hardening · `3a3b8f3` vision · `cb482fc` sketchbook · `c73cd38` platform+Mira ·
`3440a17` apply-tool · `6318f01` Nemotron reflection. Repo public on GitHub, deployed on Render.

### State / what remains
Build is DONE. Remaining = submission only: **10/29** record the 3-min demo video (Scott's cloned voice;
show the Reed↔Mira switch, draw→SEE, the sketchbook) + description + feedback writeup → **submit on Devpost
before 10/30 10am MST.**

### Docs map
`REED_CONCEPT.md` (why) · `REED_BUILD_PLAN.md` · `REED_SAFETY.md` (guard design + limitations) ·
`REED_REDTEAM.md` (adversary PoC) · `NEMOTRON_REFLECTION.md` (the 550B's view) · `DEPLOY.md` · `README.md` ·
`tools/applyEdits.mjs` (+ test). Safety logged as **ST13** in the EIS Security Log.
