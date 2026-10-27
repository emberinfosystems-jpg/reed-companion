# Reed — a gentle AI companion for kids in the hospital

Reed is a warm, local-first AI friend for children (roughly ages 6–12) who are spending time in a
hospital. Reed hangs out, makes up stories, plays guessing games, draws together, and remembers the
little things that make each child *them* — a favorite dinosaur, a dog named Biscuit — so it feels like
a friend who came back, not a chatbot starting over.

Reed is **not** a doctor, a nurse, or a therapist, and it never pretends to be. It gives no medical
advice. Its one serious job, underneath the play, is to be a steady, safe presence.

> Built for the **Nebius × NVIDIA Global AI Hackathon** (Personal AI track). Inspired by the children's
> hospitals that do this work every day; **not affiliated with, or endorsed by, any hospital or health
> system.**

---

## The job it's hired to do

> *When I'm a kid stuck in a hospital bed — bored, a little scared, maybe lonely — I want someone who's
> just **mine** to play and talk with, who remembers me and never gets tired of me, so I feel less alone
> and more like myself.*

Reed is designed for that moment, not for engagement metrics. It is non-extractive by design: no ads, no
data harvesting, no account required. A child's memory lives in a single local file that a parent can
read, download, or erase at any time.

---

## Safety is the architecture, not a filter on top

Every turn runs through a **tri-model loop** that maps 1:1 onto the NVIDIA Nemotron-3 tiers:

```
child message
   │
   ▼
GUARD-IN  (fast tier · Nemotron-3-Nano)   ── classifies: OK | BLOCK | CARE
   │
   ├─ CARE  → warm, present response; urge a grown-up who's THERE; log the moment for a parent
   ├─ BLOCK → gentle subject change (no brain call)
   │
   ▼ (OK)
BRAIN  (big tier · Nemotron-3-Super)       ── Reed's warm, memory-grounded reply
   │
   ▼
GUARD-OUT (fast tier · Nemotron-3-Nano)    ── screens Reed's OWN reply before the child sees it
   │
   ▼
child sees a safe, PG reply
```

**Three outcomes, PG standard:**
- **OK** — ordinary kid talk. Normal feelings (bored, lonely, sad, a tummy ache, scared of the dark) are
  always OK. Imaginative play (dinosaurs fighting, a knight beating a dragon) is OK — it's pretend.
- **BLOCK** — above-PG *content* (profanity, gore, sexual content, weapons how-to, drugs, hate, horror
  meant to frighten, sharing personal info). Reed warmly changes the subject.
- **CARE** — the *child* is in danger: self-harm, a person hurting/scaring them, or grooming. Reed stays
  warm and present and steers them to a trusted grown-up who is physically there. **Never a hotline** —
  it is the steady presence in the room.

**Defense in depth:**
- **Fail-closed.** If the guard ever returns something unparseable, the turn defaults to BLOCK — safe by
  default, never leaking.
- **Deterministic safety nets.** Two escalate-only regex nets force CARE on the clearest self-harm and
  interpersonal-harm disclosures *regardless of what the model thinks* — so the highest-stakes signals
  don't depend on a model's mood.
- **Red-teamed.** 19/19 red-team battery and 22/22 nuance/interpersonal battery on Nemotron. A
  **child-adversary fuzzer** (a small model role-playing a child) stress-tests the guard and is reusable
  across products.

See [`REED_SAFETY.md`](./REED_SAFETY.md) for the full design, test results, and an honest **limitations &
scope** disclosure (where software engineering ends and professional child-safety expertise begins).

---

## Data under your control

