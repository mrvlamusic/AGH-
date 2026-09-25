# CubPay — MVP de simulación

Portal privado para coordinar necesidades B2B de liquidez entre Cuba y Estados Unidos. **No recibe, custodia, transmite ni liquida dinero real. Usa exclusivamente datos ficticios.**

## Inicio local

Requisitos: Node.js **22.12+** y pnpm **9.15.0**.

```sh
npm install -g pnpm@9.15.0
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

Abre http://localhost:3000. Entra con `admin@cubpay.local` y la contraseña aleatoria `ADMIN_PASSWORD` que `pnpm setup:local` guarda en `apps/web/.env.local`. El comando no sobrescribe una configuración existente. No publiques ese archivo.

Para ejecutar la compilación optimizada:

```sh
pnpm build
pnpm start
```

Sin `DATABASE_URL`, los datos se guardan en `apps/web/.cubpay/state.json`, con bloqueo exclusivo, escritura atómica y permisos privados. Recargar o reiniciar el servidor conserva órdenes, lotes, sesiones e historial. No existe un botón que borre la auditoría. Haz una copia del archivo con el servidor detenido para respaldarlo.

## Recorrido de 3 minutos

1. Entra como administrador y pulsa **Cargar escenario de prueba**. Se crean seis empresas ficticias y órdenes fondeadas: $500.000 por lado.
2. Pulsa **Ejecutar matching**. Se conservan las asignaciones parciales y anteriores.
3. Pulsa **Crear lote** y entra a **Liquidaciones**.
4. Pulsa **Confirmar pagos simulados**, después **Reconciliar y cerrar**.
5. Revisa **Libro contable**, **Órdenes** y **Actividad**. La repetición de estos comandos no vuelve a asignar ni contabilizar los mismos importes.

## Recorrido de una empresa

1. Administrador: **Crear invitación**, copiar el código de un uso (7 días).
2. En otro navegador o sesión privada: `/onboarding`, completar datos ficticios y crear una contraseña de al menos 12 caracteres.
3. Administrador: **Empresas → Aprobar KYB**.
4. Empresa: **Nueva orden**. Importe entre $1.000 y $1.000.000, con hasta dos decimales. Comisión fija del MVP: 4%, añadida al fondeo simulado.
5. Administrador: **Órdenes → Aprobar → Simular fondeo**. Se crea el asiento del fondeo.
6. Repite con otra empresa que necesite el lado contrario. El matching no cruza órdenes de una misma empresa.
7. Ejecuta matching, lote, confirmaciones y reconciliación. La empresa solo ve sus propios datos y puede exportarlos en CSV.

El registro inicia sesión como la nueva empresa en ese navegador. Usa sesiones separadas para mantener abierto el panel administrador.

## PostgreSQL y despliegue

PostgreSQL es obligatorio en Vercel o para varios hosts. El almacenamiento local es para una sola máquina, no para discos de red ni entornos efímeros.

```sh
docker compose up -d
# Añade a apps/web/.env.local:
# DATABASE_URL=postgresql://cubpay:cubpay@localhost:5432/cubpay
pnpm db:init
pnpm build
pnpm start
```

`db:init` crea una tabla de estado versionado y conserva datos existentes. Las operaciones se ejecutan dentro de transacciones con `SELECT ... FOR UPDATE`. El cambio desde archivo a PostgreSQL inicia un entorno independiente: no migra automáticamente datos locales.

En Vercel importa el repositorio con raíz en el directorio raíz del monorepo y el `vercel.json` incluido. Configura `DATABASE_URL`, `ADMIN_EMAIL`, una `ADMIN_PASSWORD` aleatoria de al menos 12 caracteres y `APP_ORIGIN` con el origen HTTPS exacto, **sin barra final**. Ejecuta `pnpm db:init` contra la base elegida antes de usar el portal. Usa una base sandbox dedicada. Cada preview necesita su propio `APP_ORIGIN` y base independiente. No se ha publicado automáticamente en un proveedor externo.

## Validación

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Las pruebas de navegador utilizan un archivo de datos temporal separado y el servidor optimizado en el puerto 3100. Para comprobar transacciones PostgreSQL localmente, define `TEST_DATABASE_URL` apuntando a **una base de pruebas desechable**: esa prueba reinicia la fila sandbox. CI ejecuta ese caso con su propio servicio PostgreSQL.

## Alcance y límites

- Aplicación Next.js con API en `/api`, lógica independiente en `packages/core`.
- Autenticación por correo/contraseña, sesiones HttpOnly de 8 horas, roles administrador/empresa, verificación del origen y límite de intentos por cuenta.
- Invitaciones de un uso, KYB manual simulado, órdenes, matching parcial, lotes, proveedor mock, ledger de doble entrada y auditoría persistente.
- El antiguo API NestJS y el esquema Prisma sin conectar se sustituyeron por una única API operativa. No se necesita Redis ni un segundo servidor.
- Administrador único configurado por entorno. Sin MFA, recuperación de contraseña por correo, envío de invitaciones por email ni carga de documentos. El KYB es una revisión manual de datos ficticios, no una verificación regulatoria.
- Auditoría protegida por la API, pero **no inmutable frente al administrador de la base de datos**. La fila de estado es una simplificación para un MVP de bajo volumen; no es una arquitectura contable de producción.
- Las órdenes fondeadas no se cancelan en este MVP: no existe un flujo de devolución. Las órdenes pendientes de revisión o fondeo sí se pueden cancelar.
- No activar dinero real. Ver [límites de cumplimiento](docs/COMPLIANCE_BOUNDARIES.md).

Más detalle: [arquitectura](docs/ARCHITECTURE.md), [flujo contable](docs/MONEY_FLOW.md), [entrega](docs/MVP_DELIVERY.md), [validación](docs/VALIDATION.md).
