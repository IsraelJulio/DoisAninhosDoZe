// Sobe um PostgreSQL REAL local (binários oficiais distribuídos pelo pacote `embedded-postgres`),
// para quem não tem Postgres/Docker instalado. Apenas desenvolvimento/testes.
//
//   npm run db:local
//   DATABASE_URL="postgresql://postgres:postgres@localhost:54329/jose?schema=public"
//
// Usa `pg_ctl` (e não `postgres` direto) porque no Windows o pg_ctl remove privilégios de
// administrador automaticamente — o servidor se recusa a rodar como admin.
// Os dados ficam em .local-postgres/ (ignorado pelo git). Ctrl+C para parar.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const port = Number(process.env.LOCAL_PG_PORT ?? 54329);
const root = path.resolve(".local-postgres");
const dataDir = path.join(root, "data");
const logFile = path.join(root, "postgres.log");
const databases = ["jose", "jose_test"];

const platform = process.platform === "win32" ? "windows" : process.platform;
const binaries = await import(`@embedded-postgres/${platform}-${process.arch}`);

mkdirSync(root, { recursive: true });

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  const pwFile = path.join(os.tmpdir(), `jose-pg-pw-${process.pid}`);
  writeFileSync(pwFile, "postgres\n");
  execFileSync(
    binaries.initdb,
    ["-D", dataDir, "-U", "postgres", "--pwfile", pwFile, "-A", "scram-sha-256", "-E", "UTF8", "--locale=C"],
    { stdio: "inherit" },
  );
}

// stdio "ignore": no Windows o processo do servidor herda os handles e prenderia o pipe.
const pgCtl = (args) => execFileSync(binaries.pg_ctl, ["-D", dataDir, ...args], { stdio: "ignore" });

try {
  pgCtl(["status"]);
  console.log("PostgreSQL local já estava rodando.");
} catch {
  try {
    pgCtl(["-o", `-p ${port}`, "-l", logFile, "-w", "start"]);
  } catch (error) {
    console.error(`Falha ao iniciar o PostgreSQL. Veja ${logFile}`);
    throw error;
  }
}

const admin = new pg.Client({ host: "localhost", port, user: "postgres", password: "postgres", database: "postgres" });
await admin.connect();
for (const db of databases) {
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [db]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${db}"`);
}
await admin.end();

console.log(`PostgreSQL local rodando na porta ${port}`);
for (const db of databases) {
  console.log(`  postgresql://postgres:postgres@localhost:${port}/${db}?schema=public`);
}

if (process.argv.includes("--detach")) process.exit(0);

console.log("Ctrl+C para parar.");
const stop = () => {
  try {
    pgCtl(["-m", "fast", "stop"]);
  } finally {
    process.exit(0);
  }
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
