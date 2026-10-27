import React, { useState, useRef, useEffect } from "react";
import DrawCanvas from "./DrawCanvas.jsx";
import ParentView from "./ParentView.jsx";

// One child id per device, kept locally. Shared across companions — both friends remember the same child.
function childId() {
  let id = localStorage.getItem("reed_child");
  if (!id) { id = "kid-" + Math.random().toString(36).slice(2, 8); localStorage.setItem("reed_child", id); }
  return id;
}

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [char, setChar] = useState(null);          // the active companion (persona + look come from the server)
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const endRef = useRef(null);
  const id = useRef(childId());

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  // Load the roster once; open on the first companion (Reed).
  useEffect(() => {
    fetch("/api/characters").then(r => r.json()).then(d => {
      const list = d.characters || [];
      setCharacters(list);
      if (list[0]) pickCharacter(list[0]);
    }).catch(() => {});
  }, []);

  function pickCharacter(c) {
    setChar(c);
    setMsgs([{ who: "reed", text: c.greeting }]);
    setSkills([]);
    fetch(`/api/skills?character=${c.id}`).then(r => r.json()).then(d => setSkills(d.skills || [])).catch(() => {});
  }

  async function startSkill(skillId, label) {
    if (busy || !char) return;
    setMsgs((m) => [...m, { who: "kid", text: label }]);
    setBusy(true);
    try {
      const r = await fetch("/api/skill", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id.current, skillId, character: char.id }),
      });
      const data = await r.json();
      setMsgs((m) => [...m, { who: "reed", text: data.reply || "Let's play!" }]);
    } catch { setMsgs((m) => [...m, { who: "reed", text: "Hmm, let's try that again?" }]); }
    finally { setBusy(false); }
  }

  async function sendText(t, image = null) {
    if (!t || busy || !char) return;
    setMsgs((m) => [...m, { who: "kid", text: t }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id.current, text: t, image, character: char.id }),
      });
      const data = await r.json();
      setMsgs((m) => [...m, { who: "reed", text: data.reply || "..." }]);
    } catch {
      setMsgs((m) => [...m, { who: "reed", text: "Oops, I got a little mixed up. Can you say that again?" }]);
    } finally { setBusy(false); }
  }
  function send() { const t = text.trim(); if (!t) return; setText(""); sendText(t); }

  function chipClick(s) {
    if (s.id === "draw" || s.id === "moments" || s.id === "museum") setDrawing(true);   // drawing-based skills open the canvas
    startSkill(s.id, s.label);
  }
  function showDrawing(dataUrl) { setDrawing(false); sendText("Here's my drawing! 🎨", dataUrl); }

  if (!char) return <div className="app" />;                 // loading the roster
  const accent = { "--reed": `hsl(${char.accent})` };        // re-theme the whole app in the companion's color

  return (
    <div className="app" style={accent}>
      <header className="bar">
        <img className="avatar" src={char.avatar} alt={char.name} />
        <div><div className="name">{char.name}</div><div className="tag">{char.tagline}</div></div>
        <button className="grownups" onClick={() => setParentOpen(true)}>🔒 For grown-ups</button>
      </header>

      {characters.length > 1 && (
        <div className="picker">
          {characters.map((c) => (
            <button key={c.id} className={"pick" + (c.id === char.id ? " on" : "")} disabled={busy}
              onClick={() => pickCharacter(c)} style={{ "--reed": `hsl(${c.accent})` }}>
              <img src={c.avatar} alt="" />{c.name}
            </button>
          ))}
        </div>
      )}

      <main className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={`row ${m.who}`}>
            {m.who === "reed" && <img className="pic" src={char.icon} alt="" />}
            <div className={`bubble ${m.who}`}>{m.text}</div>
          </div>
        ))}
        {busy && <div className="row reed"><img className="pic" src={char.icon} alt="" /><div className="bubble reed typing">{char.name} is thinking…</div></div>}
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
          placeholder={`Type to ${char.name}…`} aria-label={`Message ${char.name}`}
        />
        <button onClick={send} disabled={busy || !text.trim()}>Send</button>
      </footer>
      <p className="disclaimer">
        {char.name} is a friend to play with, not a doctor or nurse. For anything about your health,
        medicine, or how you feel, tell a grown-up who's with you.
      </p>

      {drawing && <DrawCanvas onShow={showDrawing} onClose={() => setDrawing(false)} />}
      {parentOpen && <ParentView childId={id.current} onClose={() => setParentOpen(false)} />}
    </div>
  );
}
