// On-device voice I/O for "a picture that talks."
//
// TEXT-TO-SPEECH is fully LOCAL-FIRST: the browser's own speechSynthesis runs on the device, offline, no
// cloud, no account — the companion literally talks on a machine with the network unplugged. This is the
// core of voice mode.
//
// SPEECH-TO-TEXT uses the browser's SpeechRecognition (Chrome/Edge; Chrome routes the audio through Google).
// It is an OPTIONAL convenience only — if it's missing or denied, the child just types. Typing + spoken
// replies stay 100% local-first, so the core loop NEVER depends on the one cloud-touching piece.

// Strip emoji / pictographs so TTS doesn't read "sparkles" "red heart" out loud.
const EMOJI = /[\p{Extended_Pictographic}‍️]/gu;
export function speakable(text) {
  return String(text || "").replace(EMOJI, "").replace(/\s{2,}/g, " ").trim();
}

// A warm, gentle voice. speechSynthesis loads voices async, so re-pick when the list arrives.
export function makeSpeaker() {
  const synth = typeof window !== "undefined" && window.speechSynthesis;
  if (!synth) return { supported: false, speak(_, o = {}) { o.onend && o.onend(); }, cancel() {} };

  let voice = null;
  const pick = () => {
    const vs = synth.getVoices() || [];
    voice =
      vs.find((v) => /^en/i.test(v.lang) && /female|zira|samantha|susan|karen|moira|google us english/i.test(v.name)) ||
      vs.find((v) => /^en/i.test(v.lang)) || vs[0] || null;
  };
  pick();
  if (synth.onvoiceschanged === null) synth.onvoiceschanged = pick;

  return {
    supported: true,
    speak(text, { onstart, onend } = {}) {
      const t = speakable(text);
      if (!t) { onend && onend(); return; }
      try {
        synth.cancel();                    // never let two lines overlap
        const u = new SpeechSynthesisUtterance(t);
        if (voice) u.voice = voice;
        u.rate = 0.96; u.pitch = 1.1; u.volume = 1;   // a little slow and warm for a young child
        u.onstart = () => onstart && onstart();
        u.onend = () => onend && onend();
        u.onerror = () => onend && onend();
        synth.speak(u);
      } catch { onend && onend(); }
    },
    cancel() { try { synth.cancel(); } catch { /* ignore */ } },
  };
}

// Optional mic. Returns { supported, start } — start() begins one listen and reports the transcript once.
export function makeListener() {
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return { supported: false, start() { return null; } };
  return {
    supported: true,
    start({ onresult, onend, onerror } = {}) {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onresult = (e) => { const t = e.results?.[0]?.[0]?.transcript || ""; onresult && onresult(t.trim()); };
      rec.onend = () => onend && onend();
      rec.onerror = (e) => onerror && onerror(e);
      try { rec.start(); } catch (err) { onerror && onerror(err); }
      return rec;   // caller may rec.stop()
    },
  };
}
