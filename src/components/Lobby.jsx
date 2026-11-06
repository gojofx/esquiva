import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Setup from "./Setup.jsx";
import Claims from "./Claims.jsx";

export const studentUrl = () => window.location.origin + window.location.pathname;

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
          <p className="muted">Cada uno escribe su nombre. El nombre queda guardado en su celular hasta el final del juego.</p>
        </div>

        <div className="panel">
          <h3>Estudiantes y número de asiento</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            El número es el asiento de cada uno en la ruleta. Ordénalos según dónde están sentados. Los que no tienen celular se agregan a mano
            y el profesor marca sus respuestas.
          </p>
          {players.length === 0 && <p className="muted">Todavía no se ha inscrito nadie.</p>}
          <ol className="lobby-list">
            {players.map((p, i) => (
              <li key={p.id}>
                <span className="mono seatno">{p.seat}</span>
                <span className={"dot-on" + (online.includes(p.id) ? " on" : "")} title={online.includes(p.id) ? "conectado" : "desconectado"} />
                <span className="nm">
                  {p.name}
                  {!linked.includes(p.id) && <span className="tag-mini zero">sin celular</span>}
                </span>
                <button type="button" className="icon" aria-label={`Subir a ${p.name}`} disabled={i === 0} onClick={() => dispatch({ type: "MOVE_PLAYER", id: p.id, dir: -1 })}>↑</button>
                <button type="button" className="icon" aria-label={`Bajar a ${p.name}`} disabled={i === players.length - 1} onClick={() => dispatch({ type: "MOVE_PLAYER", id: p.id, dir: 1 })}>↓</button>
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
          <button className="btn" type="button" disabled={players.length < 4} onClick={() => dispatch({ type: "START_GAME" })}>
            Cerrar inscripciones y empezar ({players.length})
          </button>
        </div>
      </div>
    </main>
  );
}
