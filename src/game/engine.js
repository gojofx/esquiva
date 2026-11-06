import { makeClue, exactClue, weightedPick, rnd } from "./clues.js";

export const DEFAULT_POINTS = {
  start: 10,
  exact: 2,
  list: 4,
  bet: 6,
  first: 2,
  firstFail: 2,
  wrong: 1,
  hit: 3,
  returnScore: 5,
  returnHits: 3,
};

export const DEFAULT_CONFIG = {
  rounds: 8,
  seconds: 45,
  swapLimit: 1,
  clueType: "mix",
  level: 2,
  lowPolicy: "reintegrate",
  pts: DEFAULT_POINTS,
};

export const ANSWERS = {
  exact: [
    { id: "correct", label: "Acertó" },
    { id: "wrong", label: "Se equivocó" },
    { id: "blank", label: "En blanco" },
  ],
  reduce: [
    { id: "list", label: "Lista exacta" },
    { id: "bet", label: "Apuesta acertada" },
    { id: "wrong", label: "Se equivocó" },
    { id: "blank", label: "En blanco" },
  ],
};

export const initialState = {
  config: DEFAULT_CONFIG,
  players: [],
  weights: {},
  seatCount: 0,
  roundNo: 0,
  phase: "setup", // setup | idle | ready | timing | closed | spinning | scoring | finished
  round: null,
  log: [],
  prev: null,
  endReason: null,
  tiebreak: null,
  winnerId: null,
};

export const activePlayers = (s) => s.players.filter((p) => !p.out);
export const activeSeats = (s) =>
  activePlayers(s)
    .map((p) => p.seat)
    .sort((a, b) => a - b);

function correctValue(kind, answer, pts) {
  if (kind === "exact") return answer === "correct" ? pts.exact : null;
  if (answer === "list") return pts.list;
  if (answer === "bet") return pts.bet;
  return null;
}

// Calcula el resultado de la ronda sin modificar el estado (se usa también para la vista previa).
export function scoreRound(s) {
  const { pts } = s.config;
  const { clue, answers, first } = s.round;
  const target = clue.target;
  const ans = (p) => answers[p.id] || "blank";
  const isCorrect = (p) => correctValue(clue.kind, ans(p), pts) !== null;

  const firstCorrectId = first.find((id) => {
    const p = s.players.find((x) => x.id === id);
    return p && !p.out && isCorrect(p);
  });

  return s.players.map((p) => {
    const a = ans(p);
    const declared = first.includes(p.id);
    const parts = [];
    let after = { ...p };

    if (p.out) {
      if (isCorrect(p)) {
        const hits = p.outHits + 1;
        if (hits >= pts.returnHits) {
          after = { ...p, out: false, outHits: 0, score: pts.returnScore };
          parts.push({ txt: `${hits}° acierto: vuelve con ${pts.returnScore}`, v: 0 });
          return { id: p.id, answer: a, declared, parts, delta: 0, before: p, after, event: "vuelve" };
        }
        after = { ...p, outHits: hits };
        parts.push({ txt: `acierto ${hits} de ${pts.returnHits} para volver`, v: 0 });
      } else if (a === "wrong") {
        parts.push({ txt: "error (fuera: no resta)", v: 0 });
      }
      return { id: p.id, answer: a, declared, parts, delta: 0, before: p, after, event: null };
    }

    const hit = p.seat === target;
    const value = correctValue(clue.kind, a, pts);
    if (value !== null) parts.push(hit ? { txt: "acierto anulado (le cayó)", v: 0 } : { txt: "acierto", v: value });
    if (a === "wrong") parts.push({ txt: "error", v: -pts.wrong });
    if (declared) {
      if (p.id === firstCorrectId && !hit) parts.push({ txt: "bono primero", v: pts.first });
      else if (a === "wrong") parts.push({ txt: "se declaró primero y falló", v: -pts.firstFail });
      else if (p.id === firstCorrectId && hit) parts.push({ txt: "bono anulado (le cayó)", v: 0 });
    }
    if (hit) parts.push({ txt: "la ruleta cayó en su asiento", v: -pts.hit });

    const delta = parts.reduce((t, x) => t + x.v, 0);
    const score = p.score + delta;
    const out = score < 0;
    after = { ...p, score, out, outHits: 0 };
    return { id: p.id, answer: a, declared, parts, delta, before: p, after, event: out ? "fuera" : hit ? "cayó" : null };
  });
}

function strip(s) {
  const { prev, ...rest } = s;
  return rest;
}

function checkLow(s, log) {
  if (activePlayers(s).length >= 3) return s;
  if (s.config.lowPolicy === "end") return { ...s, phase: "finished", endReason: "low" };
  const back = s.players.filter((p) => p.out).map((p) => p.name);
  log.notes.push(`Quedaban menos de 3 asientos activos: vuelven ${back.join(", ")} con ${s.config.pts.returnScore} puntos.`);
  return {
    ...s,
    players: s.players.map((p) => (p.out ? { ...p, out: false, outHits: 0, score: s.config.pts.returnScore } : p)),
  };
}

