import { ranking } from "../game/engine.js";
import ClueText from "./ClueText.jsx";

const LABEL = { correct: "acertó", list: "lista exacta", bet: "apuesta", wrong: "error", blank: "en blanco" };
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const cls = (n) => (n > 0 ? "plus" : n < 0 ? "minus" : "zero");

export default function Scoreboard({ state }) {
  if (state.phase === "setup")
    return (
      <main className="wrap play">
        <div className="panel"><h2>Marcador</h2><p className="muted">Todavía no hay una partida. Créala en la pestaña "Jugar".</p></div>
      </main>
    );
  const ranked = ranking(state.players);
  const name = (id) => state.players.find((p) => p.id === id)?.name;
  return (
    <main className="wrap play">
      <div className="play-head">
        <h2>Marcador</h2>
        <span className="muted">{state.roundNo} de {state.config.rounds} rondas jugadas</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Puesto</th><th>Estudiante</th><th>Asiento</th><th>Puntos</th><th>Estado</th></tr></thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id}>
                <td className="mono">{i + 1}</td>
                <td>{p.name}</td>
                <td className="mono">{p.seat}</td>
                <td className="mono">{p.score}</td>
                <td className={p.out || p.withdrawn ? "minus" : "plus"}>
                  {p.withdrawn ? "retirado (salió de la página)" : p.out ? `fuera · ${p.outHits}/${state.config.pts.returnHits} aciertos para volver` : "en juego"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Historial de rondas</h3>
        {state.log.length === 0 && <p className="muted">Aún no se ha jugado ninguna ronda.</p>}
        {[...state.log].reverse().map((e) => (
          <div className="log-entry" key={e.roundNo}>
            <div className="status">
              <b>Ronda {e.roundNo} · cayó el asiento {e.clue.target}</b>
              <span className="muted" style={{ fontSize: 14 }}>{e.clue.kind === "exact" ? "pista exacta" : "pista que reduce"}{e.clue.level ? ` · nivel ${e.clue.level}` : ""}</span>
            </div>
            <div className="write"><ClueText text={e.clue.text} /></div>
            <div style={{ fontSize: 14 }}>
              {e.results
                .filter((r) => r.delta !== 0 || r.event || r.answer !== "blank")
                .map((r) => (
                  <span key={r.id} style={{ marginRight: 14, display: "inline-block" }}>
                    {name(r.id)}: {LABEL[r.answer]}
                    {r.declared ? " (primero)" : ""} <b className={cls(r.delta)}>{signed(r.delta)}</b>
                    {r.event === "fuera" && <span className="minus"> · queda fuera</span>}
                    {r.event === "vuelve" && <span className="plus"> · vuelve</span>}
                  </span>
                ))}
            </div>
            {e.notes.map((n, i) => <div key={i} className="muted" style={{ fontSize: 14 }}>{n}</div>)}
          </div>
        ))}
      </div>
    </main>
  );
}
