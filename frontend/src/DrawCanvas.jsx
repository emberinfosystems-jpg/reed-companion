import React, { useRef, useEffect, useState } from "react";

const COLORS = ["#2b2320", "#e5484d", "#f5a524", "#f7d154", "#46a758", "#3b82f6", "#8b5cf6", "#f06595", "#ffffff"];
const SIZES = { thin: 4, med: 10, thick: 20 };

export default function DrawCanvas({ onShow, onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [color, setColor] = useState("#3b82f6");
  const [size, setSize] = useState(SIZES.med);

  // Size the canvas to its box (crisp on HiDPI) and paint a white page.
  useEffect(() => {
    const c = canvasRef.current, box = c.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = box.width * dpr; c.height = box.height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fffef9"; ctx.fillRect(0, 0, box.width, box.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, []);

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function start(e) { e.preventDefault(); drawing.current = true; last.current = pos(e); }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.strokeStyle = color; ctx.lineWidth = size;
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  }
  function end() { drawing.current = false; }

  function clear() {
    const c = canvasRef.current, ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#fffef9"; ctx.fillRect(0, 0, c.width / dpr, c.height / dpr);
  }
  function show() { onShow(canvasRef.current.toDataURL("image/png")); }

  return (
    <div className="draw">
      <div className="draw-head">
        <span>🎨 Draw together</span>
        <button className="x" onClick={onClose} aria-label="Close drawing">✕</button>
      </div>
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
      <div className="tools">
        {COLORS.map((c) => (
          <button key={c} className={"swatch" + (c === color ? " on" : "")}
            style={{ background: c }} onClick={() => setColor(c)} aria-label={"color " + c} />
        ))}
        <span className="sizes">
          {Object.entries(SIZES).map(([k, v]) => (
            <button key={k} className={"sz" + (v === size ? " on" : "")} onClick={() => setSize(v)}>
              <span style={{ width: v, height: v }} />
            </button>
          ))}
        </span>
      </div>
      <div className="draw-actions">
        <button className="ghost" onClick={clear}>Clear</button>
        <button className="primary" onClick={show}>Show Reed!</button>
      </div>
    </div>
  );
}
