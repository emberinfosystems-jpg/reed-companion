import React, { useState, useEffect } from "react";

// "Our chats" — the child's own memory they can revisit. A read-only list of past conversations grouped
// by day ("Today", "Yesterday", "Tuesday"); tap one to see what you talked about. No gate: it's the
// child's own history, and nothing here can be changed — it just helps them remember.
const nameFor = (id) => (id ? id.charAt(0).toUpperCase() + id.slice(1) : "Reed");

export default function HistoryView({ childId, onClose }) {
  const [threads, setThreads] = useState(null);
  const [open, setOpen] = useState(null);   // which day is expanded

  useEffect(() => {
    fetch(`/api/history/${encodeURIComponent(childId)}`)
      .then((r) => r.json())
      .then((d) => setThreads(d.threads || []))
      .catch(() => setThreads([]));
  }, [childId]);

  return (
    <div className="parent">
      <div className="parent-head">
        <span>💬 Our chats</span>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="parent-body">
        {threads === null ? (
          <p className="fine">Loading…</p>
        ) : threads.length === 0 ? (
          <div className="erased">
            <p className="big">No chats yet 🌱</p>
            <p className="fine">Once you start talking, the days you chat will show up here so you can look back any time.</p>
            <button className="primary" onClick={onClose}>Okay</button>
          </div>
        ) : (
          <>
            <p className="lede">Here are the days we've chatted. Tap one to see what we talked about.</p>
            <ul className="threads">
              {threads.map((t) => (
                <li key={t.day} className="thread">
                  <button className="thread-head" onClick={() => setOpen(open === t.day ? null : t.day)}
                    aria-expanded={open === t.day}>
                    <span className="thread-day">{t.label}</span>
                    <span className="thread-prev">{t.preview || `${t.count} messages`}</span>
                    <span className="thread-chev">{open === t.day ? "▾" : "▸"}</span>
                  </button>
                  {open === t.day && (
                    <ul className="transcript">
                      {t.turns.map((turn, i) => (
                        <li key={i} className={turn.who}>
                          <b>{turn.who === "kid" ? "You" : nameFor(turn.char)}:</b> {turn.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
