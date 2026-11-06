// Desarrollo: arranca el servidor del juego (con recarga al cambiar server/ o src/game/)
// y Vite con recarga en caliente. Ctrl+C detiene ambos.
import { spawn } from "node:child_process";

const procs = [
  ["servidor", process.execPath, ["--watch-path=server", "--watch-path=src/game", "server/index.js"]],
  ["vite", process.execPath, ["node_modules/vite/bin/vite.js"]],
];

const children = procs.map(([name, cmd, args]) => {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code, signal) => {
    if (signal || stopping) return;
    console.error(`[dev] ${name} terminó (código ${code}); deteniendo todo.`);
    stop(code || 1);
  });
  return child;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
