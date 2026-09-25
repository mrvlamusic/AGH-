import { readFile } from "node:fs/promises";
import pg from "pg";
try {
  process.loadEnvFile(new URL("../apps/web/.env.local", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!process.env.DATABASE_URL)
  throw new Error(
    "Configura DATABASE_URL en apps/web/.env.local o en el entorno.",
  );
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(
    await readFile(
      new URL("../database/001_sandbox.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "Almacenamiento sandbox PostgreSQL inicializado. Los datos existentes se conservaron.",
  );
} finally {
  await client.end();
}
