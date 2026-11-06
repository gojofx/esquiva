import { useEffect, useState } from "react";
import { activeSeats, activePlayers, ANSWERS, scoreRound } from "../game/engine.js";
import Wheel from "./Wheel.jsx";
import ClueText from "./ClueText.jsx";
import Finished from "./Finished.jsx";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const cls = (n) => (n > 0 ? "plus" : n < 0 ? "minus" : "zero");

function Clock({ state, dispatch }) {
  const { phase, round, config } = state;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (phase !== "timing") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);
  const left =
    phase === "timing" ? Math.max(0, Math.ceil((round.endsAt - now) / 1000)) : ["idle", "ready"].includes(phase) ? config.seconds : 0;
  useEffect(() => {
    if (phase === "timing" && left <= 0) dispatch({ type: "CLOSE" });
  }, [phase, left, dispatch]);
  return (
    <div className={"clock" + (left <= 0 ? " done" : "")} aria-live="off">
      {fmt(left)}
    </div>
  );
}

function CluePanel({ state }) {
  const { phase, round, config } = state;
  const { pts } = config;
  if (!round)
    return (
      <div className="chalk-box clue-big">
        <span className="pill o">PISTA</span>
        <div className="write">Pulsa "Nueva ronda" para elegir el asiento y mostrar la pista.</div>
      </div>
    );
  const { clue } = round;
  const revealed = phase === "scoring";
  return (
    <div className="chalk-box clue-big">
      {clue.kind === "exact" ? (
        <span className="pill y">PISTA EXACTA · +{pts.exact}</span>
      ) : (
        <span className="pill b">PISTA QUE REDUCE · LISTA +{pts.list} · APUESTA +{pts.bet}</span>
      )}
      <div className="write">
        <ClueText text={clue.text} />
      </div>
      {revealed && <div className="solve">Solución: {clue.solve}</div>}
    </div>
  );
}

function Controls({ state, dispatch }) {
  const { phase } = state;
  return (
    <div className="status">
      <Clock state={state} dispatch={dispatch} />
      <div className="btn-row">
        {phase === "idle" && (
          <button className="btn" type="button" onClick={() => dispatch({ type: "NEW_ROUND" })} disabled={activeSeats(state).length < 2}>
            Nueva ronda
          </button>
        )}
        {phase === "ready" && (
          <>
            <button className="btn" type="button" onClick={() => dispatch({ type: "START_TIMER" })}>Iniciar tiempo</button>
            <button className="btn ghost" type="button" onClick={() => dispatch({ type: "REROLL_CLUE" })} title="Mismo asiento, otra pista">
              Otra pista
            </button>
          </>
        )}
        {phase === "timing" && (
          <button className="btn ghost" type="button" onClick={() => dispatch({ type: "CLOSE" })}>Cerrar ya</button>
        )}
        {phase === "closed" && (
          <button className="btn" type="button" onClick={() => dispatch({ type: "SPIN" })}>Girar</button>
        )}
        {phase === "spinning" && <button className="btn" type="button" disabled>Girando…</button>}
      </div>
    </div>
  );
}

function Message({ state }) {
  const { phase, round, log, players } = state;
  const name = (id) => players.find((p) => p.id === id)?.name;
  if (phase === "ready")
    return <div className="result muted">El asiento ya está elegido. Inicia el tiempo para que resuelvan e intercambien.</div>;
  if (phase === "timing")
    return <div className="result">Corre el tiempo: resuelvan en la hoja e intercambien asientos. Al terminar, todo se cierra.</div>;
  if (phase === "closed") return <div className="result"><b>Tiempo.</b> Hojas e intercambios cerrados. Ya se puede girar.</div>;
  if (phase === "spinning") return <div className="result muted">La ruleta está girando…</div>;
  if (phase === "scoring") {
    const t = round.clue.target;
    const who = players.find((p) => p.seat === t && !p.out);
    return (
      <div className="result show">
        <div className="big">Cayó el asiento {t}</div>
        {who && <div>Está sentado ahí: <b>{who.name}</b> → <b className="minus">−{state.config.pts.hit}</b></div>}
        <div className="muted">Revisen las hojas y marquen las respuestas abajo.</div>
      </div>
    );
  }
  const last = log[log.length - 1];
  if (phase === "idle" && last) {
    const out = last.results.filter((r) => r.event === "fuera").map((r) => name(r.id));
    const back = last.results.filter((r) => r.event === "vuelve").map((r) => name(r.id));
    return (
      <div className="result">
        <b>Ronda {last.roundNo}:</b> cayó el asiento {last.clue.target}.
        {out.length > 0 && <> Quedan fuera: <b className="minus">{out.join(", ")}</b>.</>}
        {back.length > 0 && <> Vuelven: <b className="plus">{back.join(", ")}</b>.</>}
        {last.notes.map((n, i) => <div key={i} className="muted">{n}</div>)}
      </div>
    );
  }
  return <div className="result muted">Entre rondas puedes tocar un asiento para cambiar su tendencia (×1, ×2, ×3).</div>;
}

