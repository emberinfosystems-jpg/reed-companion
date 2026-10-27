import React, { useState, useRef, useEffect } from "react";
import DrawCanvas from "./DrawCanvas.jsx";
import ParentView from "./ParentView.jsx";

// One child id per device, kept locally. (Real deployment: a family sets this up.)
function childId() {
  let id = localStorage.getItem("reed_child");
  if (!id) { id = "kid-" + Math.random().toString(36).slice(2, 8); localStorage.setItem("reed_child", id); }
  return id;
}

const HELLO = "Hi! I'm Reed. I'm really glad you're here. What should we do today?";

export default function App() {
  const [msgs, setMsgs] = useState([{ who: "reed", text: HELLO }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const endRef = useRef(null);
  const id = useRef(childId());

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => { fetch("/api/skills").then(r => r.json()).then(d => setSkills(d.skills || [])).catch(() => {}); }, []);

  async function startSkill(skillId, label) {
    if (busy) return;
    setMsgs((m) => [...m, { who: "kid", text: label }]);
    setBusy(true);
    try {
      const r = await fetch("/api/skill", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id.current, skillId }),
      });
      const data = await r.json();
      setMsgs((m) => [...m, { who: "reed", text: data.reply || "Let's play!" }]);
    } catch { setMsgs((m) => [...m, { who: "reed", text: "Hmm, let's try that again?" }]); }
    finally { setBusy(false); }
  }

  async function sendText(t) {
    if (!t || busy) return;
    setMsgs((m) => [...m, { who: "kid", text: t }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id.current, text: t }),
      });
      const data = await r.json();
      setMsgs((m) => [...m, { who: "reed", text: data.reply || "..." }]);
    } catch {
      setMsgs((m) => [...m, { who: "reed", text: "Oops, I got a little mixed up. Can you say that again?" }]);
    } finally { setBusy(false); }
  }
  function send() { const t = text.trim(); if (!t) return; setText(""); sendText(t); }

  function chipClick(s) {
    if (s.id === "draw") setDrawing(true);
    startSkill(s.id, s.label);
  }
  function showDrawing() { setDrawing(false); sendText("Here's my drawing! 🎨"); }

  return (
    <div className="app">
      <header className="bar">
        <img className="avatar" src="/reed.jpg" alt="Reed" />
        <div><div className="name">Reed</div><div className="tag">your hangout buddy</div></div>
        <button className="grownups" onClick={() => setParentOpen(true)}>🔒 For grown-ups</button>
      </header>

      <main className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={`row ${m.who}`}>
            {m.who === "reed" && <img className="pic" src="/reed_icon.png" alt="" />}
            <div className={`bubble ${m.who}`}>{m.text}</div>
          </div>
        ))}
        {busy && <div className="row reed"><img className="pic" src="/reed_icon.png" alt="" /><div className="bubble reed typing">Reed is thinking…</div></div>}
        <div ref={endRef} />
      </main>

      <div className="chips">
        {skills.map((s) => (
          <button key={s.id} className="chip" disabled={busy} onClick={() => chipClick(s)}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <footer className="input">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type to Reed…" aria-label="Message Reed"
        />
        <button onClick={send} disabled={busy || !text.trim()}>Send</button>
      </footer>
      <p className="disclaimer">
        Reed is a friend to play with, not a doctor or nurse. For anything about your health, medicine,
        or how you feel, tell a grown-up who's with you.
      </p>

      {drawing && <DrawCanvas onShow={showDrawing} onClose={() => setDrawing(false)} />}
      {parentOpen && <ParentView childId={id.current} onClose={() => setParentOpen(false)} />}
    </div>
  );
}
