# Validación

Comandos: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.

- Dominio: importe decimal, redondeo de comisiones, ledger, matching repetido y parcial, desempate FIFO, auto-cruces, lotes repetidos, confirmaciones inválidas, reconciliación parcial y privacidad.
- Persistencia: solicitudes simultáneas, escritura durable, rollback y rechazo de archivo en Vercel.
- Autenticación: scrypt, sesiones, expiración, invitaciones y límite de intentos.
- PostgreSQL: fila bloqueada, concurrencia y rollback. Se ejecuta con TEST_DATABASE_URL en CI; se omite localmente si no está configurado.
- Navegador: login, demo completa, contabilidad, recarga, registro por invitación, KYB, creación de órdenes, aislamiento de empresas, exportación, logout y viewport móvil.

Las pruebas de navegador usan datos aislados en `.cubpay/e2e-<timestamp>.json`. Nunca apuntes TEST_DATABASE_URL a una base con información que quieras conservar.

La prueba de disponibilidad `/api/health` no comprueba la conexión a base de datos. El recorrido de `/api/state` y sus comandos sí la ejercita.
