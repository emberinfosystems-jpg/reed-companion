# Reed — Build Plan (Nebius x NVIDIA hackathon)  ·  working doc

**Deadline 2026-10-30 10:00am MST.** Companion to `REED_CONCEPT.md` (the why). This is the how.

## Architecture — tri-model orchestration
```
kid input ──▶ [1] GUARD-IN (fast / Nemotron Nano)  safety + intent, deny-by-default
          ──▶ [2] BRAIN    (big / Nemotron Ultra|Super)  warm reply, memory-grounded
          ──▶ [3] GUARD-OUT(fast / Nemotron Nano)  screen Reed's OWN output, age-safe
          ──▶ reply + mempalace update
```
Maps 1:1 to Nebius's Nemotron tiers. Guard-in + guard-out = Sentinel-Jr lineage as a headline feature.

## Model adapter — OpenAI-compatible, provider-swappable
Both Ollama and Nebius Token Factory speak the OpenAI API. One client, switched by `.env`:
- **dev:** Ollama (`http://localhost:11434/v1`) — BIG=`qwen2.5:7b`, FAST=`llama3.2:3b` (fit RAM).
- **submission:** Nebius Token Factory — BIG=Nemotron Ultra/Super, FAST=Nemotron Nano.
Flip `MODEL_PROVIDER` + model ids; no code change. (Also keeps Reed runnable local = independence rail.)

## mempalace — persistent, owner-controlled memory
Per-kid JSON: `{ name, likes[], dislikes[], pets[], interests[], threads[], recent[] }`.
- BRAIN gets a compact "what you remember about <kid>" + recent turns.
- Parent view: see all + erase. Local-first, NEVER uploaded/harvested. ("Data under your control.")

## Scope (minimum lovable) — IN vs OUT
IN: talk (memory-aware) · 2 games (story-builder + guessing) · draw-together canvas (Reed reacts) ·
tri-model safety · Reed character/persona · parent view · deploy + repo + 3-min video.
OUT (full-vision, parked): video/music gen · in-hospital social network · SOAP-note-to-doctor (PHI/HIPAA).

## Stack
Frontend React+Vite (mobile-friendly, calm/large UI). Backend Node/Express (holds Nebius key, runs
orchestration). Memory = local JSON. Deploy = a hosted demo URL for judges.

## Guardrails (sensitive app)
NEVER harvest a child's data · not medical advice (on-screen) · no Shriner's affiliation claim ·
name-SCREEN "Reed" before public · tri-model safety is deny-by-default.

## Timeline — revised around the Nebius credit window
🛑 Nebius credits require an APPLICATION (~2 business days) → credits expected **Oct 27-28**. So:
FRONT-LOAD everything against local Ollama; the adapter makes Nebius a config swap. "Drop into Nebius
running" = flip `.env` + test + deploy when credits land.
- **10/24** ✅ scaffold + tri-model brain written (vs Ollama). Scott applies for Nebius credits.
- **10/25-26** build 100% on Ollama: prove the CLI loop · mempalace + parent view · 2 games · draw
  canvas + Reed reacts · the React UI + Reed art · red-team the safety layer · repo + README + Apache-2.0
  · deploy pipeline staged · video script.
- **10/27-28 (credits land):** flip `.env` → Nebius Nemotron → test on real models → confirm RUNS ON
  NEBIUS → deploy the live demo URL.
- **10/29** record 3-min demo (Scott's cloned voice) · project description · feedback writeup · final polish.
- **10/30** submit < 10:00am MST.

## Progress
- **10/24** ✅ scaffold + tri-model brain written.
- **10/25** ✅ backend complete & proven (CLI dogfood) · durable memory (facts persist across sessions)
  · HTTP API + parent endpoints · React kid UI live & tested in-browser · **safety hardened: red-team
  16/16, fail-closed, `REED_SAFETY.md`** · **games as reusable skills (story + guess) working in-browser,
  memory-personalized** (Reed picked a dinosaur for a dino-loving kid, unprompted). Nebius credit app submitted.
- **NEXT:** draw-together canvas · parent-view screen (API done) · "not medical advice" footer · repo +
  README + Apache-2.0 + deploy staging. Then (credits ~10/27-28) Nebius swap; (10/29) video + writeups.

## Needs from Scott (human/auth only)
1. Nebius Token Factory account + API key + credits; confirm Nemotron model ids.
2. Mikey↔Reed answer (building Reed-as-sole-companion until told otherwise).
3. Repo account = emberinfosystems-jpg (same as GrantHarbor) unless Scott says otherwise.