The **For grown-ups** page (behind a soft gate) shows a parent *everything* Reed remembers about their
child, plus a **"Moments to check in on"** log — any CARE moment, stored **verbatim** with a timestamp, so
a grown-up can gently follow up. A parent can **download a copy** or **erase everything** in one tap.
Nothing is ever uploaded. By deliberate design, Reed does **not** push active alerts to a guardian (an
abuse disclosure could reach the very person it's about) — that waits on review by qualified child-safety
professionals.

---

## Running it

**Requirements:** Node 18+. For local/offline dev, [Ollama](https://ollama.com). For the hackathon
configuration, a [Nebius Token Factory](https://nebius.com) API key.

```bash
# backend
cd server
npm install
cp .env.example .env     # then edit .env with your provider + key
node src/server.js        # http://localhost:4310

# frontend (separate terminal)
cd frontend
npm install
npm run dev               # http://localhost:5330
```

**Switching model providers is a `.env` change, no code edit** — both Ollama and Nebius speak the
OpenAI-compatible API:

| role  | dev (Ollama)   | submission (Nebius Nemotron-3)            |
|-------|----------------|------------------------------------------|
| BRAIN | `qwen2.5:7b`   | `nvidia/nemotron-3-super-120b-a12b`      |
| GUARD | `qwen2.5:7b`   | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`  |
| VISION| —              | `nvidia/Nemotron-3.5-Super-VL`           |

### Reed can see your drawing (tool-calling)

When a child draws something and shows it, **Nemotron Super calls its vision sibling as a tool**
(`look_at_drawing`) to *actually see* the picture, then responds to what's really there — "I love the
sunny yellow burst above the green grass-line!" — instead of asking the child to describe it. One Nemotron
model orchestrating another, with Super deciding when to look. The only image in play is the child's own
canvas drawing, and Reed's reply still passes guard-out.

Quick safety check:

```bash
cd server
node src/redteam.js      # the 19-case red-team battery
node src/repro.js         # nuance + interpersonal battery
node src/childsim.mjs     # the child-adversary fuzzer
```

---

## Where Reed runs — local-first, and it scales with the silicon

Reed is **local-first by architecture, not by slogan.** Every provider detail is an env var
([`models.js`](server/src/models.js) line 2: *"Works unchanged against Ollama (dev) or Nebius Token
Factory (submission)"*), and both ends speak the OpenAI-compatible API — so the *same* Reed runs in
three places with **zero code changes**, just a different `.env`:

| Tier | Where | What it means |
|------|-------|---------------|
| ☁️ **Cloud fallback** | Nebius / free host | Runs on any device. The ~20s/turn you see on the free tier is the **worst case** — Reed on a potato, for free, so it works anywhere. |
| 🖥️ **Local NVIDIA** | A GPU in the home or hospital | **Fully offline. Private by physics** — a child's words and drawings never leave the device (no cloud, no egress). A local install skips the cold-start and the shared-tier queue entirely. Config: [`server/.env.local.nvidia.example`](server/.env.local.nvidia.example). |
| 🚀 **Scales with the GPU** | Bigger NVIDIA card → bigger tier | Because the models are NVIDIA **open-weight** Nemotron-3, a machine with more VRAM can serve a larger tier (Nano → Super) — capability scales with the hardware *by design*, same code and same safety loop. |

The ~20s/turn above is the behavior of a free, shared cloud host — **not an inherent limit of the system.**
Reed runs local-first and offline in development; we have not benchmarked a dedicated GPU, so "scales with
the silicon" is a property of open-weight serving we document, not a measured figure we're claiming. And
because local-first inference has **no per-child cloud cost**, Reed can be free without ads or
data-harvesting — the non-extractive stance is a property of the architecture, not a promise. This is why
Reed isn't bound to one setting: the same safe, private companion can run in a hospital room, a living
room, or offline in a cabin.

> **Roadmap — honestly a roadmap, not shipped:** the swappable character/skill engine in this repo
> (see `characters.js`) is built to load **skill-packs** — e.g. an age-adaptive K-12 study pack to make
> Reed a tutor, not just a playmate. Downloadable packs from *AI University* are planned as a free
> download at emberinformation.com; what exists **today** is the platform that makes them possible, with
> **Reed** and **Mira** as two reference instances.

---

## Project layout

```
server/            Node + Express API (port 4310)
  src/orchestrator.js   the tri-model safety loop + deterministic nets
  src/persona.js        Reed's persona + the guard prompts + skills
  src/memory.js         per-child local memory ("mempalace") + parent controls
  src/models.js         OpenAI-compatible adapter (Ollama / Nebius)
  src/redteam.js        safety batteries
  src/childsim.mjs      reusable child-adversary fuzzer
frontend/          React + Vite kid UI (port 5330)
REED_SAFETY.md     safety design, test results, limitations
REED_CONCEPT.md    the why, and the fuller vision
```

---

## License

[Apache License 2.0](./LICENSE) © 2026 Ember Information Systems LLC.
