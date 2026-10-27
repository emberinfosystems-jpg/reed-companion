# Reed — AI Patient Companion (concept capture)

**[2026-10-23] Captured from Scott's riff (woozy, don't lose it). CONCEPT ONLY — go/no-go pending Scott clear-headed.**

## What Reed is
An AI **patient companion for kids in the hospital** — someone who hangs out, **plays games,
draws with you, and talks** with you. Built for children who **can't always have a friend with
them right now** (isolated, immobilized, long stays, odd hours). Reed makes a kid feel like a kid,
not a patient.

**Inspiration / target audience:** children at **Shriner's Children's Hospital** (the use case that
sparked Reed). 🛑 Shriner's is a REAL, trademarked organization — Reed is *inspired by / built for that
kind of setting*; we do NOT claim any Shriner's partnership, endorsement, or affiliation unless a real
agreement exists. Keep all public materials affiliation-free.

## The job (JTBD)
> When I'm stuck in a hospital bed and my friends and family can't be here, I want someone to play,
> draw, and talk with, so I feel less alone and more like a kid than a patient.

Specific audience + real problem = the hackathon's "Potential Impact" criterion, dead center.

## Why a FRESH build, not a Holly clone (Scott's insight)
Reed reuses Holly's PROVEN patterns but is its own thing — different identity, lighter structure.
This scores better (quality-of-idea, "built in-window", complete product) AND keeps the real Holly +
the Kingdom out of any public repo.
- **Memory = the Memory Palace (`mempalace`), NOT the Kingdom/VDR.** Portable, demonstrable persistent
  memory ("Reed remembers your dog's name, the game you were playing yesterday"). 🛑 data **under the
  parent's/guardian's control** — the track's "data under your control" requirement, done right for a child.
- **Tri-model orchestration, NOT the 13-guardian council.** Maps 1:1 onto Nebius's own Nemotron tiers:
  **Ultra = serious reasoning, Super/Nano = fast everyday calls, one pass = the kid-safety filter.**
  Showcases the sponsor stack exactly how they ask → scores "Technological Implementation."
- **Kid-safety layer** — lineage of Holly's **Sentinel-Jr** (child-safety guardian). The safety
  orchestration is a feature, not an afterthought (responsible-AI angle judges reward).
- **Custom character art** (NOT cartoon stock) — Reed gets a real, warm visual identity.
- 🛑 **Scope = "concept foundation version", NOT the full generation we discussed.** Minimum LOVABLE
  Reed: palace + tri-model + safety layer + one real custom-art character + the core play/draw/talk loop.
  Build the foundation, not the dream. (Scott's own scoping discipline — the thing that makes 7 days work.)

## Hackathon fit — Nebius x NVIDIA Global AI Hackathon
- **Track:** Personal AI ("always-on, private assistant, data under your control, persistent memory,
  reusable skills, tools you choose"). Reed fits almost verbatim.
- **Deadline:** 2026-10-30, 10:00am MST (7 days from capture). Prize pool $50k+.
- **Hard requirements:** must run on **Nebius** (Token Factory or AI Cloud) + use **≥1 NVIDIA open
  model** (Nemotron). Public repo + OSI license (Apache/MIT/MPL) visible at top + README w/ setup.
  Working demo URL. **3-min public YouTube demo.** Feedback writeup on Nebius/NVIDIA tools. If it
  existed pre-window, explain what changed in-window (Reed = new, so clean).
- **Judging:** Technological Implementation (Nebius+Nemotron) · Design (complete product, not PoC) ·
  Potential Impact (real audience) · Quality of Idea (creative, non-obvious).

## Independence-rail reconciliation (the ethos tension, resolved)
EIS is offline-first/independence-first; this hackathon requires cloud + NVIDIA models. Why it's OK:
Nebius bills itself as **open, independent infrastructure** (anti-walled-garden) and Nemotron is
**open-weight** — power without a proprietary leash, closer to EIS values than AWS/Google. Reed's
memory + safety + identity stay portable; the big-model inference just happens to run on Nebius for
this entry. **Bootstrap, not destination** ([[feedback_independence_is_the_goal]]).

## 🛑 EIS guardrails (sensitive app — Luke's lane)
- **Children + health-adjacent = life-safety tier.** Non-extractive is absolute: **NEVER harvest a
  child's data**; parent/guardian-controlled, local-first memory.
- **Not medical advice / not a clinician.** Reed is a companion, not care. Clear scope on-screen.
- **Name SCREEN "Reed"** before any domain/store/legal ([[[NAME_SCREEN]]]).
- No claimed Shriner's (or any hospital) affiliation without a real agreement.
- Ties: [[user_eis_ethos]] · [[feedback_integrity_over_revenue]] · [[project_haven_covert_help]] (sibling
  sensitive lane) · Holly's Sentinel-Jr child-safety guardian.

## The FULL vision (context only — OUT of this hackathon's scope)
The eventual Reed, beyond the hackathon foundation (captured so it's not lost; NOT built for Oct 30):
- **Kid-made cartoons:** add **video + music generation** so a kid can make their own little cartoons.
- **In-hospital "social network":** a safe, walled space for kids to **share** those cartoons with each
  other. 🛑 children + social + sharing = a serious moderation/safety/privacy build; far-future, gated.
- **SOAP-note "middle-AI" to the doctor** (the original Shriner's feature, **explicitly NOT in this
  version**): Reed quietly surfaces useful observations to clinicians — e.g. *"Timmy had a tummy ache
  ~30 min after [x]," "Susan doesn't like the night-shift nurse — says they poke too hard drawing blood."*
  🛑🛑 This is **PHI / clinical-governance / HIPAA** territory and a care-adjacent signal to real doctors
  — it needs clinical + legal review and a real hospital agreement before it exists anywhere. Park it hard.

## Art / character (assets Scott provided 2026-10-23)
- **Reed** (the companion): curly brown-haired boy, backpack, walking staff, holding an **orange** (the
  Ember/Navel motif) — a gentle traveler. Painterly character art: `Pictures\00_Ember_Concept_Art\
  03_Guardian_Art\Reed1_Image.jpg`. App icon (carved-wood relief of him): `Pictures\02_Desktop Icons\
  Reed_Icon.PNG`. (Reed appears in the **Guardian_Art** set — he may have a guardian lineage; confirm.)
- **Mikey** (`Pictures\00_Ember_Concept_Art\01_Concept_Hero\Mikey_Image.png`): a SEPARATE hero — anime
  red-haired boy, also holding an orange, red dragon + Mt-Rainier backdrop. 🛑 **OPEN QUESTION for
  clear-headed Scott:** how does Mikey relate to Reed? (a sample kid-user avatar? an alt art style for
  the kids' generation? a different character entirely?) Don't assume.
- "Custom images, not cartoons" (Scott's note) = Reed's look is this painterly/carved style, not stock
  cartoon clip-art.

## Status
CONCEPT + full vision + art assets captured. NEXT = Scott (clear-headed): **go/no-go**, the **Mikey↔Reed**
answer, and confirm the minimum-lovable scope. If GO: scope the 7-day build (palace + tri-model + kid-safety
+ Reed's character + the play/draw/talk loop, on Nebius+Nemotron).
