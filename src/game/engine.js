import { makeClue, exactClue, weightedPick, rnd, LEVELS } from "./clues.js";

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
  classSeats: 40,
  rounds: 8,
  seconds: 45,
  swapLimit: 1,
  clueType: "mix",
  level: 2,
  lowPolicy: "reintegrate",
  // Vigilancia del celular: "game" toda la partida, "rounds" solo con pista en pantalla, "off" desactivada.
  watch: "game",
  graceSec: 5, // segundos fuera de la página antes de cancelar
  pts: DEFAULT_POINTS,
};

// Fases en las que salir de la página cancela la participación.
export const WATCH_PHASES = {
  game: ["idle", "ready", "timing", "closed", "spinning", "scoring"],
  rounds: ["ready", "timing"],
  off: [],
};
export const watchActive = (s) => (WATCH_PHASES[s.config.watch] || []).includes(s.phase);

export const WITHDRAW_REASONS = {
  hidden: "salió de la página (cambió de aplicación o pestaña, minimizó o bloqueó la pantalla)",
  blur: "la página perdió el foco (usó otra aplicación o ventana)",
  split: "usó pantalla dividida o ventana flotante",
  closed: "cerró o recargó la página",
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
  phase: "setup", // setup | lobby | idle | ready | timing | closed | spinning | scoring | finished
  nextId: 1,
  round: null,
  log: [],
  prev: null,
  endReason: null,
  tiebreak: null,
  winnerId: null,
  incidents: [], // salidas de la página detectadas: { id, playerId, reason, at, roundNo, resolved }
};