function Seats({ state, dispatch }) {
  const { phase, round, players, config, seatCount, weights } = state;
  const [sel, setSel] = useState([]);
  const swapping = phase === "ready" || phase === "timing";
  useEffect(() => {
    if (!swapping) setSel([]);
  }, [swapping]);

  const bySeat = {};
  players.forEach((p) => (bySeat[p.seat] = p));
  const used = (p) => (round ? round.swaps[p.id] || 0 : 0);
  const canSwap = (p) => p && !p.out && used(p) < config.swapLimit;
  const target = phase === "scoring" ? round.clue.target : null;
  const cands = phase === "scoring" && round.clue.kind === "reduce" ? round.clue.cands : [];

  const click = (n) => {
    if (phase === "idle") return dispatch({ type: "CYCLE_WEIGHT", seat: n });
    if (!swapping) return;
    if (sel.includes(n)) return setSel(sel.filter((x) => x !== n));
    if (canSwap(bySeat[n])) setSel([...sel, n]);
  };
  const doSwap = () => {
    dispatch({ type: "SWAP", seats: sel });
    setSel([]);
  };

  let hint = "";
  if (phase === "idle") hint = "Toca un asiento para cambiar su tendencia de salir (×1 → ×2 → ×3).";
  else if (swapping)
    hint =
      config.swapLimit === 0
        ? "En esta partida no se permiten intercambios."
        : `Intercambios: toca los asientos en orden. Con 2 se cambian entre sí; con 3 o más, cada uno pasa al siguiente y el último al primero. Máximo ${config.swapLimit} por persona en esta ronda.`;
  else if (phase === "closed" || phase === "spinning") hint = "Intercambios cerrados.";

  return (
    <div className="panel">
      <div className="front-label">tablero</div>
      <p className="muted" style={{ fontSize: 14 }}>{hint}</p>
      <div className="seat-grid" aria-label="Asientos del salón">
        {Array.from({ length: seatCount }, (_, i) => i + 1).map((n) => {
          const p = bySeat[n];
          const w = weights[n] || 1;
          const k = ["seat"];
          if (p.out) k.push("out");
          if (w === 2) k.push("w2");
          if (w === 3) k.push("w3");
          if (swapping && !p.out && !canSwap(p) && !sel.includes(n)) k.push("used");
          if (sel.includes(n)) k.push("sel");
          if (target === n) k.push("hit");
          else if (cands.includes(n)) k.push("cand");
          const disabled = !(phase === "idle" || (swapping && (canSwap(p) || sel.includes(n))));
          return (
            <button
              key={n}
              type="button"
              className={k.join(" ")}
              onClick={() => click(n)}
              disabled={disabled}
              aria-label={`Asiento ${n}, ${p.name}, ${p.score} puntos${p.out ? ", fuera" : ""}, tendencia por ${w}`}
            >
              <span className="num">{n}</span>
              <span className="nm">{p.name}</span>
              <span className="sc">{p.out ? `fuera · ${p.outHits}/${config.pts.returnHits}` : `${p.score} pts`}</span>
              {w > 1 && !p.out && <span className="w">×{w}</span>}
              {sel.includes(n) && <span className="ord">{sel.indexOf(n) + 1}</span>}
            </button>
          );
        })}
      </div>
      {swapping && sel.length > 0 && (
        <div className="notebar">
          {sel.length === 1 ? (
            <>Elige con quién intercambia <b>{bySeat[sel[0]].name}</b>.</>
          ) : (
            sel.map((n, i) => (
              <div key={n}>
                <b>{bySeat[n].name}</b> pasa del asiento {n} al {sel[(i + 1) % sel.length]}
              </div>
            ))
          )}
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn small" type="button" disabled={sel.length < 2} onClick={doSwap}>Intercambiar</button>
            <button className="btn ghost small" type="button" onClick={() => setSel([])}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Scoring({ state, dispatch }) {
  const { round, players } = state;
  const results = scoreRound(state);
  const opts = ANSWERS[round.clue.kind];
  const target = round.clue.target;
  const rows = [...results].sort((a, b) => a.before.seat - b.before.seat);
  const setAll = (answer) => players.forEach((p) => dispatch({ type: "SET_ANSWER", id: p.id, answer }));

  return (
    <div className="panel">
      <div className="status">
        <h3>Respuestas de la ronda</h3>
        <div className="btn-row">
          <span className="muted" style={{ fontSize: 14 }}>Marcar a todos:</span>
          {opts.map((o) => (
            <button key={o.id} type="button" className="btn ghost small" onClick={() => setAll(o.id)}>{o.label}</button>
          ))}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        {round.clue.kind === "exact"
          ? `Respuesta correcta: ${target}.`
          : `Lista correcta: ${round.clue.cands.join(", ")}. Apuesta correcta: ${target}.`}{" "}
        Pulsa "Primero" en el orden en que se declararon; el bono es para el primero que acertó.
      </p>
      <div className="table-wrap">
        <table className="score-table">
          <thead>
            <tr><th>Asiento</th><th>Estudiante</th><th>Respuesta</th><th>¿Primero?</th><th>Puntos</th><th>Total</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.before;
              const ord = round.first.indexOf(p.id);
              return (
                <tr key={p.id} className={p.seat === target && !p.out ? "is-hit" : p.out ? "is-out" : ""}>
                  <td className="mono">{p.seat}</td>
                  <td>
                    {p.name}
                    {p.out && <span className="tag-mini zero">FUERA {p.outHits}/{state.config.pts.returnHits}</span>}
                    {p.seat === target && !p.out && <span className="tag-mini minus">LE CAYÓ</span>}
                  </td>
                  <td>
                    <div className="seg" role="group" aria-label={`Respuesta de ${p.name}`}>
                      {opts.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={r.answer === o.id}
                          onClick={() => dispatch({ type: "SET_ANSWER", id: p.id, answer: o.id })}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="firstbtn"
                      aria-pressed={ord >= 0}
                      disabled={p.out}
                      onClick={() => dispatch({ type: "TOGGLE_FIRST", id: p.id })}
                    >
                      {ord >= 0 ? `${ord + 1}° en declarar` : "Primero"}
                    </button>
                  </td>
                  <td>
                    <span className={"delta " + cls(r.delta)}>{signed(r.delta)}</span>
                    <div className="why">{r.parts.map((x) => (x.v ? `${x.txt} ${signed(x.v)}` : x.txt)).join(" · ")}</div>
                  </td>
                  <td className="mono">
                    {r.event === "vuelve" ? (
                      <span className="plus">vuelve · {r.after.score}</span>
                    ) : p.out ? (
                      <span className="zero">fuera</span>
                    ) : (
                      <>
                        {r.after.score}
                        {r.after.out && <span className="tag-mini minus">QUEDA FUERA</span>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <button className="btn" type="button" onClick={() => dispatch({ type: "APPLY" })}>
          Aplicar puntos y cerrar la ronda
        </button>
      </div>
    </div>
  );
}

export default function Play({ state, dispatch }) {
  const { phase, roundNo, config, round, weights } = state;
  const seats = activeSeats(state);
  const segments = seats.map((n) => ({ n, weight: weights[n] || 1 }));
  const totalW = segments.reduce((t, s) => t + s.weight, 0);

  const reset = () => {
    if (window.confirm("¿Empezar una partida nueva? Se perderán los puntajes actuales.")) dispatch({ type: "RESET" });
  };

  if (phase === "finished") return <Finished state={state} dispatch={dispatch} onReset={reset} />;

  const current = Math.min(roundNo + 1, config.rounds);
  return (
    <main className="wrap play">
      <div className="play-head">
        <div className="round-no">
          Ronda <span>{current}</span> de {config.rounds}
          <span className="muted" style={{ fontSize: 16, fontWeight: 400, marginLeft: 12, color: "var(--chalk-dim)" }}>
            {activePlayers(state).length} en juego · {state.players.length - activePlayers(state).length} fuera
          </span>
        </div>
        <div className="btn-row">
          {phase === "idle" && state.prev && (
            <button className="btn ghost small" type="button" onClick={() => dispatch({ type: "UNDO" })}>
              Deshacer ronda {roundNo}
            </button>
          )}
          {phase === "idle" && roundNo > 0 && (
            <button className="btn ghost small" type="button" onClick={() => dispatch({ type: "FINISH_NOW" })}>
              Terminar partida
            </button>
          )}
          <button className="btn danger small" type="button" onClick={reset}>Nueva partida</button>
        </div>
      </div>

      <div className="play-grid">
        <div className="panel">
          <CluePanel state={state} />
          <Controls state={state} dispatch={dispatch} />
          <Message state={state} />
        </div>
        <div className="panel">
          <Wheel
            segments={segments}
            hit={phase === "scoring" ? round.clue.target : null}
            spinTo={phase === "spinning" ? round.clue.target : null}
            onDone={() => dispatch({ type: "SPIN_DONE" })}
          />
          <div className="probs" aria-label="Probabilidad de cada asiento">
            {segments.map((s) => `#${s.n} ${((100 * s.weight) / totalW).toFixed(1)}%`).join("   ")}
          </div>
        </div>
      </div>

      {phase === "scoring" && <Scoring state={state} dispatch={dispatch} />}
      <Seats state={state} dispatch={dispatch} />
    </main>
  );
}
