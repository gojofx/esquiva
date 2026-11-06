// Vigilancia del celular del estudiante: detecta cuándo sale de la página.
//
// Señales usadas:
//  - visibilitychange → oculto: cambió de app o pestaña, minimizó el navegador o bloqueó la pantalla.
//  - blur de la ventana: tocó otra app en pantalla dividida o ventana flotante, o usó otra ventana.
//  - resize en pantallas táctiles: la ventana se achicó (pantalla dividida), salvo que el teclado esté abierto.
//  - pagehide: cerró o recargó la página.
// Un navegador no permite impedir que se salga; solo detectarlo en el instante en que ocurre.
import { useEffect, useRef } from "react";
import { BASE } from "./paths.js";
import { store } from "./net.js";

const PENDING_KEY = "ruleta-salida-pendiente";

export function isTouch() {
  return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

// Tamaño más grande que ha tenido la ventana en cada orientación (referencia para detectar que se achicó).
const biggest = { portrait: { w: 0, h: 0 }, landscape: { w: 0, h: 0 } };
const orientation = () =>
  (window.screen.orientation?.type || "").startsWith("landscape") || window.innerWidth > window.innerHeight * 1.2 ? "landscape" : "portrait";
const keyboardOpen = () => {
  const ae = document.activeElement;
  return !!ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
};
function remember() {
  if (keyboardOpen()) return;
  const b = biggest[orientation()];
  b.w = Math.max(b.w, window.innerWidth);
  b.h = Math.max(b.h, window.innerHeight);
}
if (typeof window !== "undefined") {
  remember();
  window.addEventListener("resize", remember);
}

// ¿La ventana del navegador ocupa solo una parte de la pantalla (pantalla dividida o ventana flotante)?
export function looksSplit() {
  if (!isTouch() || keyboardOpen()) return false;
  const o = orientation();
  const sw = window.screen.width, sh = window.screen.height;
  const W = o === "landscape" ? Math.max(sw, sh) : Math.min(sw, sh);
  const H = o === "landscape" ? Math.min(sw, sh) : Math.max(sw, sh);
  const vsScreen = window.innerWidth < W * 0.8 || window.innerHeight < H * 0.55;
  const b = biggest[o];
  const vsBiggest = (b.w && window.innerWidth < b.w * 0.8) || (b.h && window.innerHeight < b.h * 0.6);
  return vsScreen || !!vsBiggest;
}

export const pendingLeave = {
  get() {
    try {
      const p = JSON.parse(store.get(PENDING_KEY) || "null");
      return p && Date.now() - p.at < 15 * 60 * 1000 ? p : null;
    } catch {
      return null;
    }
  },
  set: (reason) => store.set(PENDING_KEY, JSON.stringify({ reason, at: Date.now() })),
  clear: () => store.set(PENDING_KEY, null),
};

function beacon(token, reason) {
  try {
    const blob = new Blob([JSON.stringify({ token, reason })], { type: "text/plain" });
    navigator.sendBeacon && navigator.sendBeacon(BASE + "leave", blob);
  } catch {
    /* sin sendBeacon */
  }
}

// enabled: vigilancia activa. grace: segundos de tolerancia (0 = inmediato).
// report(reason): avisa al servidor por WebSocket. token: para el respaldo con sendBeacon.
export function useLeaveWatch({ enabled, grace = 0, token, report }) {
  const ref = useRef({});
  ref.current = { grace, token, report };

  useEffect(() => {
    if (!enabled) return;
    let away = null; // { reason, since, timer }
    let fired = false;
    let wakeLock = null;

    const fire = (reason) => {
      if (fired) return;
      fired = true;
      pendingLeave.set(reason);
      ref.current.report(reason);
      beacon(ref.current.token, reason);
    };
    const leave = (reason) => {
      if (fired) return;
      const g = ref.current.grace * 1000;
      if (!g) return fire(reason);
      if (away) return;
      pendingLeave.set(reason); // por si no vuelve: se decide al reconectar
      away = { reason, since: Date.now(), timer: setTimeout(() => fire(reason), g) };
    };
    const back = () => {
      if (!away || fired) return;
      clearTimeout(away.timer);
      if (Date.now() - away.since >= ref.current.grace * 1000) fire(away.reason);
      else pendingLeave.clear();
      away = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") leave("hidden");
      else {
        back();
        requestWake();
      }
    };
    const onBlur = () => {
      if (document.visibilityState === "visible") leave("blur");
    };
    const onFocus = () => back();
    const onPageHide = () => fire("closed");
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (looksSplit()) leave("split");
        else if (away && away.reason === "split") back();
      }, 700);
    };

    // Evita que la pantalla se apague sola durante la partida (solo con HTTPS).
    async function requestWake() {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible" && !wakeLock) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => (wakeLock = null));
        }
      } catch {
        wakeLock = null;
      }
    }
    requestWake();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("resize", onResize);
    // Si la vigilancia empieza con la página ya fuera de foco o en pantalla dividida, cuenta como salida.
    if (document.visibilityState === "hidden") leave("hidden");
    else if (looksSplit()) leave("split");

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      if (away) clearTimeout(away.timer);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [enabled]);
}
