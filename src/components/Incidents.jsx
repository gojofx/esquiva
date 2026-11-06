import { WITHDRAW_REASONS } from "../game/engine.js";

// Avisos de estudiantes cuyo celular salió de la página (participación cancelada).
export default function Incidents({ state, dispatch }) {
  const open = (state.incidents || []).filter((i) => !i.resolved);
  if (!open.length) return null;
  return (
    <div style={{ display: "grid", gap: 8 }} role="alert">
      {open.map((i) => (
        <div className="incident" key={i.id}>
          <span>
            <b>{i.name}</b> {WITHDRAW_REASONS[i.reason] || "salió de la página"} ·{" "}
            {new Date(i.at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · ronda {i.roundNo}.{" "}
            <b>Participación cancelada.</b>
          </span>
          <span className="btn-row" style={{ marginLeft: "auto" }}>
            <button className="btn ghost small" type="button" onClick={() => dispatch({ type: "REINSTATE", id: i.playerId })}>
              Readmitir
            </button>
            <button className="btn small" type="button" onClick={() => dispatch({ type: "DISMISS_INCIDENT", incidentId: i.id })}>
              Entendido
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
