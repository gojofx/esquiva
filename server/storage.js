// Almacenamiento de la partida: PostgreSQL si hay variables DB_* (o DATABASE_URL); si no, un archivo JSON.
import fs from "node:fs";
import path from "node:path";

const usePg = () => !!(process.env.DATABASE_URL || process.env.DB_HOST || process.env.DB_USERNAME);

const SCHEMA = `
create table if not exists partida_actual (
  id          smallint primary key default 1 check (id = 1),
  estado      jsonb       not null,
  tokens      jsonb       not null default '[]',
  actualizado timestamptz not null default now()
);
create table if not exists partidas_jugadas (
  id         text primary key,
  terminada  timestamptz not null default now(),
  config     jsonb not null,
  ranking    jsonb not null,
  rondas     jsonb not null,
  ganador    text
);`;

// Ranking y resumen que se guardan cuando termina una partida.
function summary(state) {
  const ranking = [...state.players]
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .map((p, i) => ({ puesto: i + 1, nombre: p.name, asiento: p.seat, puntos: p.score, fuera: p.out }));
  const winner = state.winnerId
    ? state.players.find((p) => p.id === state.winnerId)?.name
    : ranking.length && (ranking.length === 1 || ranking[0].puntos > ranking[1].puntos)
      ? ranking[0].nombre
      : null;
  return { ranking, rondas: state.log, ganador: winner || null };
}

async function pgStorage() {
  const { default: pg } = await import("pg");
  const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined;
  const pool = process.env.DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 3 })
    : new pg.Pool({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_DATABASE || "esquiva",
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        ssl,
        max: 3,
      });
  pool.on("error", (e) => console.error("PostgreSQL:", e.message));
  await pool.query(SCHEMA);
  const where = process.env.DATABASE_URL ? "DATABASE_URL" : `${pool.options.user}@${pool.options.host}:${pool.options.port}/${pool.options.database}`;

  // Las escrituras se encadenan para que nunca se pise un estado nuevo con uno viejo.
  let chain = Promise.resolve();
  const queue = (fn) => (chain = chain.then(fn).catch((e) => console.error("PostgreSQL:", e.message)));

  return {
    describe: `PostgreSQL (${where})`,
    async load() {
      const r = await pool.query("select estado, tokens from partida_actual where id = 1");
      return r.rows[0] ? { state: r.rows[0].estado, tokens: r.rows[0].tokens } : null;
    },
    save(data) {
      const estado = JSON.stringify(data.state), tokens = JSON.stringify(data.tokens);
      return queue(() =>
        pool.query(
          `insert into partida_actual (id, estado, tokens, actualizado) values (1, $1, $2, now())
           on conflict (id) do update set estado = excluded.estado, tokens = excluded.tokens, actualizado = now()`,
          [estado, tokens]
        )
      );
    },
    archive(state) {
      if (!state.gameId) return;
      const s = summary(state);
      return queue(() =>
        pool.query(
          `insert into partidas_jugadas (id, config, ranking, rondas, ganador) values ($1, $2, $3, $4, $5)
           on conflict (id) do update set terminada = now(), config = excluded.config, ranking = excluded.ranking,
             rondas = excluded.rondas, ganador = excluded.ganador`,
          [state.gameId, JSON.stringify(state.config), JSON.stringify(s.ranking), JSON.stringify(s.rondas), s.ganador]
        )
      );
    },
    flush: () => chain,
  };
}

function fileStorage(dir) {
  const file = path.join(dir, "partida.json");
  const histDir = path.join(dir, "partidas-jugadas");
  const write = (f, obj) => {
    fs.writeFileSync(f + ".tmp", JSON.stringify(obj));
    fs.renameSync(f + ".tmp", f);
  };
  return {
    describe: `archivo ${file}`,
    async load() {
      try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        return null;
      }
    },
    save(data) {
      write(file, data);
    },
    archive(state) {
      if (!state.gameId) return;
      fs.mkdirSync(histDir, { recursive: true });
      write(path.join(histDir, `${state.gameId}.json`), { terminada: new Date().toISOString(), config: state.config, ...summary(state) });
    },
    flush: async () => {},
  };
}

export async function createStorage(dataDir) {
  return usePg() ? pgStorage() : fileStorage(dataDir);
}