export function reducer(s, action) {
  switch (action.type) {
    case "NEW_GAME": {
      const { config, names } = action;
      const players = names.map((name, i) => ({
        id: i + 1,
        name,
        seat: i + 1,
        score: config.pts.start,
        out: false,
        outHits: 0,
      }));
      const weights = {};
      players.forEach((p) => (weights[p.seat] = 1));
      return { ...initialState, config, players, weights, seatCount: players.length, phase: "idle" };
    }
    case "RESET":
      return { ...initialState, config: s.config };
    case "CYCLE_WEIGHT": {
      if (s.phase !== "idle") return s;
      const w = s.weights[action.seat] || 1;
      return { ...s, weights: { ...s.weights, [action.seat]: (w % 3) + 1 } };
    }
    case "NEW_ROUND": {
      if (s.phase !== "idle") return s;
      const seats = activeSeats(s);
      if (seats.length < 2) return s;
      const target = weightedPick(seats, (n) => s.weights[n] || 1);
      const clue = makeClue(target, seats, s.config.clueType, s.config.level);
      return { ...s, phase: "ready", round: { clue, swaps: {}, answers: {}, first: [], endsAt: null } };
    }
    case "REROLL_CLUE": {
      if (s.phase !== "ready") return s;
      const seats = activeSeats(s);
      const clue = makeClue(s.round.clue.target, seats, s.config.clueType, s.config.level);
      return { ...s, round: { ...s.round, clue } };
    }
    case "START_TIMER":
      if (s.phase !== "ready") return s;
      return { ...s, phase: "timing", round: { ...s.round, endsAt: Date.now() + s.config.seconds * 1000 } };
    case "CLOSE":
      if (s.phase !== "timing" && s.phase !== "ready") return s;
      return { ...s, phase: "closed" };
    case "SWAP": {
      // Rota a los ocupantes: el de seats[0] pasa a seats[1], ..., el último pasa a seats[0].
      if (s.phase !== "ready" && s.phase !== "timing") return s;
      const seats = action.seats;
      const occ = seats.map((n) => s.players.find((p) => p.seat === n));
      if (occ.some((p) => !p || p.out || (s.round.swaps[p.id] || 0) >= s.config.swapLimit)) return s;
      const moveTo = {};
      occ.forEach((p, i) => (moveTo[p.id] = seats[(i + 1) % seats.length]));
      const swaps = { ...s.round.swaps };
      occ.forEach((p) => (swaps[p.id] = (swaps[p.id] || 0) + 1));
      return {
        ...s,
        players: s.players.map((p) => (moveTo[p.id] ? { ...p, seat: moveTo[p.id] } : p)),
        round: { ...s.round, swaps },
      };
    }
    case "SPIN":
      if (!["ready", "timing", "closed"].includes(s.phase)) return s;
      return { ...s, phase: "spinning" };
    case "SPIN_DONE":
      if (s.phase !== "spinning") return s;
      return { ...s, phase: "scoring" };
    case "SET_ANSWER":
      if (s.phase !== "scoring") return s;
      return { ...s, round: { ...s.round, answers: { ...s.round.answers, [action.id]: action.answer } } };
    case "TOGGLE_FIRST": {
      if (s.phase !== "scoring") return s;
      const f = s.round.first;
      const first = f.includes(action.id) ? f.filter((x) => x !== action.id) : [...f, action.id];
      return { ...s, round: { ...s.round, first } };
    }
    case "APPLY": {
      if (s.phase !== "scoring") return s;
      const results = scoreRound(s);
      const roundNo = s.roundNo + 1;
      const entry = {
        roundNo,
        clue: s.round.clue,
        results: results.map((r) => ({
          id: r.id,
          answer: r.answer,
          declared: r.declared,
          delta: r.delta,
          score: r.after.score,
          event: r.event,
          parts: r.parts,
        })),
        notes: [],
      };
      let next = {
        ...s,
        players: results.map((r) => r.after),
        roundNo,
        round: null,
        phase: "idle",
        prev: strip(s),
      };
      next = checkLow(next, entry);
      if (next.phase !== "finished" && roundNo >= s.config.rounds) next = { ...next, phase: "finished", endReason: "rounds" };
      return { ...next, log: [...s.log, entry] };
    }
    case "UNDO":
      if (!s.prev) return s;
      return { ...s.prev, prev: null };
    case "FINISH_NOW":
      if (s.phase !== "idle") return s;
      return { ...s, phase: "finished", endReason: "manual", prev: strip(s) };
    case "TIEBREAK": {
      const n = rnd(1, s.seatCount);
      return { ...s, tiebreak: { clue: exactClue(n, s.config.level), tied: action.tied, showSolve: false } };
    }
    case "TIEBREAK_SOLVE":
      return s.tiebreak ? { ...s, tiebreak: { ...s.tiebreak, showSolve: true } } : s;
    case "SET_WINNER":
      return { ...s, winnerId: action.id };
    case "LOAD":
      return action.state;
    default:
      return s;
  }
}

export function ranking(players) {
  return [...players].sort((a, b) => b.score - a.score || a.id - b.id);
}
