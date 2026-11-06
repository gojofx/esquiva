import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Setup from "./Setup.jsx";
import Claims from "./Claims.jsx";

import { studentUrl } from "../paths.js";

function QR({ url }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#142a23", light: "#f3efe4" } }).then(setSrc, () => setSrc(null));
  }, [url]);
  return src ? <img src={src} alt={"Código QR para entrar: " + url} className="qr" /> : null;
}

export default function Lobby({ data, dispatch, resolveClaim }) {
  const { state, online, linked, claims } = data;
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const url = studentUrl();
  const players = state.players;
  const unseated = players.filter((p) => !p.seat).length;
  const sorted = [...players].sort((a, b) => (a.seat || 0) - (b.seat || 0) || a.id - b.id);
  const taken = new Set(players.map((p) => p.seat).filter(Boolean));
  const seatsFor = (p) =>
    Array.from({ length: state.config.classSeats }, (_, i) => i + 1).filter((n) => n === p.seat || !taken.has(n));

  if (editing)
    return (
      <Setup
        config={state.config}
        submitLabel="Guardar reglas"
        onCancel={() => setEditing(false)}
        onSubmit={(config) => {
          dispatch({ type: "SET_CONFIG", config });
          setEditing(false);
        }}
      />
    );

  const add = (e) => {
    e.preventDefault();
    if (name.trim()) dispatch({ type: "ADD_MANUAL", name });
    setName("");
  };

  return (
    <main className="wrap play">
      <div className="play-head">
        <div className="round-no">
          Inscripciones <span>abiertas</span>
          <span className="muted" style={{ fontSize: 16, fontWeight: 400, marginLeft: 12 }}>
            {players.length} inscritos · {state.config.rounds} rondas · {state.config.seconds} s por ronda
          </span>
        </div>
        <div className="btn-row">
          <button className="btn ghost small" type="button" onClick={() => setEditing(true)}>Editar reglas</button>
          <button
            className="btn danger small"
            type="button"
            onClick={() => window.confirm("¿Cancelar la partida y borrar las inscripciones?") && dispatch({ type: "RESET" })}
          >
            Cancelar partida
          </button>
        </div>
      </div>

      <Claims claims={claims} resolveClaim={resolveClaim} />

      <div className="play-grid">
        <div className="panel" style={{ textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 28, color: "var(--yellow)" }}>Entren desde el celular</div>
          <QR url={url} />
          <div className="mono url-big">{url}</div>
          <p className="muted">Cada uno escribe su nombre y elige su asiento. El nombre queda guardado en su celular hasta el final del juego.</p>
        </div>

        <div className="panel">
          <h3>Estudiantes y asiento</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Cada estudiante elige en su celular el asiento donde está sentado. Puedes corregirlo aquí. A quien no tiene celular lo agregas a
            mano, le asignas el asiento y marcas sus respuestas.
          </p>
          {players.length === 0 && <p className="muted">Todavía no se ha inscrito nadie.</p>}
          <ol className="lobby-list">
            {sorted.map((p) => (
              <li key={p.id}>
                <select
                  className="seat-select"
                  aria-label={`Asiento de ${p.name}`}
                  value={p.seat || ""}
                  onChange={(e) => dispatch({ type: "SET_SEAT", id: p.id, seat: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">—</option>
                  {seatsFor(p).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className={"dot-on" + (online.includes(p.id) ? " on" : "")} title={online.includes(p.id) ? "conectado" : "desconectado"} />
                <span className="nm">
                  {p.name}
                  {!linked.includes(p.id) && <span className="tag-mini zero">sin celular</span>}
                  {!p.seat && <span className="tag-mini minus">sin asiento</span>}
                </span>
                <button
                  type="button"
                  className="icon danger"
                  aria-label={`Quitar a ${p.name}`}
                  onClick={() => window.confirm(`¿Quitar a ${p.name}?`) && dispatch({ type: "REMOVE_PLAYER", id: p.id })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <form className="btn-row" onSubmit={add}>
            <input type="text" maxLength={30} placeholder="Agregar a mano (sin celular)" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <button className="btn ghost small" type="submit" disabled={!name.trim()}>Agregar</button>
          </form>
          {players.length < 4 && <div className="warnbar">Se necesitan al menos 4 estudiantes para empezar.</div>}
          {unseated > 0 && <div className="warnbar">{unseated} sin asiento: todos deben tener asiento para empezar.</div>}
          <button className="btn" type="button" disabled={players.length < 4 || unseated > 0} onClick={() => dispatch({ type: "START_GAME" })}>
            Cerrar inscripciones y empezar ({players.length})
          </button>
        </div>
      </div>
    </main>
  );
}
