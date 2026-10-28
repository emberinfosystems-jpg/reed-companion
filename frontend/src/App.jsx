import React, { useState, useRef, useEffect } from "react";
import DrawCanvas from "./DrawCanvas.jsx";
import ParentView from "./ParentView.jsx";
import { makeSpeaker, makeListener } from "./voice.js";

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
  const [voiceMode, setVoiceMode] = useState(false);   // "a picture that talks" — the companion speaks its replies
  const [speaking, setSpeaking] = useState(false);      // TTS is mid-sentence (drives the avatar animation)
  const [listening, setListening] = useState(false);    // the mic is open
  const endRef = useRef(null);
  const id = useRef(childId());
  const voiceRef = useRef(false);                        // async handlers read this to decide whether to speak
  const recRef = useRef(null);                           // the live SpeechRecognition, so we can stop it
  // Lazy singletons — created once, not on every render.
  const speaker = useRef(null); if (!speaker.current) speaker.current = makeSpeaker();
  const listener = useRef(null); if (!listener.current) listener.current = makeListener();

  useEffect(() => { voiceRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => () => speaker.current?.cancel(), []);  // stop any speech if the app unmounts

  // Push a companion line, and — in voice mode — speak it aloud on-device (local-first TTS).
  function receiveReply(reply) {
    setMsgs((m) => [...m, { who: "reed", text: reply }]);
    if (voiceRef.current && speaker.current?.supported) {
      speaker.current.speak(reply, { onstart: () => setSpeaking(true), onend: () => setSpeaking(false) });
    }
  }

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
      receiveReply(data.reply || "Let's play!");
    } catch { receiveReply("Hmm, let's try that again?"); }
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
      receiveReply(data.reply || "...");
    } catch {
      receiveReply("Oops, I got a little mixed up. Can you say that again?");
    } finally { setBusy(false); }
  }
  function send() { const t = text.trim(); if (!t) return; setText(""); sendText(t); }

  // Toggle "picture that talks." Turning it off stops any speech immediately.
  function toggleVoice() {
    setVoiceMode((on) => {
      const next = !on;
      if (!next) { speaker.current?.cancel(); setSpeaking(false); stopMic(); }
      return next;
    });
  }
  function stopMic() { try { recRef.current?.stop(); } catch { /* ignore */ } recRef.current = null; setListening(false); }
  // Optional on-device-ish mic (browser STT). Tap to listen; the transcript is sent as a normal message.
  function toggleMic() {
    if (listening) { stopMic(); return; }
    if (!listener.current?.supported || busy) return;
    speaker.current?.cancel(); setSpeaking(false);   // don't record the companion's own voice
    setListening(true);
    recRef.current = listener.current.start({
      onresult: (t) => { if (t) sendText(t); },
      onend: () => { recRef.current = null; setListening(false); },
      onerror: () => { recRef.current = null; setListening(false); },
    });
  }

  function chipClick(s) {
    if (s.id === "draw" || s.id === "moments" || s.id === "museum") setDrawing(true);   // drawing-based skills open the canvas
    startSkill(s.id, s.label);
  }
  function showDrawing(dataUrl) { setDrawing(false); sendText("Here's my drawing! 🎨", dataUrl); }

  if (!char) return <div className="app" />;                 // loading the roster
  const accent = { "--reed": `hsl(${char.accent})` };        // re-theme the whole app in the companion's color
  const lastReed = [...msgs].reverse().find((m) => m.who === "reed")?.text || char.greeting;

  return (
    <div className="app" style={accent}>
      <header className="bar">
        <img className="avatar" src={char.avatar} alt={char.name} />
        <div><div className="name">{char.name}</div><div className="tag">{char.tagline}</div></div>
        {speaker.current?.supported && (
          <button className={"voicetoggle" + (voiceMode ? " on" : "")} onClick={toggleVoice}
            aria-pressed={voiceMode} title="Let the companion talk out loud">
            {voiceMode ? "🔊 Voice on" : "🔈 Voice"}
          </button>
        )}
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

      {voiceMode ? (
        // "A picture that talks": the companion's face, large, speaking the reply aloud, with the words
        // shown as a caption too (so it's readable — kind to kids who are hard of hearing).
        <main className="stage">
          <div className={"portrait" + (speaking ? " speaking" : "") + (listening ? " listening" : "")}>
            <img src={char.avatar} alt={char.name} />
          </div>
          <div className="caption">{busy ? `${char.name} is thinking…` : lastReed}</div>
          <div className="voicebar">
            {listener.current?.supported ? (
              <button className={"mic" + (listening ? " on" : "")} disabled={busy} onClick={toggleMic}
                aria-pressed={listening} aria-label={`Talk to ${char.name}`}>
                {listening ? "● Listening…" : "🎤 Talk"}
              </button>
            ) : (
              <span className="micnote">Talking isn't available in this browser — type instead 🙂</span>
            )}
            <div className="voicetype">
              <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={`Type to ${char.name}…`} aria-label={`Message ${char.name}`} />
              <button onClick={send} disabled={busy || !text.trim()}>Send</button>
            </div>
          </div>
        </main>
      ) : (
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
      )}

      <div className="chips">
        {skills.map((s) => (
          <button key={s.id} className="chip" disabled={busy} onClick={() => chipClick(s)}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {!voiceMode && (
        <footer className="input">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Type to ${char.name}…`} aria-label={`Message ${char.name}`}
          />
          <button onClick={send} disabled={busy || !text.trim()}>Send</button>
        </footer>
      )}
      <p className="disclaimer">
        {char.name} is a friend to play with, not a doctor or nurse. For anything about your health,
        medicine, or how you feel, tell a grown-up who's with you.
      </p>

      {drawing && <DrawCanvas onShow={showDrawing} onClose={() => setDrawing(false)} />}
      {parentOpen && <ParentView childId={id.current} onClose={() => setParentOpen(false)} />}
    </div>
  );
}
