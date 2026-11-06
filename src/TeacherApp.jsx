import { useCallback, useState } from "react";
import { useSocket, store } from "./net.js";
import Rules from "./components/Rules.jsx";
import Setup from "./components/Setup.jsx";
import Lobby from "./components/Lobby.jsx";
import Play from "./components/Play.jsx";
import Scoreboard from "./components/Scoreboard.jsx";
import { DEFAULT_POINTS } from "./game/engine.js";
import { BASE, navigate } from "./paths.js";

const PIN_KEY = "ruleta-profesor-pin";
const TABS = [
  { id: "rules", label: "Reglamento" },
  { id: "play", label: "Jugar" },
  { id: "board", label: "Marcador" },
];

function Login({ onPin, failed }) {
  const [pin, setPin] = useState("");
  return (
    <main className="wrap" style={{ maxWidth: 440, padding: "60px 20px" }}>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          onPin(pin.trim());
        }}
      >
        <h2>Pantalla del profesor</h2>
        <p className="muted">Escribe el PIN que muestra el servidor al arrancar (también está en data/pin.txt).</p>
        <div className="field">
          <label htmlFor="pin">PIN</label>
          <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        </div>
        {failed && <div className="warnbar">PIN incorrecto.</div>}
        <button className="btn" type="submit" disabled={!pin.trim()}>Entrar</button>
        <a
          href={BASE}
          className="muted"
          style={{ fontSize: 14 }}
          onClick={(e) => {
            e.preventDefault();
            navigate(BASE);
          }}
        >
          Soy estudiante
        </a>
      </form>
    </main>
  );
}

export default function TeacherApp() {
  const [pin, setPin] = useState(() => store.get(PIN_KEY));
  const [failed, setFailed] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("play");

  const onMessage = useCallback((m) => {
    if (m.t === "auth-fail") {
      store.set(PIN_KEY, null);
      setPin(null);
      setFailed(true);
    } else if (m.t === "auth-ok") {
      setFailed(false);
    } else if (m.t === "state") {
      setData({ ...m, offset: m.serverNow - Date.now() });
    }
  }, []);

  const { status, send } = useSocket(() => ({ t: "hello", role: "teacher", pin }), onMessage, !!pin);
  const dispatch = useCallback((action) => send({ t: "action", action }), [send]);
  const resolveClaim = useCallback((id, accept) => send({ t: "claim", id, accept }), [send]);

  if (!pin)
    return (
      <Login
        failed={failed}
        onPin={(p) => {
          store.set(PIN_KEY, p);
          setPin(p);
        }}
      />
    );

  const go = (id) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };
  const state = data && data.state;
  const pts = state ? state.config.pts : DEFAULT_POINTS;

  return (
    <>
      <nav className="topbar" aria-label="Secciones">
        <div className="wrap">
          <div className="brand">
            Ruleta de <span>Asientos</span>
          </div>
          <span className={"conn " + status}>{status === "online" ? "conectado" : status === "connecting" ? "conectando…" : "sin conexión"}</span>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {!state ? (
        <main className="wrap play">
          <div className="panel"><p className="muted">Conectando con el servidor…</p></div>
        </main>
      ) : (
        <>
          {tab === "rules" && <Rules pts={pts} onPlay={() => go("play")} />}
          {tab === "play" &&
            (state.phase === "setup" ? (
              <Setup config={state.config} onSubmit={(config) => dispatch({ type: "OPEN_LOBBY", config })} />
            ) : state.phase === "lobby" ? (
              <Lobby data={data} dispatch={dispatch} resolveClaim={resolveClaim} />
            ) : (
              <Play data={data} dispatch={dispatch} resolveClaim={resolveClaim} />
            ))}
          {tab === "board" && <Scoreboard state={state} />}
        </>
      )}

      <footer>
        <div className="wrap">
          Ruleta de Asientos · pantalla del profesor. La partida se guarda en el servidor: si se cierra esta pestaña, al volver continúa donde iba.
        </div>
      </footer>
    </>
  );
}
