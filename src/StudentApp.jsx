import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket, store } from "./net.js";
import { Brand, Logo } from "./components/Icons.jsx";
import ClueText from "./components/ClueText.jsx";
import Rules from "./components/Rules.jsx";
import { DEFAULT_POINTS, WITHDRAW_REASONS } from "./game/engine.js";
import { useLeaveWatch, pendingLeave, looksSplit } from "./watch.js";

const TOKEN_KEY = "ruleta-estudiante-token";
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const cls = (n) => (n > 0 ? "plus" : n < 0 ? "minus" : "zero");
const parseNums = (txt) => (String(txt).match(/\d+/g) || []).map(Number);
const ANSWER_LABEL = { correct: "correcta", list: "lista exacta correcta", bet: "apuesta acertada", wrong: "incorrecta", blank: "sin respuesta" };

function useClock(endsAt, offset, running) {
  const [now, setNow] = useState(Date.now() + offset);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(id);
  }, [running, offset]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

function Register({ phase, send, error, pending }) {
  const [name, setName] = useState("");
  const closed = phase === "setup";
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length >= 2) send({ t: "register", name });
      }}
    >
      <div className="hand" style={{ fontSize: 26, color: "var(--yellow)" }}>Inscríbete</div>
      <h2>¿Cómo te llamas?</h2>
      <p className="muted">Usa tu nombre real: así te verá el profesor. Queda guardado en este celular hasta el final del juego.</p>
      <div className="field">
        <label htmlFor="nm">Tu nombre</label>
        <input id="nm" type="text" maxLength={30} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!!pending} />
      </div>
      {closed && <div className="notebar">El profesor todavía no ha abierto las inscripciones. Puedes escribir tu nombre e intentarlo en un momento.</div>}
      {phase && phase !== "setup" && phase !== "lobby" && (
        <div className="notebar">La partida ya empezó. Si ya estabas inscrito, escribe el mismo nombre y el profesor aprobará este celular.</div>
      )}
      {pending && <div className="notebar">{pending}</div>}
      {error && <div className="warnbar">{error}</div>}
      <button className="btn" type="submit" disabled={name.trim().length < 2 || !!pending}>
        {pending ? "Esperando al profesor…" : "Inscribirme"}
      </button>
    </form>
  );
}

function Me({ v }) {
  const { me, pts } = v;
  return (
    <div className="panel st-me">
      <div>
        <div className="muted" style={{ fontSize: 13 }}>Jugador</div>
        <h2 style={{ fontSize: 26 }}>{me.name}</h2>
      </div>
      <div className="seatbig">
        {me.seat || "—"}
        <small>{me.seat ? "tu asiento" : "elige tu asiento"}</small>
      </div>
      <div className="mono">
        {me.out ? (
          <span className="minus">Fuera · {me.outHits}/{pts.returnHits} aciertos para volver</span>
        ) : (
          <>
            <b style={{ fontSize: 20 }}>{me.score}</b> puntos{v.phase !== "lobby" && v.position ? ` · puesto ${v.position} de ${v.count}` : ""}
          </>
        )}
      </div>
    </div>
  );
}

