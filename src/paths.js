// Rutas de la app. BASE es "/" o la subruta con la que se compiló (BASE_PATH=/esquiva/ npm run build).
export const BASE = import.meta.env.BASE_URL;
export const TEACHER_PATH = BASE + "profesor";

const rel = () => {
  const p = window.location.pathname;
  return p.startsWith(BASE) ? p.slice(BASE.length) : p.replace(/^\//, "");
};
export const isTeacherPath = () => /^profesor\/?$/.test(rel());

// Enlaces antiguos con "#profesor" pasan a la ruta limpia sin recargar.
export function migrateHash() {
  if (window.location.hash.replace("#", "").startsWith("profesor")) window.history.replaceState(null, "", TEACHER_PATH);
}

export function navigate(path) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const studentUrl = () => window.location.origin + BASE;
export const wsUrl = () => {
  const u = new URL(BASE + "ws", window.location.origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
};
