import { useEffect, useReducer, useState } from "react";
import { reducer, initialState, DEFAULT_CONFIG, DEFAULT_POINTS } from "./game/engine.js";
import Rules from "./components/Rules.jsx";
import Setup from "./components/Setup.jsx";
import Play from "./components/Play.jsx";
import Scoreboard from "./components/Scoreboard.jsx";

const KEY = "ruleta-asientos-v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const s = JSON.parse(raw);
    const config = { ...DEFAULT_CONFIG, ...s.config, pts: { ...DEFAULT_POINTS, ...(s.config && s.config.pts) } };
    // Si se recargó la página en pleno giro, se pasa directo al resultado.
    const phase = s.phase === "spinning" ? "scoring" : s.phase;
    return { ...initialState, ...s, config, phase };
  } catch {
    return initialState;
  }
}

const TABS = [
  { id: "rules", label: "Reglamento" },
  { id: "play", label: "Jugar" },
  { id: "board", label: "Marcador" },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [tab, setTab] = useState(() => (state.phase === "setup" ? "rules" : "play"));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* sin almacenamiento disponible: el juego sigue en memoria */
    }
  }, [state]);

  const go = (id) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <nav className="topbar" aria-label="Secciones">
        <div className="wrap">
          <div className="brand">
            Ruleta de <span>Asientos</span>
          </div>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {tab === "rules" && <Rules pts={state.config.pts} onPlay={() => go("play")} />}
      {tab === "play" &&
        (state.phase === "setup" ? (
          <Setup config={state.config} onStart={(config, names) => dispatch({ type: "NEW_GAME", config, names })} />
        ) : (
          <Play state={state} dispatch={dispatch} />
        ))}
      {tab === "board" && <Scoreboard state={state} />}

      <footer>
        <div className="wrap">
          Ruleta de Asientos · juego de matemáticas para el salón. La partida se guarda en este navegador; si recargas la página, continúa
          donde iba.
        </div>
      </footer>
    </>
  );
}
