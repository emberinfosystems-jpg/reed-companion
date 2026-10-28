import React, { useState } from "react";
import { buildPrivacy, buildTerms } from "./legalContent.js";

// Reed's Legal page. REUSES the fleet @ember/legal rail (legalContent.js is vendored from
// @ember/legal@0.3.3 so Reed builds standalone) — same EIS clauses, same custodian + children handling —
// but Reed is a shape the rail's generic flags don't fully fit: the HOSTED demo has a server AND no
// accounts, and the app is FOR children. So we take the rail's generated sections and surgically correct
// the few sentences that would otherwise be false for Reed, then render. Nothing untrue ships.

const REED_LEGAL = {
  appName: "Reed & Mira",
  tagline: "a gentle AI companion for children",
  description:
    "Reed & Mira are warm, local-first AI companions for children (roughly ages 6–12), built by " +
    "Ember Information Systems LLC for the Nebius × NVIDIA Global AI Hackathon. They chat, play games, " +
    "draw together, and remember small things about the child. They are not a doctor, nurse, or " +
    "therapist, and they give no medical advice.",
  contactEmail: "support@emberinformation.com",
  jurisdiction: "Oregon",
  effectiveDate: "October 2026",
  version: "1.0",
  minAge: 18,                 // the parent/caregiver who sets it up agrees to the terms
  hasAccounts: false,         // no sign-in at all
  noServer: false,            // the HOSTED demo DOES run a server (so we don't claim "nothing reaches us")
  localFirst: false,          // drop the rail's generic "lives on your device" section — our §11 addendum
                              // ("Where your child's words go") states local-vs-hosted honestly instead
  holdsThirdPartyData: true,  // the device/server holds the CHILD's data — the custodian case
  thirdPartyTerm: "child",
  lifeSafety: true,           // read straight: drops the joke arbitration clause
  usesPayments: false,
  showHowYouGet: false,       // not sold through a store; skip the store/Stripe section
  subprocessors: [{
    name: "Nebius (NVIDIA Nemotron hosted inference)",
    purpose:
      "in the hosted version, the text of a child's messages and drawings is sent to generate a reply; " +
      "it is not used for advertising and is not sold",
  }],
  // Accurate "Data We Collect" table (drives §2 and the retention view).
  dataCollected: [
    { category: "Account", detail: "None. No sign-in, no email, no password.", retention: "n/a" },
    {
      category: "What the child shares",
      detail: "Messages, drawings, and small remembered preferences (e.g. a favorite animal, a pet's name). " +
        "Hosted version: stored on our server so the app works. Local install: stored only on the device.",
      retention: "Until a grown-up deletes it. On the free hosted tier it may also be cleared when the service restarts.",
    },
    {
      category: "Safety notes",
      detail: "If the app flags a possible safety moment, the child's words are kept for a grown-up to review.",
      retention: "Until deleted; only the most recent are kept.",
    },
    {
      category: "Message text sent to the AI (hosted only)",
      detail: "To generate a reply, message text and drawings are sent to our model provider (Nebius / NVIDIA). " +
        "Not used for ads, not sold.",
      retention: "We do not store it beyond generating the reply.",
    },
    { category: "Analytics / tracking", detail: "None. No ads, no trackers, no usage analytics.", retention: "n/a" },
  ],
  addenda: [
    {
      title: "Where your child's words go",
      body: [
        "Reed runs in two ways, and they are different, so here is the plain truth about each:",
        {
          list: [
            "Hosted version (this website): your child's conversation and memory are stored on our server so " +
              "the app works, and each message is sent to the AI model provider (Nebius / NVIDIA) to generate a reply. " +
              "We do not sell it, show ads, or build a profile.",
            "Downloadable / local version: the whole thing runs on your own computer and offline. Nothing is " +
              "uploaded and nothing is sent to us or anyone else.",
          ],
        },
        "Either way, no account is required, and a grown-up can see, download, or delete everything at any time.",
      ],
    },
    {
      title: "Not a medical service",
      body: [
        "Reed and Mira are companions for play and comfort. They are not a doctor, nurse, or therapist, they do " +
          "not give medical advice, diagnosis, or treatment, and they are not a medical device.",
        "This app is not affiliated with, or endorsed by, any hospital or health system. It is intended for " +
          "children used with a caregiver who is aware of it, and it is not a substitute for professional care or " +
          "for a grown-up who is present.",
      ],
    },
    {
      title: "How safety works, and its limits",
      body: [
        "Every message a child sends and every reply a companion gives is checked by a separate safety model " +
          "before the child sees it, and the system has been adversarially tested. If a child seems unsafe or hurt, " +
          "the companion stays warm and gently encourages them to tell a grown-up who is there with them.",
        "No automated safety system is perfect. Reed is a supervised tool, not a guardian — a caregiver should " +
          "stay aware of how it is used.",
      ],
    },
  ],
};