function AnswerForm({ v, send, confirm }) {
  const { clue, pts } = v;
  const exact = clue.kind === "exact";
  const [mode, setMode] = useState(exact ? "answer" : "list");
  const [txt, setTxt] = useState("");
  const [first, setFirst] = useState(false);
  const nums = parseNums(txt);
  const single = mode === "answer" || mode === "bet";
  const valid = single ? nums.length === 1 : nums.length >= 1;
  const value = mode === "answer" ? pts.exact : mode === "list" ? pts.list : pts.bet;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const what = mode === "list" ? `la lista ${nums.join(", ")}` : `el ${nums[0]}`;
    const msg = `¿Enviar ${what}${first ? " declarándote primero" : ""}? Lo enviado queda escrito: no se puede cambiar.`;
    if (await confirm(msg, "Sí, enviar")) send({ t: "submit", mode, nums, first });
  };
  const skip = async () => {
    if (await confirm("¿No responder esta ronda? No ganas ni pierdes puntos por la respuesta.", "Sí, no responder")) send({ t: "submit", mode: "blank" });
  };

  return (
    <form className="panel" onSubmit={submit}>
      {!exact && (
        <div className="seg" role="group" aria-label="Cómo respondes">
          <button type="button" aria-pressed={mode === "list"} onClick={() => setMode("list")}>Lista de todos · +{pts.list}</button>
          <button type="button" aria-pressed={mode === "bet"} onClick={() => setMode("bet")}>Apostar por uno · +{pts.bet}</button>
        </div>
      )}
      <div className="field">
        <label htmlFor="ans">
          {mode === "answer" ? "El resultado de la operación" : mode === "list" ? "Todos los asientos posibles, separados por coma" : "El asiento por el que apuestas"}
        </label>
        <input
          id="ans"
          type="text"
          inputMode={single ? "numeric" : "text"}
          autoComplete="off"
          placeholder={single ? "14" : "12, 15, 18"}
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
        />
        {txt && !valid && <small className="minus">{single ? "Escribe un solo número." : "Escribe al menos un número."}</small>}
        {mode === "list" && nums.length > 0 && <small>Vas a enviar: {[...new Set(nums)].join(", ")}</small>}
      </div>
      <label className={"check" + (first ? " on" : "")}>
        <input type="checkbox" checked={first} onChange={(e) => setFirst(e.target.checked)} />
        <span>
          <b>¡Fui el primero!</b> Si eres el primero en declararlo y aciertas: <b className="plus">+{pts.first}</b>. Si te equivocas:{" "}
          <b className="minus">−{pts.firstFail}</b> extra.
        </span>
      </label>
      <button className="btn" type="submit" disabled={!valid}>Enviar respuesta (+{value})</button>
      <button className="btn ghost" type="button" onClick={skip}>No responder esta ronda</button>
    </form>
  );
}

function Locked({ sub }) {
  return (
    <div className="locked">
      <div className="muted" style={{ fontSize: 13 }}>Tu respuesta (bloqueada)</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
        {sub.mode === "blank" ? "No respondiste" : (sub.mode === "list" ? "Lista: " : sub.mode === "bet" ? "Apuesta: " : "") + sub.nums.join(", ")}
      </div>
      {sub.first && (
        <div style={{ marginTop: 6 }}>
          Te declaraste primero: eres el <b className="mono">{sub.firstPos}°</b> en hacerlo.{" "}
          {sub.firstPos === 1 ? "Si aciertas, el bono es tuyo." : "El bono es para el primero que acierte."}
        </div>
      )}
    </div>
  );
}

