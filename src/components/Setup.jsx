import { useState } from "react";
import { LEVELS } from "../game/clues.js";
import { DEFAULT_POINTS } from "../game/engine.js";

const POINT_FIELDS = [
  ["start", "Puntaje inicial"],
  ["exact", "Acierto pista exacta (+)"],
  ["list", "Lista exacta (+)"],
  ["bet", "Apuesta acertada (+)"],
  ["first", "Bono por ser primero (+)"],
  ["wrong", "Respuesta equivocada (−)"],
  ["firstFail", "Primero y se equivoca (− extra)"],
  ["hit", "Le cae la ruleta (−)"],
  ["returnHits", "Aciertos para volver"],
  ["returnScore", "Puntaje al volver"],
];

const clamp = (v, lo, hi, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
};

export default function Setup({ config, onSubmit, submitLabel = "Abrir inscripciones", onCancel }) {
  const [c, setC] = useState(config);
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const setPt = (k, v) => setC((x) => ({ ...x, pts: { ...x.pts, [k]: v } }));

  const submit = (e) => {
    e.preventDefault();
    const pts = {};
    for (const [k] of POINT_FIELDS) pts[k] = clamp(c.pts[k], 0, 99, DEFAULT_POINTS[k]);
    pts.returnHits = Math.max(1, pts.returnHits);
    onSubmit({
      ...c,
      rounds: clamp(c.rounds, 1, 50, 8),
      seconds: clamp(c.seconds, 5, 600, 45),
      swapLimit: clamp(c.swapLimit, 0, 10, 1),
      level: clamp(c.level, 1, 4, 2),
      pts,
    });
  };

  return (
    <form className="wrap setup-grid" onSubmit={submit}>
      <div className="panel">
        <h2>{onCancel ? "Reglas de la partida" : "Nueva partida"}</h2>
        <p className="muted">
          Define las reglas. Después se abren las inscripciones: cada estudiante entra desde su celular y escribe su nombre. Ese nombre se
          conserva hasta el final del juego.
        </p>
        <p className="muted">
          Solo cuentan los asientos ocupados: el número de asiento de cada estudiante se asigna en la sala de inscripción, en el orden que
          elijas.
        </p>
      </div>

      <div className="panel">
        <h3>Reglas de esta partida</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="rounds">Rondas (N)</label>
            <input id="rounds" type="number" min="1" max="50" value={c.rounds} onChange={(e) => set("rounds", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="secs">Segundos por ronda (n)</label>
            <input id="secs" type="number" min="5" max="600" value={c.seconds} onChange={(e) => set("seconds", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="swaps">Intercambios por persona y ronda</label>
            <input id="swaps" type="number" min="0" max="10" value={c.swapLimit} onChange={(e) => set("swapLimit", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="clueType">Tipo de pista</label>
            <select id="clueType" value={c.clueType} onChange={(e) => set("clueType", e.target.value)}>
              <option value="mix">Mezcla</option>
              <option value="exact">Solo exacta</option>
              <option value="reduce">Solo reduce</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="level">Dificultad</label>
            <select id="level" value={c.level} onChange={(e) => set("level", Number(e.target.value))}>
              {Object.entries(LEVELS).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="low">Si quedan menos de 3 activos</label>
            <select id="low" value={c.lowPolicy} onChange={(e) => set("lowPolicy", e.target.value)}>
              <option value="reintegrate">Reintegrar a todos</option>
              <option value="end">Terminar la partida</option>
            </select>
          </div>
        </div>

        <details className="points">
          <summary>Valores de puntos</summary>
          <div className="form-grid">
            {POINT_FIELDS.map(([k, label]) => (
              <div className="field" key={k}>
                <label htmlFor={"pt-" + k}>{label}</label>
                <input id={"pt-" + k} type="number" min="0" max="99" value={c.pts[k]} onChange={(e) => setPt(k, e.target.value)} />
              </div>
            ))}
          </div>
        </details>

        <p className="muted">La tendencia (probabilidad) de cada asiento se ajusta en la pantalla de juego, tocando los asientos entre rondas.</p>
        <div className="btn-row">
          <button className="btn" type="submit">{submitLabel}</button>
          {onCancel && <button className="btn ghost" type="button" onClick={onCancel}>Cancelar</button>}
        </div>
      </div>
    </form>
  );
}