// Replace a section's body by id (surgical fix for the sentences the rail's generic flags get wrong for Reed).
const OVERRIDES = {
  use: [
    "We use what the child shares only to do the obvious thing: to reply in the conversation, to remember a few " +
      "small preferences so the companion feels like a friend who came back, and — if the app flags a possible " +
      "safety moment — to keep a note for a grown-up to review. We never use it for advertising, we never sell it, " +
      "and we never build a profile of your child.",
  ],
  security: [
    "We keep what the app needs small and give you full control to delete it. Connections are encrypted in transit " +
      "(HTTPS/TLS). In the hosted version, a child's conversation and memory are stored on our server so the app can " +
      "work, and are removed when a grown-up chooses “Delete all data” (on the free hosted tier, stored data may also " +
      "be cleared automatically when the service restarts). In a local install, the data stays on the device and never " +
      "leaves it. No system is perfectly secure — keep the device locked, and treat any exported copy as carefully as the original.",
  ],
  children: [
    "Reed and Mira are made FOR children, so this is the heart of our promise. The app is meant to be set up and " +
      "overseen by a parent or caregiver, who decides whether their child uses it and controls all of the data.",
    "We ask a child for nothing that identifies them — no real name is required, no address, no phone number, no " +
      "photo of them — and the companion is built to never request such things. What the child types or draws is used " +
      "only to reply and to remember small preferences. A grown-up can see everything in the “For grown-ups” area, " +
      "download it, or delete all of it — including the chat history — at any time, in the app or by emailing " +
      "support@emberinformation.com.",
  ],
  rights: [
    "You can exercise these rights yourself, at any time:",
    { list: [
      "Access: a grown-up can see everything the companion remembers in the “For grown-ups” area, and download a full copy.",
      "Correction: tell the companion and it updates what it remembers, or delete everything and start fresh.",
      "Erasure: use “Delete all data” in Settings to remove it all, including past chats. In a local install, deleting the file or uninstalling does the same.",
      "Portability: the downloadable copy is plain JSON you can keep or move.",
      "Restriction: turn off the microphone in Settings, or simply stop using the app.",
    ] },
    "To ask a question or request a deletion, contact support@emberinformation.com. We respond within 30 days.",
  ],
  thirdparty: [
    "Reed & Mira is for a child, and a child's words and drawings are personal to them. Whoever sets up and holds " +
      "the device — a parent or caregiver — is the custodian of that information: you decide what is kept and when it is deleted.",
    "In the hosted version that information is also processed on our server and by the model provider to generate " +
      "replies, as described above; we do not sell it or use it for advertising. In a local install, it never leaves your device.",
    "Practically:",
    { list: [
      "Keep only what you need — you can delete everything at any time under Settings.",
      "Anyone with access to this device can open the app and read what's stored. Use a screen lock.",
      "An exported copy has none of the app's protections — treat it as carefully as the original.",
    ] },
    "This is general information, not legal advice. Children's data carries extra obligations in many places " +
      "(COPPA, GDPR and similar). If that applies to you, get advice specific to your situation.",
  ],
};

function reedSections(kind) {
  const raw = kind === "terms" ? buildTerms(REED_LEGAL) : buildPrivacy(REED_LEGAL);
  // Apply Reed's surgical overrides, and renumber sequentially (dropping a section can otherwise leave a gap).
  return raw.map((s, i) => ({ ...s, num: String(i + 1), body: OVERRIDES[s.id] ? OVERRIDES[s.id] : s.body }));
}

// ── renderer (section-body shapes from the rail: string | {html} | {list} | {table}) ──
function Block({ b }) {
  if (typeof b === "string") return <p>{b}</p>;
  if (b.html) return <p dangerouslySetInnerHTML={{ __html: b.html }} />;
  if (b.list) return <ul className="eLegal-list">{b.list.map((x, i) => <li key={i}>{x}</li>)}</ul>;
  if (b.table) return (
    <table className="eLegal-table"><tbody>
      {b.table.map((r, i) => (
        <tr key={i}>
          <th>{r.category}</th>
          <td>{r.detail}{r.retention ? <><br /><span className="eLegal-muted">Kept: {r.retention}</span></> : null}</td>
        </tr>
      ))}
    </tbody></table>
  );
  return null;
}

export default function LegalTab() {
  const [doc, setDoc] = useState("privacy");
  const sections = reedSections(doc);
  return (
    <div className="eLegal">
      <div className="eLegal-switch">
        <button className={doc === "privacy" ? "on" : ""} onClick={() => setDoc("privacy")}>Privacy</button>
        <button className={doc === "terms" ? "on" : ""} onClick={() => setDoc("terms")}>Terms</button>
      </div>
      <p className="eLegal-meta">An Ember Information Systems LLC build · Oregon · Effective {REED_LEGAL.effectiveDate} · v{REED_LEGAL.version}</p>
      {sections.map((s) => (
        <section key={s.id} className="eLegal-section">
          <h3><span className="eLegal-num">{s.num}.</span> {s.title}</h3>
          {s.body.map((b, i) => <Block b={b} key={i} />)}
        </section>
      ))}
    </div>
  );
}
