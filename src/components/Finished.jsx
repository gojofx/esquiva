import { ranking } from "../game/engine.js";
import ClueText from "./ClueText.jsx";

const REASON = {
  rounds: "Se jugaron todas las rondas.",
  low: "Quedaron menos de 3 asientos activos y la regla de esta partida era terminar.",
  manual: "La partida se terminó antes de tiempo.",
};

export default function Finished({ state, dispatch, onReset }) {
  const ranked = ranking(state.players);
  const top = ranked[0]?.score;
  const tied = ranked.filter((p) => p.score === top);
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : tied.length === 1 ? tied[0] : null;
  const tb = state.tiebreak;

  return (
    <main className="wrap play">
      <div className="play-head">
        <div>
          <h2>Fin de la partida</h2>
          <p className="muted">{REASON[state.endReason] || ""}</p>
        </div>
        <div className="btn-row">
          {state.prev && !state.winnerId && (
            <button className="btn ghost small" type="button" onClick={() => dispatch({ type: "UNDO" })}>
              {state.endReason === "manual" ? "Volver a la partida" : `Deshacer ronda ${state.roundNo}`}
            </button>
          )}
          <button className="btn small" type="button" onClick={onReset}>Nueva partida</button>
        </div>
      </div>

      {winner ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 28, color: "var(--yellow)" }}>¡Gana!</div>
          <h1>{winner.name}</h1>
          <p className="mono" style={{ fontSize: 22 }}>{winner.score} puntos</p>
        </div>
      ) : (
        <div className="panel">
          <h3>Empate en el primer lugar con {top} puntos</h3>
          <p>{tied.map((p) => p.name).join(", ")}. Se da una pista de desempate: gana el primero en resolverla bien.</p>
          {!tb ? (
            <div className="btn-row">
              <button className="btn" type="button" onClick={() => dispatch({ type: "TIEBREAK", tied: tied.map((p) => p.id) })}>
                Mostrar pista de desempate
              </button>
            </div>
          ) : (
            <>
              <div className="chalk-box clue-big">
                <span className="pill y">DESEMPATE</span>
                <div className="write"><ClueText text={tb.clue.text.replace("El asiento que cae es", "El número es")} /></div>
                {tb.showSolve && <div className="solve">Solución: {tb.clue.solve.replace(/ · se anota: \d+$/, "")}</div>}
              </div>
              <div className="btn-row">
                {!tb.showSolve && (
                  <button className="btn ghost" type="button" onClick={() => dispatch({ type: "TIEBREAK_SOLVE" })}>Ver solución</button>
                )}
                <span className="muted">¿Quién la resolvió primero?</span>
                {tied.map((p) => (
                  <button key={p.id} className="btn small" type="button" onClick={() => dispatch({ type: "SET_WINNER", id: p.id })}>
                    {p.name}
                  </button>
                ))}
                <button className="btn ghost small" type="button" onClick={() => dispatch({ type: "TIEBREAK", tied: tied.map((p) => p.id) })}>
                  Otra pista
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="podium">
        {ranked.slice(0, 3).map((p, i) => (
          <div className={"card" + (i === 0 ? " good" : "")} key={p.id}>
            <span className="tag">{i + 1}° LUGAR</span>
            <h3>{p.name}</h3>
            <div className="big">{p.score}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Puesto</th><th>Estudiante</th><th>Asiento final</th><th>Puntos</th><th>Estado</th></tr></thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id}>
                <td className="mono">{i + 1}</td>
                <td>{p.name}</td>
                <td className="mono">{p.seat}</td>
                <td className="mono">{p.score}</td>
                <td className={p.out || p.withdrawn ? "minus" : "plus"}>{p.withdrawn ? "retirado" : p.out ? "fuera" : "en juego"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
