import React, { useState, useEffect, useMemo } from "react";

// Parent view — "data under your control." Everything Reed remembers about a child lives in one
// local file; here a grown-up can read it, download a copy, or erase it. A tiny math gate keeps a
// child from wandering in and wiping their own memory — a speed bump, not a security boundary.
export default function ParentView({ childId, onClose }) {
  const gate = useMemo(() => ({ a: 2 + Math.floor(Math.random() * 7), b: 2 + Math.floor(Math.random() * 7) }), []);
  const [unlocked, setUnlocked] = useState(false);
  const [answer, setAnswer] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erased, setErased] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    fetch(`/api/parent/${encodeURIComponent(childId)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: true }))
      .finally(() => setLoading(false));
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
    a.href = url;
    a.download = `reed-memory-${childId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function eraseAll() {
    if (!window.confirm("Erase everything Reed remembers about your child? This cannot be undone.")) return;
    try {
      await fetch(`/api/parent/${encodeURIComponent(childId)}`, { method: "DELETE" });
      setData(null);
      setErased(true);
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
            <input
              className="gate-in" inputMode="numeric" value={answer}
              onChange={(e) => setAnswer(e.target.value)} aria-label="Answer" autoFocus
            />
            <button className="primary" type="submit">Continue</button>
            <p className="fine">This keeps a child from opening the grown-up page by accident.</p>
          </form>
        ) : erased ? (
          <div className="erased">
            <p className="big">All cleared. 🌱</p>
            <p className="fine">Reed no longer remembers anything about your child. Next time you chat, Reed starts fresh.</p>
            <button className="primary" onClick={onClose}>Done</button>
          </div>
        ) : loading ? (
          <p className="fine">Loading…</p>
        ) : (
          <>
            <p className="lede">
              Here is <b>everything</b> Reed remembers about your child. It is stored only on this
              device and is never uploaded. You can download a copy or erase it at any time.
            </p>

            {data?.flagged?.length > 0 && (
              <section className="card-sec flagged-sec">
                <h3>💛 Moments to check in on</h3>
                <p className="fine">
                  Your child said something that suggested they may feel unsafe or hurt. Reed stayed
                  warm and encouraged them to tell a grown-up who's with them. You may want to gently
                  check in. These are their exact words.
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
              <h3>What Reed knows</h3>
              <dl className="facts">
                <dt>Name</dt><dd>{data?.name || <em>not shared</em>}</dd>
                <dt>Pets</dt><dd>{list(data?.pets) || <em>none yet</em>}</dd>
                <dt>Likes</dt><dd>{list(data?.likes) || <em>none yet</em>}</dd>
                <dt>Doesn't like</dt><dd>{list(data?.dislikes) || <em>none yet</em>}</dd>
                <dt>Interests</dt><dd>{list(data?.interests) || <em>none yet</em>}</dd>
                <dt>Ongoing</dt>
                <dd>{data?.threads?.length ? data.threads.map((t, i) => <span key={i}>{t.topic}{t.note ? ` (${t.note})` : ""}{i < data.threads.length - 1 ? "; " : ""}</span>) : <em>nothing in progress</em>}</dd>
              </dl>
            </section>

            <section className="card-sec">
              <h3>Recent conversation</h3>
              {data?.recent?.length ? (
                <ul className="recent">
                  {data.recent.map((t, i) => (
                    <li key={i} className={t.who}><b>{t.who === "kid" ? "Child" : "Reed"}:</b> {t.text}</li>
                  ))}
                </ul>
              ) : <p className="fine">No messages yet.</p>}
            </section>

            <div className="parent-actions">
              <button className="ghost" onClick={download}>Download a copy</button>
              <button className="danger" onClick={eraseAll}>Erase everything</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
