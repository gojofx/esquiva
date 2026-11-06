// Generador de pistas. El texto usa {llaves} para marcar lo que se resalta.

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Cada generador devuelve { txt, sol, eq } para un valor t, o null si no aplica.
const GENS = {
  add: (t) => {
    if (t < 2) return null;
    const a = rnd(1, t - 1);
    return { txt: `${a} + ${t - a}`, sol: `${a} + ${t - a} = ${t}` };
  },
  sub: (t) => {
    const b = rnd(1, 15);
    return { txt: `${t + b} − ${b}`, sol: `${t + b} − ${b} = ${t}` };
  },
  mul: (t) => {
    const ds = [];
    for (let d = 2; d <= 9; d++) if (t % d === 0 && t / d >= 2 && t / d <= 12) ds.push(d);
    if (!ds.length) return null;
    const d = pick(ds);
    return { txt: `${d} × ${t / d}`, sol: `${d} × ${t / d} = ${t}` };
  },
  div: (t) => {
    const b = rnd(2, 9);
    return { txt: `${t * b} ÷ ${b}`, sol: `${t * b} ÷ ${b} = ${t}` };
  },
  mulAdd: (t) => {
    const a = rnd(2, 9), b = rnd(2, 9), p = a * b;
    if (p >= t) return null;
    return { txt: `${a} × ${b} + ${t - p}`, sol: `${a} × ${b} = ${p} → ${p} + ${t - p} = ${t}` };
  },
  mulSub: (t) => {
    const a = rnd(2, 9), b = rnd(2, 9), p = a * b;
    if (p <= t || p - t > 25) return null;
    return { txt: `${a} × ${b} − ${p - t}`, sol: `${a} × ${b} = ${p} → ${p} − ${p - t} = ${t}` };
  },
  parenDiv: (t) => {
    const c = rnd(2, 4), sum = t * c;
    const lo = Math.max(1, Math.ceil(sum * 0.3)), hi = Math.min(sum - 1, Math.floor(sum * 0.7));
    if (hi < lo) return null;
    const a = rnd(lo, hi);
    return { txt: `(${a} + ${sum - a}) ÷ ${c}`, sol: `${a} + ${sum - a} = ${sum} → ${sum} ÷ ${c} = ${t}` };
  },
  square: (t) => {
    const a = rnd(2, 7), sq = a * a;
    if (sq > t && sq - t <= 20) return { txt: `${a}² − ${sq - t}`, sol: `${a}² = ${sq} → ${sq} − ${sq - t} = ${t}` };
    if (sq < t) return { txt: `${a}² + ${t - sq}`, sol: `${a}² = ${sq} → ${sq} + ${t - sq} = ${t}` };
    return null;
  },
  eqAdd: (t, v) => {
    const k = rnd(3, 30);
    return { eq: true, txt: `${v} + ${k} = ${t + k}`, sol: `${v} = ${t + k} − ${k} = ${t}` };
  },
  eqMul: (t, v) => {
    const k = rnd(2, 9);
    return { eq: true, txt: `${k}${v} = ${k * t}`, sol: `${v} = ${k * t} ÷ ${k} = ${t}` };
  },
  eqLin: (t, v) => {
    const k = rnd(2, 5), c = rnd(1, 15), m = k * t + c;
    return { eq: true, txt: `${k}${v} + ${c} = ${m}`, sol: `${k}${v} = ${m} − ${c} = ${k * t} → ${v} = ${k * t} ÷ ${k} = ${t}` };
  },
};

export const LEVELS = {
  1: { name: "Nivel 1 · sumas y restas", gens: ["add", "sub"] },
  2: { name: "Nivel 2 · multiplicar y dividir", gens: ["mul", "div", "mul", "div", "add"] },
  3: { name: "Nivel 3 · operaciones combinadas", gens: ["mulAdd", "mulSub", "parenDiv", "square"] },
  4: { name: "Nivel 4 · ecuaciones", gens: ["eqAdd", "eqMul", "eqLin"] },
};

// Una expresión cuyo resultado es t, según el nivel.
export function exprFor(t, level, v = "x") {
  const gens = (LEVELS[level] || LEVELS[1]).gens;
  for (let i = 0; i < 60; i++) {
    const r = GENS[pick(gens)](t, v);
    if (r) return r;
  }
  return GENS.sub(t);
}

// Convierte una expresión en texto de pista: "{6 × 3 − 4}" o "{x}, si {x + 8 = 21}".
const show = (e, v) => (e.eq ? `{${v}}, si {${e.txt}}` : `{${e.txt}}`);

export function exactClue(target, level) {
  const e = exprFor(target, level, "x");
  return {
    kind: "exact",
    target,
    text: `El asiento que cae es ${show(e, "x")}`,
    solve: `${e.sol} · se anota: ${target}`,
    cands: [target],
  };
}

function makeFilters(t, maxN, level) {
  const fs = [];
  fs.push(
    t % 2 === 0
      ? { txt: "es {par}", sol: "pares", test: (n) => n % 2 === 0 }
      : { txt: "es {impar}", sol: "impares", test: (n) => n % 2 === 1 }
  );
  [3, 4, 5].forEach((k) => {
    if (t % k === 0) fs.push({ txt: `es múltiplo de {${k}}`, sol: `múltiplos de ${k}`, test: (n) => n % k === 0 });
  });
  if (t >= 3) {
    const p = rnd(Math.max(2, Math.floor(t / 2)), t - 1);
    const e = exprFor(p, level, "x");
    fs.push({ txt: `es mayor que ${show(e, "x")}`, sol: `${e.sol} → mayores que ${p}`, test: (n) => n > p });
  }
  if (t < maxN - 1) {
    const q = rnd(t + 1, Math.min(maxN, t + Math.max(4, Math.ceil(maxN / 3))));
    const e = exprFor(q, level, "y");
    fs.push({ txt: `es menor que ${show(e, "y")}`, sol: `${e.sol} → menores que ${q}`, test: (n) => n < q });
  }
  return fs;
}

// activeNums: números de asientos que siguen en la ruleta.
export function reduceClue(target, activeNums, level) {
  const maxN = Math.max(...activeNums);
  for (let tries = 0; tries < 300; tries++) {
    const fs = makeFilters(target, maxN, level);
    const chosen = [pick(fs)];
    if (fs.length > 1 && Math.random() < 0.8) {
      const second = pick(fs.filter((f) => f !== chosen[0]));
      chosen.push(second);
    }
    const cands = activeNums.filter((n) => chosen.every((f) => f.test(n)));
    if (cands.length >= 2 && cands.length <= 5 && cands.includes(target)) {
      return {
        kind: "reduce",
        target,
        text: "El asiento " + chosen.map((f) => f.txt).join(" y "),
        solve: chosen.map((f) => f.sol).join(" · ") + " · entre los asientos en juego → " + cands.join(", "),
        cands,
      };
    }
  }
  return null;
}

export function makeClue(target, activeNums, clueType, level) {
  const type = clueType === "mix" ? (Math.random() < 0.45 ? "exact" : "reduce") : clueType;
  return (type === "reduce" && reduceClue(target, activeNums, level)) || exactClue(target, level);
}

export function weightedPick(items, weightOf) {
  const total = items.reduce((t, s) => t + weightOf(s), 0);
  let r = Math.random() * total;
  for (const s of items) {
    r -= weightOf(s);
    if (r < 0) return s;
  }
  return items[items.length - 1];
}

export { rnd };
