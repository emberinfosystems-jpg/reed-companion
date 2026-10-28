import React, { useState, useEffect, useMemo } from "react";
import LegalTab from "./legal/LegalTab.jsx";

// Parent portal — "data under your control", plus Settings, Legal, and About. Behind a tiny math gate
// (a speed bump so a child doesn't wander in and change things, not a security boundary). Everything a
// grown-up can see or control about their child lives in one local file.
export default function ParentView({ childId, onClose, micEnabled = true, onMicEnabledChange }) {
  const gate = useMemo(() => ({ a: 2 + Math.floor(Math.random() * 7), b: 2 + Math.floor(Math.random() * 7) }), []);
  const [unlocked, setUnlocked] = useState(false);
  const [answer, setAnswer] = useState("");
  const [tab, setTab] = useState("data");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erased, setErased] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    fetch(`/api/parent/${encodeURIComponent(childId)}`)
      .then((r) => r.json()).then(setData)
      .catch(() => setData({ error: true })).finally(() => setLoading(false));
  }, [unlocked, childId]);

  function tryUnlock(e) {
    e.preventDefault();
    if (Number(answer) === gate.a + gate.b) setUnlocked(true);
    else setAnswer("");
  }

  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reed-memory-${childId}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  // Deletes the entire per-child file on the server — profile, memory, organizer lists, the safety log,
  // AND the "Our chats" history (it all lives in that one file). Nothing is kept.
  async function eraseAll() {
    if (!window.confirm("Delete everything about your child — including chat history? This cannot be undone.")) return;
    try {
      await fetch(`/api/parent/${encodeURIComponent(childId)}`, { method: "DELETE" });
      setData(null); setErased(true);
    } catch { /* keep the view open; parent can retry */ }
  }

  const list = (arr) => (arr && arr.length ? arr.join(", ") : null);

  return (
    <div className="parent">
      <div className="parent-head">
        <span>For grown-ups</span>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="parent-body">
        {!unlocked ? (
          <form className="gate" onSubmit={tryUnlock}>
            <p className="gate-q">Quick check: what is <b>{gate.a} + {gate.b}</b>?</p>
            <input className="gate-in" inputMode="numeric" value={answer}
              onChange={(e) => setAnswer(e.target.value)} aria-label="Answer" autoFocus />
            <button className="primary" type="submit">Continue</button>
            <p className="fine">This keeps a child from opening the grown-up page by accident.</p>
          </form>
        ) : erased ? (
          <div className="erased">
            <p className="big">All cleared. 🌱</p>
            <p className="fine">Nothing is remembered about your child anymore — including past chats. Next time, the companion starts fresh.</p>
            <button className="primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <nav className="ptabs" role="tablist">
              <button className={tab === "data" ? "on" : ""} onClick={() => setTab("data")}>Memory &amp; data</button>
              <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>Settings</button>
              <button className={tab === "legal" ? "on" : ""} onClick={() => setTab("legal")}>Legal</button>
              <button className={tab === "about" ? "on" : ""} onClick={() => setTab("about")}>About</button>
            </nav>

            {tab === "data" && (loading ? <p className="fine">Loading…</p> : (
              <>
                <p className="lede">
                  Here is <b>everything</b> the companion remembers about your child. On a local install this
                  stays on your device; in this hosted version it is stored on our server. You can download a
                  copy any time, and erase it under Settings.
                </p>
                {data?.flagged?.length > 0 && (
                  <section className="card-sec flagged-sec">
                    <h3>💛 Moments to check in on</h3>
                    <p className="fine">
                      Your child said something that suggested they may feel unsafe or hurt. The companion stayed
                      warm and encouraged them to tell a grown-up who's with them. These are their exact words.
                    </p>
                    <ul className="flagged">
                      {data.flagged.map((f, i) => (
                        <li key={i}>
                          <span className="when">{new Date(f.at).toLocaleString()}</span>
                          <span className="said">"{f.text}"</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section className="card-sec">
                  <h3>What the companion knows</h3>
                  <dl className="facts">
                    <dt>Name</dt><dd>{data?.name || <em>not shared</em>}</dd>
                    <dt>Pets</dt><dd>{list(data?.pets) || <em>none yet</em>}</dd>
                    <dt>Likes</dt><dd>{list(data?.likes) || <em>none yet</em>}</dd>
                    <dt>Doesn't like</dt><dd>{list(data?.dislikes) || <em>none yet</em>}</dd>
                    <dt>Interests</dt><dd>{list(data?.interests) || <em>none yet</em>}</dd>
                  </dl>
                </section>
                <section className="card-sec">
                  <h3>Recent conversation</h3>
                  {data?.recent?.length ? (
                    <ul className="recent">
                      {data.recent.map((t, i) => (
                        <li key={i} className={t.who}><b>{t.who === "kid" ? "Child" : "Companion"}:</b> {t.text}</li>
                      ))}
                    </ul>
                  ) : <p className="fine">No messages yet.</p>}
                </section>
                <div className="parent-actions">
                  <button className="ghost" onClick={download}>Download a copy</button>
                </div>
              </>
            ))}

            {tab === "settings" && (
              <>
                <p className="lede">Settings are kept on this device.</p>
                <section className="card-sec">
                  <h3>Talking (microphone)</h3>
                  <label className="setting-row">
                    <span>
                      Let your child talk out loud to the companion.
                      <span className="fine"> Uses your browser's speech-to-text, which may send audio to the browser maker. Turn this off to keep everything local — your child can always type.</span>
                    </span>
                    <input type="checkbox" className="switch" checked={!!micEnabled}
                      onChange={(e) => onMicEnabledChange && onMicEnabledChange(e.target.checked)} />
                  </label>
                </section>
                <section className="card-sec">
                  <h3>Delete all data</h3>
                  <p className="fine">
                    There is no account to close — the app has no sign-in. This removes everything stored about
                    your child: remembered facts, the safety log, and all past chats. It cannot be undone.
                  </p>
                  <div className="parent-actions">
                    <button className="danger" onClick={eraseAll}>Delete all data</button>
                  </div>
                </section>
              </>
            )}

            {tab === "legal" && <LegalTab />}

            {tab === "about" && (
              <div className="about">
                <h2>About Reed &amp; Mira</h2>
                <p>
                  Reed and Mira are gentle AI companions for children spending time in the hospital — and they
                  work just as well at home. They chat, make up stories, play quiet games, draw together, and
                  remember the little things your child tells them. They are not a doctor, nurse, or therapist,
                  and they never give medical advice. This app is not affiliated with or endorsed by any hospital
                  or health system.
                </p>
                <h3>What Reed and Mira do</h3>
                <p>
                  They listen, play, and keep your child company. Each companion runs on the same safety-hardened
                  engine, so more friends can join over time. They're built for the Nebius × NVIDIA Global AI
                  Hackathon and run on NVIDIA Nemotron open-weight models.
                </p>
                <h3>Your child's privacy</h3>
                <p>
                  No ads. No data harvesting. No account required. A grown-up can read, download, or erase
                  everything the companion remembers at any time. See the Legal tab for exactly how the hosted
                  and offline versions handle data.
                </p>
                <h3>How we keep it safe</h3>
                <p>
                  Every message your child sends and every reply the companion gives is checked by a safety model
                  before your child sees it, and the system has been adversarially tested. If a child seems unsafe
                  or hurt, the companion stays warm and gently encourages them to tell a grown-up who is there with
                  them.
                </p>
                <h3>Who made it</h3>
                <p>
                  Ember Information Systems LLC (Oregon)<br />
                  <a href="mailto:support@emberinformation.com">support@emberinformation.com</a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