function SeatPicker({ v, send }) {
  const taken = new Map((v.taken || []).map((t) => [t.seat, t.name]));
  return (
    <div className="panel">
      <h3>{v.me.seat ? `Estás en el asiento ${v.me.seat}` : "¿En qué asiento estás sentado?"}</h3>
      <p className="muted" style={{ fontSize: 14 }}>
        Toca el número de tu asiento. Puedes cambiarlo hasta que el profesor cierre las inscripciones.
      </p>
      <div className="pick-grid" role="group" aria-label="Asientos del salón">
        {Array.from({ length: v.classSeats }, (_, i) => i + 1).map((n) => {
          const who = taken.get(n);
          const mine = v.me.seat === n;
          return (
            <button
              key={n}
              type="button"
              className={"pick" + (mine ? " mine" : "")}
              disabled={!!who}
              aria-pressed={mine}
              aria-label={who ? `Asiento ${n}, ocupado por ${who}` : `Asiento ${n}`}
              onClick={() => !mine && send({ t: "seat", seat: n })}
            >
              {n}
              <small>{mine ? "tú" : who || "libre"}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwapPanel({ v, send, confirm }) {
  const { incoming = [], outgoing, seatMap = [], swapsLeft, me } = v;
  const canAsk = !me.out && swapsLeft > 0;
  const ask = async (t) => {
    if (await confirm(`¿Pedirle a ${t.name} cambiar de asiento? Tú pasarías al ${t.seat} y ${t.name} al ${me.seat}.`, "Sí, pedir cambio"))
      send({ t: "move-request", seat: t.seat });
  };
  return (
    <>
      {incoming.map((r) => (
        <div className="incoming" key={r.id} role="alert">
          <div>
            <b>{r.name}</b> (asiento {r.seat}) quiere cambiar contigo: tú pasarías al asiento <b className="mono">{r.seat}</b> y {r.name} al{" "}
            <b className="mono">{me.seat}</b>.
          </div>
          <div className="btn-row">
            <button className="btn small" type="button" onClick={() => send({ t: "move-answer", id: r.id, accept: true })}>Aceptar</button>
            <button className="btn ghost small" type="button" onClick={() => send({ t: "move-answer", id: r.id, accept: false })}>Rechazar</button>
          </div>
        </div>
      ))}
      {canAsk && (
        <details className="panel" open={!!outgoing}>
          <summary style={{ cursor: "pointer" }}>
            <span>
              <b style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>¿A qué asiento te vas a pasar?</b>
              <small className="muted" style={{ display: "block", fontSize: 14 }}>
                {swapsLeft === 1 ? "Te queda 1 intercambio en esta ronda" : `Te quedan ${swapsLeft} intercambios en esta ronda`}
              </small>
            </span>
          </summary>
          {outgoing ? (
            <div className="notebar" style={{ marginTop: 10 }}>
              Le pediste a <b>{outgoing.name}</b> pasarte al asiento <b className="mono">{outgoing.seat}</b>. Espera a que acepte en su celular.
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button className="btn ghost small" type="button" onClick={() => send({ t: "move-cancel" })}>Cancelar solicitud</button>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 14, margin: "8px 0" }}>
              Ningún asiento puede quedar vacío: el compañero de ese asiento pasa al tuyo, y tiene que aceptar.
            </p>
          )}
          <div className="pick-grid" style={{ marginTop: 8 }}>
            {seatMap.map((t) => (
              <button
                key={t.seat}
                type="button"
                className={"pick" + (outgoing && outgoing.seat === t.seat ? " req" : "")}
                disabled={!t.free}
                aria-label={`Asiento ${t.seat}, ${t.name}${t.out ? ", fuera" : !t.free ? ", sin intercambios" : ""}`}
                onClick={() => ask(t)}
              >
                {t.seat}
                <small>{t.name}</small>
              </button>
            ))}
          </div>
        </details>
      )}
    </>
  );
}

function Breakdown({ parts }) {
  if (!parts || !parts.length) return null;
  return (
    <ul className="rules" style={{ fontSize: 15 }}>
      {parts.map((p, i) => (
        <li key={i}>
          {p.txt} {p.v ? <b className={cls(p.v)}>{signed(p.v)}</b> : null}
        </li>
      ))}
    </ul>
  );
}

function RoundView({ v, send, confirm }) {
  const { phase, clue, mySub, me, pts, offset } = v;
  const left = useClock(v.endsAt, offset, phase === "timing");
  const open = phase === "ready" || phase === "timing";
  const label = clue.kind === "exact" ? `PISTA EXACTA · +${pts.exact}` : `PISTA QUE REDUCE · LISTA +${pts.list} · APUESTA +${pts.bet}`;
  return (
    <>
      <div className="chalk-box">
        <div className="status">
          <span className="btn-row" style={{ gap: 6 }}>
            <span className={"pill " + (clue.kind === "exact" ? "y" : "b")}>{label}</span>
            {clue.level && <span className="pill o">NIVEL {clue.level}</span>}
          </span>
          {phase === "timing" && <span className={"clock" + (left <= 5 ? " done" : "")} style={{ fontSize: 30 }}>{fmt(left)}</span>}
        </div>
        <div className="write"><ClueText text={clue.text} /></div>
        {phase === "scoring" && <div className="solve">Solución: {clue.solve}</div>}
      </div>

      {me.out && open && (
        <div className="notebar">Estás fuera, pero sigue respondiendo: tus errores no restan y con {pts.returnHits} aciertos vuelves con {pts.returnScore} puntos.</div>
      )}
      {open && !mySub && <AnswerForm key={clue.text} v={v} send={send} confirm={confirm} />}
      {mySub && <Locked sub={mySub} />}
      {open && v.swapLimit > 0 && <SwapPanel v={v} send={send} confirm={confirm} />}
      {!open && !mySub && phase !== "scoring" && <div className="warnbar">Se cerró el tiempo y no enviaste respuesta.</div>}

      {(phase === "closed" || phase === "spinning") && (
        <div className="panel" style={{ textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 30, color: "var(--yellow)" }}>{phase === "spinning" ? "¡La ruleta está girando!" : "Tiempo. Mira la ruleta…"}</div>
        </div>
      )}

      {phase === "scoring" && v.preview && (
        <div className="panel">
          <div className="big" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}>Cayó el asiento {clue.target}</div>
          {clue.target === me.seat && !me.out && <div className="warnbar">¡Cayó en tu asiento!</div>}
          <div>Tu respuesta: <b>{ANSWER_LABEL[v.preview.answer]}</b></div>
          <div className={"bigdelta " + cls(v.preview.delta)}>{signed(v.preview.delta)}</div>
          <Breakdown parts={v.preview.parts} />
          <p className="muted" style={{ fontSize: 14 }}>El profesor está revisando las respuestas; puede corregir antes de cerrar la ronda.</p>
        </div>
      )}
    </>
  );
}

function Waiting({ v }) {
  const { last } = v;
  return (
    <>
      {last && last.result && (
        <div className="panel">
          <div className="muted" style={{ fontSize: 13 }}>Ronda {last.roundNo} · cayó el asiento {last.clue.target}</div>
          <div className={"bigdelta " + cls(last.result.delta)}>{signed(last.result.delta)}</div>
          <Breakdown parts={last.result.parts} />
          {last.result.event === "fuera" && <div className="warnbar">Quedaste fuera. Sigue respondiendo para volver.</div>}
          {last.result.event === "vuelve" && <div className="notebar">¡Vuelves al juego!</div>}
        </div>
      )}
      <div className="panel" style={{ textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 28, color: "var(--yellow)" }}>
          {v.roundNo === 0 ? "La partida va a empezar" : `Ronda ${v.roundNo + 1} de ${v.rounds}`}
        </div>
        <p className="muted">Espera la próxima pista del profesor.</p>
      </div>
    </>
  );
}

// Ventana de confirmación dentro de la página: los diálogos nativos (confirm) pueden quitar el foco.
function ConfirmDialog({ ask, onClose }) {
  if (!ask) return null;
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="cf-msg">
      <div className="modal">
        <p id="cf-msg">{ask.msg}</p>
        <div className="btn-row">
          <button className="btn small" type="button" autoFocus onClick={() => onClose(true)}>{ask.ok || "Sí"}</button>
          <button className="btn ghost small" type="button" onClick={() => onClose(false)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function FairPlay({ v }) {
  const [split, setSplit] = useState(looksSplit);
  useEffect(() => {
    const f = () => setSplit(looksSplit());
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  if (!v.watch || v.watch.mode === "off") return null;
  return (
    <div className="panel fair">
      <h3>Juego limpio</h3>
      <p style={{ fontSize: 15 }}>
        {v.watch.mode === "game" ? "Desde que empiece la partida hasta el final" : "Mientras haya una pista en pantalla"},{" "}
        <b>no salgas de esta página</b>. Si cambias de aplicación (por ejemplo, a la calculadora), minimizas el navegador, cambias de pestaña,
        bloqueas la pantalla o usas pantalla dividida, <b>tu participación se cancela de inmediato</b>
        {v.watch.grace ? ` (después de ${v.watch.grace} s fuera)` : ""}.
      </p>
      {split && <div className="warnbar">Parece que estás en pantalla dividida o en una ventana pequeña. Pon el navegador en pantalla completa antes de empezar.</div>}
    </div>
  );
}

function Withdrawn({ me }) {
  const w = me.withdrawn;
  const when = new Date(w.at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="panel withdrawn" role="alert">
      <div className="hand" style={{ fontSize: 28, color: "var(--danger)" }}>Participación cancelada</div>
      <p>
        A las <b>{when}</b> (ronda {w.roundNo}) {WITHDRAW_REASONS[w.reason] || "saliste de la página"}. Según las reglas, eso cuenta como
        desistir de participar.
      </p>
      <p className="muted" style={{ fontSize: 14 }}>
        Tus puntos quedan como estaban ({me.score}). Si fue un error (por ejemplo, una llamada entrante), habla con el profesor: puede readmitirte.
      </p>
    </div>
  );
}

function FinishedView({ v }) {
  return (
    <div className="panel">
      <div className="hand" style={{ fontSize: 28, color: "var(--yellow)" }}>Fin de la partida</div>
      {v.winner && <h2>Gana {v.winner}</h2>}
      <p>Terminaste en el puesto <b>{v.position}</b> de {v.count} con <b className="mono">{v.me.score}</b> puntos.</p>
      <ol className="rules">
        {v.ranking.map((r, i) => (
          <li key={i} style={r.me ? { color: "var(--yellow)", fontWeight: 700 } : undefined}>
            {r.name} · <span className="mono">{r.score}</span>
            {r.withdrawn && <span className="tag-mini minus">retirado</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function StudentApp() {
  const [view, setView] = useState(undefined);
  const [phase, setPhase] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [rules, setRules] = useState(false);

  const onMessage = useCallback((m) => {
    if (m.t === "token") {
      store.set(TOKEN_KEY, m.token);
      setPending(null);
      setError(null);
    } else if (m.t === "view") {
      setView(m.view ? { ...m.view, offset: m.view.serverNow - Date.now() } : null);
      if (m.view) setPhase(m.view.phase);
      else if (m.phase) setPhase(m.phase);
    } else if (m.t === "error") {
      setError(m.msg);
      setPending(null);
    } else if (m.t === "pending") {
      setPending(m.msg);
      setError(null);
    }
  }, []);

  const [notice, setNotice] = useState(null);
  const lastSeat = useRef(null);
  const seat = view && view.me ? view.me.seat : null;
  const inRound = view && view.phase !== "lobby";
  useEffect(() => {
    if (inRound && lastSeat.current && seat && seat !== lastSeat.current) setNotice(`Cambiaste de asiento: ahora estás en el ${seat}.`);
    lastSeat.current = seat;
  }, [seat, inRound]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const registered = !!(view && view.me);
  useEffect(() => {
    if (!error || !registered) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error, registered]);

  const { status, send } = useSocket(() => ({ t: "hello", role: "student", token: store.get(TOKEN_KEY) }), onMessage);

  const [ask, setAsk] = useState(null);
  const confirm = useCallback((msg, ok) => new Promise((resolve) => setAsk({ msg, ok, resolve })), []);
  const closeAsk = (ok) => {
    ask && ask.resolve(ok);
    setAsk(null);
  };

  // Vigilancia: salir de la página cancela la participación.
  const watching = !!(view && view.me && view.watch && view.watch.active && !view.me.withdrawn);
  useLeaveWatch({
    enabled: watching,
    grace: (view && view.watch && view.watch.grace) || 0,
    token: store.get(TOKEN_KEY),
    report: (reason) => send({ t: "leave", reason }),
  });
  // Si el aviso no llegó (sin conexión en ese momento), se reenvía al reconectar.
  const withdrawnNow = !!(view && view.me && view.me.withdrawn);
  useEffect(() => {
    const p = pendingLeave.get();
    if (!p || !view || !view.me) return;
    if (withdrawnNow || !watching) return pendingLeave.clear();
    if (status !== "online") return;
    const grace = (view.watch && view.watch.grace) || 0;
    if (Date.now() - p.at >= grace * 1000) send({ t: "leave", reason: p.reason });
    else pendingLeave.clear();
  }, [status, watching, withdrawnNow]); // eslint-disable-line react-hooks/exhaustive-deps

  let body;
  if (rules) body = null;
  else if (view === undefined) body = <div className="panel"><p className="muted">Conectando…</p></div>;
  else if (!view || !view.me) body = <Register phase={phase} send={send} error={error} pending={pending} />;
  else {
    const v = view;
    body = (
      <>
        <Me v={v} />
        {v.me.withdrawn && <Withdrawn me={v.me} />}
        {watching && <div className="watch-pill" role="status">Modo vigilado · no salgas de esta página</div>}
        {v.phase === "lobby" && (
          <>
            <FairPlay v={v} />
            <SeatPicker v={v} send={send} />
            <p className="muted" style={{ textAlign: "center" }}>
              {v.me.seat ? "¡Listo! Espera a que el profesor empiece la partida." : "Elige tu asiento para quedar listo."} Hay {v.count} inscritos.
            </p>
          </>
        )}
        {notice && <div className="notebar">{notice}</div>}
        {!v.me.withdrawn && v.clue && ["ready", "timing", "closed", "spinning", "scoring"].includes(v.phase) && <RoundView v={v} send={send} confirm={confirm} />}
        {v.phase === "idle" && !v.me.withdrawn && <Waiting v={v} />}
        {v.phase === "finished" && <FinishedView v={v} />}
        {error && <div className="warnbar toast" role="alert">{error}</div>}
        <ConfirmDialog ask={ask} onClose={closeAsk} />
      </>
    );
  }

  return (
    <>
      <nav className="topbar">
        <div className="wrap">
          <Brand />
          <span className={"conn " + status}>{status === "online" ? "conectado" : status === "connecting" ? "conectando…" : "sin conexión"}</span>
          <div className="tabs">
            <button type="button" aria-current={rules ? "page" : undefined} onClick={() => setRules(!rules)}>
              {rules ? "Volver al juego" : "Reglas"}
            </button>
          </div>
        </div>
      </nav>
      {rules ? (
        <Rules pts={(view && view.pts) || DEFAULT_POINTS} onPlay={() => setRules(false)} />
      ) : (
        <main className="st">{body}</main>
      )}
      <footer className="site">
        <div className="wrap">
          <Logo size={26} />
          <span>Juego, estrategia y matemáticas</span>
        </div>
      </footer>
    </>
  );
}
