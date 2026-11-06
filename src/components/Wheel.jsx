import { useEffect, useRef } from "react";

const SEG = ["#2c5a4b", "#24493e", "#3a6b5a", "#1f4236"];
const TAU = 2 * Math.PI;

// segments: [{ n, weight }] en el orden en que se dibujan.
// spinTo: número de asiento al que debe llegar (null = quieta). onDone se llama al terminar.
export default function Wheel({ segments, hit, spinTo, onDone }) {
  const canvasRef = useRef(null);
  const rotation = useRef(0);
  const segsRef = useRef(segments);
  const hitRef = useRef(hit);
  segsRef.current = segments;
  hitRef.current = hit;

  const layout = () => {
    const segs = segsRef.current;
    const total = segs.reduce((t, s) => t + s.weight, 0) || 1;
    let a = 0;
    return segs.map((s) => {
      const sweep = (TAU * s.weight) / total;
      const r = { ...s, start: a, end: a + sweep };
      a += sweep;
      return r;
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, R = W / 2 - 10, c = W / 2;
    const segs = layout();
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(rotation.current);
    segs.forEach((s, i) => {
      const isHit = hitRef.current === s.n;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, s.start - Math.PI / 2, s.end - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = isHit ? "#f29a8e" : s.weight === 3 ? "#5f6b38" : s.weight === 2 ? "#4a6a40" : SEG[i % SEG.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(243,239,228,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.rotate((s.start + s.end) / 2);
      const fs = segs.length > 30 ? 22 : segs.length > 18 ? 28 : 38;
      ctx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = isHit ? "#142a23" : "#f3efe4";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(s.n), 0, -R * 0.8);
      ctx.restore();
    });
    ctx.restore();
    ctx.beginPath();
    ctx.arc(c, c, 48, 0, TAU);
    ctx.fillStyle = "#142a23";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f5d15a";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, TAU);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(243,239,228,0.5)";
    ctx.stroke();
  };

  useEffect(draw);

  useEffect(() => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }, []);

  useEffect(() => {
    if (spinTo == null) return;
    const s = layout().find((x) => x.n === spinTo);
    if (!s) {
      onDone && onDone();
      return;
    }
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const aim = s.start + (s.end - s.start) * (0.25 + Math.random() * 0.5);
    const current = ((rotation.current % TAU) + TAU) % TAU;
    const delta = (((-aim - current) % TAU) + TAU) % TAU;
    const from = rotation.current;
    const to = from + delta + TAU * (reduce ? 0 : 6);
    const dur = reduce ? 1 : 5000;
    let t0 = null, raf = 0, cancelled = false;
    const step = (ts) => {
      if (cancelled) return;
      if (t0 === null) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur);
      rotation.current = from + (to - from) * (1 - Math.pow(1 - k, 4));
      draw();
      if (k < 1) raf = requestAnimationFrame(step);
      else onDone && onDone();
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTo]);

  return (
    <div className="wheel-box">
      <div className="pointer" aria-hidden="true" />
      <canvas ref={canvasRef} width="760" height="760" aria-label="Ruleta" />
    </div>
  );
}
