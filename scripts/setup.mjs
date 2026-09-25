import { randomBytes } from "node:crypto";
import { writeFile, access } from "node:fs/promises";
const file = new URL("../apps/web/.env.local", import.meta.url);
try {
  await access(file);
  console.log("Ya existe apps/web/.env.local. No se modificó.");
} catch {
  await writeFile(
    file,
    `ADMIN_EMAIL=admin@cubpay.local\nADMIN_PASSWORD=${randomBytes(24).toString("base64url")}\nAPP_ORIGIN=http://localhost:3000\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Configuración local creada en apps/web/.env.local. Consulta ADMIN_PASSWORD en ese archivo para iniciar sesión.",
  );
}