export const activePlayers = (s) => s.players.filter((p) => !p.out && !p.withdrawn);
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
    return p && !p.out && !p.withdrawn && isCorrect(p);
  });

  return s.players.map((p) => {
    const a = ans(p);
    const declared = first.includes(p.id);
    const parts = [];
    let after = { ...p };

    if (p.withdrawn) {
      parts.push({ txt: "participación cancelada", v: 0 });
      return { id: p.id, answer: "blank", declared: false, parts, delta: 0, before: p, after, event: null };
    }

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

export const MAX_NAME = 30;
export const cleanName = (n) =>
  String(n || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
export const sameName = (a, b) => a.toLocaleLowerCase("es") === b.toLocaleLowerCase("es");

// Califica lo que envió un estudiante desde su celular.
export function grade(clue, sub) {
  if (!sub || sub.mode === "blank") return "blank";
  const nums = sub.nums || [];
  if (clue.kind === "exact") return nums.length === 1 && nums[0] === clue.target ? "correct" : "wrong";
  if (sub.mode === "bet") return nums.length === 1 && nums[0] === clue.target ? "bet" : "wrong";
  const got = [...new Set(nums)].sort((a, b) => a - b);
  const want = [...clue.cands].sort((a, b) => a - b);
  return got.length === want.length && got.every((n, i) => n === want[i]) ? "list" : "wrong";
}

export const canSubmit = (s, now = Date.now()) =>
  (s.phase === "ready" || s.phase === "timing") && !!s.round && (!s.round.endsAt || now <= s.round.endsAt + 500);

const swapOpen = (s) => (s.phase === "ready" || s.phase === "timing") && !!s.round;
export const canMove = (s, p) => !!p && !p.out && !p.withdrawn && (s.round.swaps[p.id] || 0) < s.config.swapLimit;
// Asientos de la ruleta de esta ronda (fijos desde que se eligió el asiento, aunque alguien se retire).
export const roundSeats = (s) => (s.round && s.round.wheel ? s.round.wheel.map((w) => w.n) : activeSeats(s));

// Rota a los ocupantes: el de seats[0] pasa a seats[1], ..., el último pasa a seats[0].
function doSwap(s, seats) {
  if (!swapOpen(s) || !Array.isArray(seats) || seats.length < 2 || new Set(seats).size !== seats.length) return s;
  const occ = seats.map((n) => s.players.find((p) => p.seat === n));
  if (occ.some((p) => !canMove(s, p))) return s;
  const moveTo = {};
  occ.forEach((p, i) => (moveTo[p.id] = seats[(i + 1) % seats.length]));
  const swaps = { ...s.round.swaps };
  occ.forEach((p) => (swaps[p.id] = (swaps[p.id] || 0) + 1));
  // Las solicitudes de quienes ya se movieron dejan de valer.
  const moves = (s.round.moves || []).filter((m) => !moveTo[m.from] && !moveTo[m.to]);
  return {
    ...s,
    players: s.players.map((p) => (moveTo[p.id] ? { ...p, seat: moveTo[p.id] } : p)),
    round: { ...s.round, swaps, moves },
  };
}

function strip(s) {
  const { prev, ...rest } = s;
  return rest;
}

function checkLow(s, log) {
  if (activePlayers(s).length >= 3) return s;
  if (s.config.lowPolicy === "end") return { ...s, phase: "finished", endReason: "low" };
  const back = s.players.filter((p) => p.out && !p.withdrawn).map((p) => p.name);
  log.notes.push(`Quedaban menos de 3 asientos activos: vuelven ${back.join(", ")} con ${s.config.pts.returnScore} puntos.`);
  return {
    ...s,
    players: s.players.map((p) => (p.out ? { ...p, out: false, outHits: 0, score: s.config.pts.returnScore } : p)),
  };
}

export function reducer(s, action) {
  switch (action.type) {
    case "OPEN_LOBBY":
      if (s.phase !== "setup") return s;
      return { ...initialState, config: action.config, phase: "lobby", gameId: action.gameId || null };
    case "SET_CONFIG": {
      if (s.phase !== "lobby") return s;
      const c = action.config;
      const players = s.players.map((p) => ({ ...p, score: c.pts.start, seat: p.seat && p.seat <= c.classSeats ? p.seat : null }));
      return { ...s, config: c, players };
    }
    case "REGISTER":
    case "ADD_MANUAL": {
      if (s.phase !== "lobby" || s.players.length >= 60) return s;
      const name = cleanName(action.name);
      if (!name || s.players.some((p) => sameName(p.name, name))) return s;
      const p = { id: s.nextId, name, seat: null, score: s.config.pts.start, out: false, outHits: 0 };
      return { ...s, nextId: s.nextId + 1, players: [...s.players, p] };
    }
    case "SET_SEAT": {
      // En la inscripción: el estudiante (o el profesor) elige el asiento donde está sentado.
      if (s.phase !== "lobby") return s;
      const seat = action.seat == null ? null : Number(action.seat);
      if (seat !== null && (!Number.isInteger(seat) || seat < 1 || seat > s.config.classSeats)) return s;
      if (seat !== null && s.players.some((p) => p.seat === seat && p.id !== action.id)) return s;
      if (!s.players.some((p) => p.id === action.id)) return s;
      return { ...s, players: s.players.map((p) => (p.id === action.id ? { ...p, seat } : p)) };
    }
    case "REMOVE_PLAYER":
      if (s.phase !== "lobby") return s;
      return { ...s, players: s.players.filter((p) => p.id !== action.id) };
    case "START_GAME": {
      if (s.phase !== "lobby" || s.players.length < 4 || s.players.some((p) => !p.seat)) return s;
      const players = s.players.map((p) => ({ ...p, score: s.config.pts.start, out: false, outHits: 0, withdrawn: null }));
      const weights = {};
      players.forEach((p) => (weights[p.seat] = 1));
      return { ...s, players, weights, seatCount: Math.max(...players.map((p) => p.seat)), phase: "idle" };
    }
    case "WITHDRAW": {
      // El celular del estudiante salió de la página: se cancela su participación de inmediato.
      const p = s.players.find((x) => x.id === action.id);
      if (!p || p.withdrawn || !watchActive(s)) return s;
      const reason = WITHDRAW_REASONS[action.reason] ? action.reason : "hidden";
      const withdrawn = { reason, at: action.at, roundNo: s.roundNo + (s.round ? 1 : 0) };
      let round = s.round;
      if (round) {
        const { [p.id]: _a, ...answers } = round.answers;
        const { [p.id]: _s, ...subs } = round.subs || {};
        round = {
          ...round,
          answers,
          subs,
          first: round.first.filter((id) => id !== p.id),
          moves: (round.moves || []).filter((m) => m.from !== p.id && m.to !== p.id),
        };
      }
      const incident = { id: action.incidentId, playerId: p.id, name: p.name, reason, at: action.at, roundNo: withdrawn.roundNo, resolved: false };
      return {
        ...s,
        round,
        players: s.players.map((x) => (x.id === p.id ? { ...x, withdrawn } : x)),
        incidents: [...(s.incidents || []), incident],
      };
    }
    case "REINSTATE": {
      // El profesor readmite a quien salió por error (llamada, notificación, etc.).
      const p = s.players.find((x) => x.id === action.id);
      if (!p || !p.withdrawn) return s;
      return {
        ...s,
        players: s.players.map((x) => (x.id === p.id ? { ...x, withdrawn: null } : x)),
        incidents: (s.incidents || []).map((i) => (i.playerId === p.id && !i.resolved ? { ...i, resolved: "readmitido" } : i)),
      };
    }
    case "DISMISS_INCIDENT":
      return {
        ...s,
        incidents: (s.incidents || []).map((i) => (i.id === action.incidentId && !i.resolved ? { ...i, resolved: "confirmado" } : i)),
      };
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
      const wheel = seats.map((n) => ({ n, weight: s.weights[n] || 1 }));
      return { ...s, phase: "ready", round: { clue, wheel, swaps: {}, answers: {}, first: [], subs: {}, moves: [], endsAt: null } };
    }
    case "SET_LEVEL": {
      // La dificultad se puede cambiar en medio de la partida: entre rondas, o con la pista
      // ya en pantalla mientras no haya empezado el tiempo (se regenera para el mismo asiento).
      const level = Number(action.level);
      if (!LEVELS[level] || level === s.config.level) return s;
      if (!["lobby", "idle", "ready"].includes(s.phase)) return s;
      const next = { ...s, config: { ...s.config, level } };
      if (s.phase !== "ready") return next;
      const clue = makeClue(s.round.clue.target, roundSeats(s), s.config.clueType, level);
      return { ...next, round: { ...s.round, clue } };
    }
    case "REROLL_CLUE": {
      if (s.phase !== "ready") return s;
      const clue = makeClue(s.round.clue.target, roundSeats(s), s.config.clueType, s.config.level);
      return { ...s, round: { ...s.round, clue } };
    }
    case "START_TIMER":
      if (s.phase !== "ready") return s;
      return { ...s, phase: "timing", round: { ...s.round, endsAt: Date.now() + s.config.seconds * 1000 } };
    case "CLOSE":
      if (s.phase !== "timing" && s.phase !== "ready") return s;
      return { ...s, phase: "closed", round: { ...s.round, moves: [] } };
    case "SWAP":
      return doSwap(s, action.seats);
    case "MOVE_REQUEST": {
      // Un estudiante pide pasarse al asiento de un compañero; el compañero debe aceptar.
      if (!swapOpen(s)) return s;
      const from = s.players.find((p) => p.id === action.from);
      const to = s.players.find((p) => p.seat === Number(action.toSeat));
      if (!from || !to || from.id === to.id || !canMove(s, from) || !canMove(s, to)) return s;
      const moves = s.round.moves.filter((m) => m.from !== from.id);
      moves.push({ id: action.reqId, from: from.id, to: to.id, at: action.at });
      return { ...s, round: { ...s.round, moves } };
    }
    case "MOVE_CANCEL":
      if (!swapOpen(s)) return s;
      return { ...s, round: { ...s.round, moves: s.round.moves.filter((m) => m.from !== action.from) } };
    case "MOVE_ANSWER": {
      if (!swapOpen(s)) return s;
      const m = s.round.moves.find((x) => x.id === action.reqId && x.to === action.to);
      if (!m) return s;
      const rest = { ...s, round: { ...s.round, moves: s.round.moves.filter((x) => x !== m) } };
      if (!action.accept) return rest;
      const a = s.players.find((p) => p.id === m.from), b = s.players.find((p) => p.id === m.to);
      return doSwap(rest, [a.seat, b.seat]);
    }
    case "SPIN":
      if (!["ready", "timing", "closed"].includes(s.phase)) return s;
      return { ...s, phase: "spinning", round: { ...s.round, moves: [] } };
    case "SUBMIT": {
      // Lo genera el servidor a partir del mensaje de un celular.
      if (!canSubmit(s, action.at)) return s;
      const p = s.players.find((x) => x.id === action.id);
      if (!p || p.withdrawn || s.round.subs[p.id]) return s;
      const sub = { mode: action.mode, nums: action.nums, first: action.first && action.mode !== "blank", at: action.at };
      return { ...s, round: { ...s.round, subs: { ...s.round.subs, [p.id]: sub } } };
    }
    case "SPIN_DONE": {
      if (s.phase !== "spinning") return s;
      // Precarga las respuestas y el orden de "¡Primero!" con lo que enviaron los celulares.
      const subs = s.round.subs || {};
      const answers = { ...s.round.answers };
      Object.entries(subs).forEach(([id, sub]) => (answers[id] = grade(s.round.clue, sub)));
      const declared = Object.entries(subs)
        .filter(([, sub]) => sub.first)
        .sort((a, b) => a[1].at - b[1].at)
        .map(([id]) => Number(id));
      const first = [...declared, ...s.round.first.filter((id) => !declared.includes(id))];
      return { ...s, phase: "scoring", round: { ...s.round, answers, first } };
    }
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
    default:
      return s;
  }
}

export function ranking(players) {
  return [...players].sort((a, b) => b.score - a.score || a.id - b.id);
}
