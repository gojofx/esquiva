import { useCallback, useEffect, useState } from "react";
import { useSocket, store } from "./net.js";
import ClueText from "./components/ClueText.jsx";
import Rules from "./components/Rules.jsx";
import { DEFAULT_POINTS } from "./game/engine.js";

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
        {v.phase === "lobby" ? "—" : me.seat}
        <small>{v.phase === "lobby" ? "asiento por asignar" : "tu asiento"}</small>
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

function AnswerForm({ v, send, error }) {
  const { clue, pts } = v;
  const exact = clue.kind === "exact";
  const [mode, setMode] = useState(exact ? "answer" : "list");
  const [txt, setTxt] = useState("");
  const [first, setFirst] = useState(false);
  const nums = parseNums(txt);
  const single = mode === "answer" || mode === "bet";
  const valid = single ? nums.length === 1 : nums.length >= 1;
  const value = mode === "answer" ? pts.exact : mode === "list" ? pts.list : pts.bet;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const what = mode === "list" ? `la lista ${nums.join(", ")}` : `el ${nums[0]}`;
    const msg = `¿Enviar ${what}${first ? " declarándote primero" : ""}? Lo enviado queda escrito: no se puede cambiar.`;
    if (window.confirm(msg)) send({ t: "submit", mode, nums, first });
  };
  const skip = () => {
    if (window.confirm("¿No responder esta ronda? No ganas ni pierdes puntos por la respuesta.")) send({ t: "submit", mode: "blank" });
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
      {error && <div className="warnbar">{error}</div>}
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

function RoundView({ v, send, error }) {
  const { phase, clue, mySub, me, pts, offset } = v;
  const left = useClock(v.endsAt, offset, phase === "timing");
  const open = phase === "ready" || phase === "timing";
  const label = clue.kind === "exact" ? `PISTA EXACTA · +${pts.exact}` : `PISTA QUE REDUCE · LISTA +${pts.list} · APUESTA +${pts.bet}`;
  return (
    <>
      <div className="chalk-box">
        <div className="status">
          <span className={"pill " + (clue.kind === "exact" ? "y" : "b")}>{label}</span>
          {phase === "timing" && <span className={"clock" + (left <= 5 ? " done" : "")} style={{ fontSize: 30 }}>{fmt(left)}</span>}
        </div>
        <div className="write"><ClueText text={clue.text} /></div>
        {phase === "scoring" && <div className="solve">Solución: {clue.solve}</div>}
      </div>

      {me.out && open && (
        <div className="notebar">Estás fuera, pero sigue respondiendo: tus errores no restan y con {pts.returnHits} aciertos vuelves con {pts.returnScore} puntos.</div>
      )}
      {open && !me.out && v.swapLimit > 0 && (
        <p className="muted" style={{ fontSize: 14 }}>
          ¿Tu asiento está en peligro? Puedes intercambiar con un compañero (te quedan {v.swapsLeft}). El profesor registra el cambio.
        </p>
      )}

      {open && !mySub && <AnswerForm key={clue.text} v={v} send={send} error={error} />}
      {mySub && <Locked sub={mySub} />}
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
      setError((e) => (m.view && m.view.mySub ? null : e));
    } else if (m.t === "error") {
      setError(m.msg);
      setPending(null);
    } else if (m.t === "pending") {
      setPending(m.msg);
      setError(null);
    }
  }, []);

  const { status, send } = useSocket(() => ({ t: "hello", role: "student", token: store.get(TOKEN_KEY) }), onMessage);

  let body;
  if (rules) body = null;
  else if (view === undefined) body = <div className="panel"><p className="muted">Conectando…</p></div>;
  else if (!view || !view.me) body = <Register phase={phase} send={send} error={error} pending={pending} />;
  else {
    const v = view;
    body = (
      <>
        <Me v={v} />
        {v.phase === "lobby" && (
          <div className="panel">
            <h3>¡Listo, estás inscrito!</h3>
            <p className="muted">Espera a que el profesor cierre las inscripciones. Ya hay {v.count} inscritos.</p>
            <p style={{ fontSize: 14 }}>{(v.lobby || []).join(" · ")}</p>
          </div>
        )}
        {v.clue && ["ready", "timing", "closed", "spinning", "scoring"].includes(v.phase) && <RoundView v={v} send={send} error={error} />}
        {v.phase === "idle" && <Waiting v={v} />}
        {v.phase === "finished" && <FinishedView v={v} />}
      </>
    );
  }

  return (
    <>
      <nav className="topbar">
        <div className="wrap">
          <div className="brand">Ruleta de <span>Asientos</span></div>
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
    </>
  );
}
