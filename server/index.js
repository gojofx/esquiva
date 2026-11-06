// Servidor de la Ruleta de Asientos: sirve la página (dist/) y sincroniza
// la pantalla del profesor con los celulares de los estudiantes por WebSocket.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { createStorage } from "./storage.js";
import { reducer, initialState, DEFAULT_CONFIG, DEFAULT_POINTS, cleanName, sameName, canSubmit, scoreRound, canMove } from "../src/game/engine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Variables de entorno desde .env (si existe), sin dependencias.
const ENV_FILE = path.join(ROOT, ".env");
if (fs.existsSync(ENV_FILE) && typeof process.loadEnvFile === "function") process.loadEnvFile(ENV_FILE);
const DIST = path.join(ROOT, "dist");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- PIN del profesor ---------- */
let PIN = process.env.PROFESOR_PIN;
if (!PIN) {
  const pinFile = path.join(DATA_DIR, "pin.txt");
  if (fs.existsSync(pinFile)) PIN = fs.readFileSync(pinFile, "utf8").trim();
  else {
    PIN = String(crypto.randomInt(100000, 1000000));
    fs.writeFileSync(pinFile, PIN + "\n", { mode: 0o600 });
  }
}
const pinOk = (p) => {
  const a = Buffer.from(String(p || "")), b = Buffer.from(PIN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ---------- Estado persistente ---------- */
const storage = await createStorage(DATA_DIR);
let state = initialState;
let tokens = new Map(); // token -> playerId
const saved = await storage.load();
if (saved && saved.state) {
  const config = { ...DEFAULT_CONFIG, ...saved.state.config, pts: { ...DEFAULT_POINTS, ...saved.state.config?.pts } };
  state = { ...initialState, ...saved.state, config };
  tokens = new Map(saved.tokens || []);
  console.log(`Partida recuperada (fase: ${state.phase}).`);
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.save({ state, tokens: [...tokens] }), 150);
}
async function flushAndExit() {
  clearTimeout(saveTimer);
  await storage.save({ state, tokens: [...tokens] });
  await storage.flush();
  process.exit(0);
}
process.on("SIGINT", flushAndExit);
process.on("SIGTERM", flushAndExit);

/* ---------- Vistas ---------- */
const sockets = new Set(); // ws con ws.role = "teacher" | "student", ws.playerId
let claims = []; // solicitudes para recuperar un nombre desde otro dispositivo

function online() {
  const ids = new Set();
  for (const ws of sockets) if (ws.role === "student" && ws.playerId) ids.add(ws.playerId);
  return [...ids];
}

function teacherPayload() {
  return {
    t: "state",
    state,
    serverNow: Date.now(),
    online: online(),
    linked: [...new Set(tokens.values())],
    claims: claims.map(({ id, playerId, name }) => ({ id, playerId, name })),
  };
}

// Lo que ve un estudiante. Nunca incluye el asiento elegido antes del giro ni las respuestas de los demás.
function studentView(playerId) {
  const s = state;
  const me = s.players.find((p) => p.id === playerId) || null;
  const base = {
    phase: s.phase,
    serverNow: Date.now(),
    roundNo: s.roundNo,
    rounds: s.config.rounds,
    seconds: s.config.seconds,
    pts: s.config.pts,
    swapLimit: s.config.swapLimit,
    me,
    count: s.players.length,
  };
  if (!me) return base;
  if (s.phase === "lobby") {
    base.classSeats = s.config.classSeats;
    base.taken = s.players.filter((p) => p.seat && p.id !== me.id).map((p) => ({ seat: p.seat, name: p.name }));
  }

  const ranked = [...s.players].sort((a, b) => b.score - a.score || a.id - b.id);
  base.position = ranked.findIndex((p) => p.id === me.id) + 1;

  if (s.round) {
    const revealed = s.phase === "scoring";
    const c = s.round.clue;
    base.clue = revealed ? c : { kind: c.kind, text: c.text, level: c.level };
    base.endsAt = s.round.endsAt;
    base.swapsLeft = Math.max(0, s.config.swapLimit - (s.round.swaps[me.id] || 0));
    if (s.phase === "ready" || s.phase === "timing") {
      const byId = (id) => s.players.find((p) => p.id === id);
      base.seatMap = s.players
        .filter((p) => p.id !== me.id)
        .map((p) => ({ seat: p.seat, name: p.name, out: p.out, free: canMove(s, p) }))
        .sort((a, b) => a.seat - b.seat);
      const mine = s.round.moves.find((m) => m.from === me.id);
      if (mine) base.outgoing = { seat: byId(mine.to).seat, name: byId(mine.to).name };
      base.incoming = s.round.moves
        .filter((m) => m.to === me.id)
        .map((m) => ({ id: m.id, seat: byId(m.from).seat, name: byId(m.from).name }));
    }
    const sub = s.round.subs?.[me.id];
    if (sub) {
      const declared = Object.entries(s.round.subs)
        .filter(([, x]) => x.first)
        .sort((a, b) => a[1].at - b[1].at)
        .map(([id]) => Number(id));
      base.mySub = { ...sub, firstPos: sub.first ? declared.indexOf(me.id) + 1 : 0 };
    }
    if (revealed) {
      const r = scoreRound(s).find((x) => x.id === me.id);
      base.preview = r && { answer: r.answer, delta: r.delta, parts: r.parts, score: r.after.score, event: r.event };
    }
  }
  const last = s.log[s.log.length - 1];
  if (last && (s.phase === "idle" || s.phase === "finished")) {
    const r = last.results.find((x) => x.id === me.id);
    base.last = { roundNo: last.roundNo, clue: last.clue, result: r || null };
  }
  if (s.phase === "finished") {
    base.ranking = ranked.map((p) => ({ name: p.name, score: p.score, out: p.out, me: p.id === me.id }));
    base.winner = s.winnerId ? s.players.find((p) => p.id === s.winnerId)?.name : null;
  }
  return base;
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast() {
  const tp = JSON.stringify(teacherPayload());
  for (const ws of sockets) {
    if (ws.role === "teacher") ws.readyState === 1 && ws.send(tp);
    else if (ws.role === "student") send(ws, { t: "view", view: ws.playerId ? studentView(ws.playerId) : null });
  }
}

/* ---------- Cambios de estado ---------- */
let closeTimer = null;
function apply(action) {
  const before = state;
  if (action.type === "OPEN_LOBBY") action = { ...action, gameId: crypto.randomUUID() };
  state = reducer(state, action);
  if (state === before) return false;
  // Cada vez que una partida llega al final (o cambia el ganador) se guarda en el historial.
  if (state.phase === "finished" && (before.phase !== "finished" || before.winnerId !== state.winnerId)) storage.archive(state);

  // Si se borró la partida o un jugador, se invalidan sus enlaces.
  const ids = new Set(state.players.map((p) => p.id));
  for (const [tok, id] of tokens) if (!ids.has(id)) tokens.delete(tok);
  claims = claims.filter((c) => ids.has(c.playerId));
  for (const ws of sockets) if (ws.role === "student" && ws.playerId && !ids.has(ws.playerId)) ws.playerId = null;

  // El servidor cierra la ronda al acabar el tiempo, aunque no haya ninguna pantalla de profesor abierta.
  clearTimeout(closeTimer);
  if (state.phase === "timing" && state.round?.endsAt) {
    closeTimer = setTimeout(() => apply({ type: "CLOSE" }), Math.max(0, state.round.endsAt - Date.now()) + 300);
  }
  save();
  broadcast();
  return true;
}
if (state.phase === "timing") apply({ type: "CLOSE" });

const TEACHER_ACTIONS = new Set([
  "OPEN_LOBBY", "SET_CONFIG", "ADD_MANUAL", "SET_SEAT", "REMOVE_PLAYER", "START_GAME", "RESET", "CYCLE_WEIGHT",
  "NEW_ROUND", "REROLL_CLUE", "SET_LEVEL", "START_TIMER", "CLOSE", "SWAP", "SPIN", "SPIN_DONE", "SET_ANSWER", "TOGGLE_FIRST",
  "APPLY", "UNDO", "FINISH_NOW", "TIEBREAK", "TIEBREAK_SOLVE", "SET_WINNER",
]);

function newToken(playerId) {
  for (const [tok, id] of tokens) if (id === playerId) tokens.delete(tok);
  const tok = crypto.randomBytes(18).toString("base64url");
  tokens.set(tok, playerId);
  return tok;
}

function link(ws, playerId) {
  ws.playerId = playerId;
  send(ws, { t: "token", token: newToken(playerId) });
  save();
  broadcast();
}

function onStudentRegister(ws, rawName) {
  const name = cleanName(rawName);
  if (name.length < 2) return send(ws, { t: "error", msg: "Escribe tu nombre (mínimo 2 letras)." });
  if (state.phase === "setup") return send(ws, { t: "error", msg: "El profesor todavía no ha abierto las inscripciones." });
  const existing = state.players.find((p) => sameName(p.name, name));
  if (existing) {
    const hasDevice = [...tokens.values()].includes(existing.id);
    if (!hasDevice && state.phase === "lobby") return link(ws, existing.id); // nombre que el profesor agregó a mano
    if (claims.some((c) => c.ws === ws)) return;
    claims.push({ id: crypto.randomUUID(), playerId: existing.id, name: existing.name, ws });
    send(ws, { t: "pending", msg: `Ya hay alguien inscrito como "${existing.name}". Si eres tú, el profesor debe aprobar este dispositivo.` });
    return broadcast();
  }
  if (state.phase !== "lobby") return send(ws, { t: "error", msg: "La partida ya empezó: pídele al profesor que te inscriba en la próxima." });
  if (state.players.length >= 60) return send(ws, { t: "error", msg: "La partida está llena." });
  apply({ type: "REGISTER", name });
  const p = state.players.find((x) => sameName(x.name, name));
  if (p) link(ws, p.id);
}

function onSubmit(ws, msg) {
  if (!ws.playerId) return;
  const now = Date.now();
  if (!canSubmit(state, now)) return send(ws, { t: "error", msg: "Ya se cerraron las respuestas de esta ronda." });
  if (state.round.subs[ws.playerId]) return send(ws, { t: "error", msg: "Ya enviaste tu respuesta: no se puede cambiar." });
  const kind = state.round.clue.kind;
  const mode = ["answer", "list", "bet", "blank"].includes(msg.mode) ? msg.mode : null;
  if (!mode || (kind === "exact" && !["answer", "blank"].includes(mode)) || (kind === "reduce" && mode === "answer")) return;
  let nums = [];
  if (mode !== "blank") {
    nums = (Array.isArray(msg.nums) ? msg.nums : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 999);
    nums = [...new Set(nums)].slice(0, 60);
    if (!nums.length) return send(ws, { t: "error", msg: "Escribe al menos un número." });
    if ((mode === "answer" || mode === "bet") && nums.length !== 1) return send(ws, { t: "error", msg: "Escribe un solo número." });
  }
  apply({ type: "SUBMIT", id: ws.playerId, mode, nums, first: !!msg.first, at: now });
}

function onMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (!msg || typeof msg !== "object") return;

  if (msg.t === "hello") {
    if (msg.role === "teacher") {
      if (!pinOk(msg.pin)) return send(ws, { t: "auth-fail" });
      ws.role = "teacher";
      send(ws, { t: "auth-ok" });
      return send(ws, teacherPayload());
    }
    ws.role = "student";
    const id = tokens.get(String(msg.token || ""));
    ws.playerId = id && state.players.some((p) => p.id === id) ? id : null;
    if (!ws.playerId && msg.token) send(ws, { t: "token", token: null });
    send(ws, { t: "view", view: ws.playerId ? studentView(ws.playerId) : null, phase: state.phase });
    return broadcast();
  }

  if (ws.role === "teacher") {
    if (msg.t === "action" && msg.action && TEACHER_ACTIONS.has(msg.action.type)) apply(msg.action);
    if (msg.t === "claim") {
      const c = claims.find((x) => x.id === msg.id);
      if (!c) return;
      claims = claims.filter((x) => x !== c);
      if (msg.accept && c.ws.readyState === 1) {
        for (const other of sockets) if (other.playerId === c.playerId && other !== c.ws) other.playerId = null;
        link(c.ws, c.playerId);
      } else {
        send(c.ws, { t: "error", msg: "El profesor no aprobó este dispositivo." });
        broadcast();
      }
    }
    return;
  }

  if (ws.role === "student") {
    if (msg.t === "register" && !ws.playerId) onStudentRegister(ws, msg.name);
    if (msg.t === "submit") onSubmit(ws, msg);
    if (!ws.playerId) return;
    if (msg.t === "seat") {
      if (state.phase !== "lobby") return;
      if (!apply({ type: "SET_SEAT", id: ws.playerId, seat: msg.seat }))
        send(ws, { t: "error", msg: "Ese asiento ya lo eligió otra persona." });
    }
    if (msg.t === "move-request") {
      const ok = apply({ type: "MOVE_REQUEST", from: ws.playerId, toSeat: msg.seat, reqId: crypto.randomUUID(), at: Date.now() });
      if (!ok) send(ws, { t: "error", msg: "No se puede pedir ese cambio (tiempo cerrado o sin intercambios disponibles)." });
    }
    if (msg.t === "move-cancel") apply({ type: "MOVE_CANCEL", from: ws.playerId });
    if (msg.t === "move-answer") {
      const ok = apply({ type: "MOVE_ANSWER", to: ws.playerId, reqId: String(msg.id || ""), accept: !!msg.accept });
      if (!ok) send(ws, { t: "error", msg: "Esa solicitud ya no está disponible." });
    }
  }
}

/* ---------- HTTP estático ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // Un archivo que no existe (p. ej. un JS de una compilación anterior) es 404:
    // devolver la página en su lugar provoca "Expected a JavaScript module script… MIME type text/html".
    if (path.extname(url.pathname) || url.pathname.includes("/assets/")) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" }).end("No encontrado");
      return;
    }
    file = path.join(DIST, "index.html"); // rutas de la app: /, /profesor
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Falta compilar: ejecuta npm run build");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(buf);
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
server.on("upgrade", (req, socket, head) => {
  if (!new URL(req.url, "http://x").pathname.endsWith("/ws")) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
});
wss.on("connection", (ws) => {
  ws.isAlive = true;
  sockets.add(ws);
  ws.on("pong", () => (ws.isAlive = true));
  ws.on("message", (raw) => onMessage(ws, raw.toString()));
  ws.on("close", () => {
    sockets.delete(ws);
    claims = claims.filter((c) => c.ws !== ws);
    broadcast();
  });
});
setInterval(() => {
  for (const ws of sockets) {
    if (!ws.isAlive) ws.terminate();
    else {
      ws.isAlive = false;
      ws.ping();
    }
  }
}, 20000);

server.listen(PORT, HOST, () => {
  console.log(`Ruleta de Asientos en http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`  Estudiantes: /            Profesor: /profesor`);
  console.log(`  Datos: ${storage.describe}`);
  console.log(`  PIN del profesor: ${PIN}${process.env.PROFESOR_PIN ? " (de PROFESOR_PIN)" : ` (guardado en ${path.join(DATA_DIR, "pin.txt")})`}`);
});
