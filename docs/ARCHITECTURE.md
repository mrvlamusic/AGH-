# Arquitectura del MVP

## Monolito modular

- `apps/web`: Next.js 15, React 19, páginas públicas, portal empresarial y centro de operaciones.
- `apps/web/app/api/[...path]/route.ts`: API HTTP con validación de entrada, sesiones y autorización.
- `apps/web/lib/auth.ts`: contraseñas scrypt con sal individual, sesiones aleatorias almacenadas como SHA-256, invitaciones de un uso y límite de intentos por cuenta.
- `apps/web/lib/store.ts`: unidad de trabajo transaccional. PostgreSQL en despliegues; archivo privado en una única máquina local.
- `packages/core`: comandos de negocio y proyecciones por rol, independientes de la interfaz y del proveedor de almacenamiento.

La API devuelve un objeto explícito por rol. Nunca serializa usuarios, contraseñas, sesiones o invitaciones almacenadas. Las empresas reciben únicamente su organización, sus órdenes e historial; no reciben asignaciones, instrucciones de otras empresas ni el grafo de contrapartes. La interfaz no constituye la frontera de autorización: cada comando valida el rol en servidor.

## Concurrencia y persistencia

PostgreSQL mantiene un agregado JSONB versionado. Una transacción bloquea la fila con `FOR UPDATE`, lee, ejecuta, guarda y confirma. Las excepciones revierten todos los cambios. Es una decisión para priorizar integridad en el sandbox; el siguiente paso para mayor escala es separar entidades y restricciones relacionales, manteniendo la atomicidad.

El adaptador local adquiere un archivo `.lock` exclusivo, guarda una copia temporal, ejecuta fsync y renombra atómicamente. Protege procesos de la misma máquina. Un cierre forzado puede dejar un `.lock`: detener todas las instancias, respaldar el estado, comprobar que no haya escritor activo y eliminar exclusivamente ese bloqueo. Nunca se elimina automáticamente por antigüedad para evitar escritores concurrentes.

No uses el adaptador local en Vercel: la aplicación lo rechaza explícitamente. PostgreSQL no desactiva la validación TLS del cliente; utiliza la configuración TLS indicada por tu proveedor.

## API

- `GET /api/health`: proceso disponible, sin consulta de persistencia.
- `GET /api/state`: vista autorizada de datos persistidos.
- `GET /api/orders/export`: CSV de órdenes visibles al actor.
- `POST /api/auth/login`, `/auth/register`, `/auth/logout`.
- `POST /api/invites`: crear invitación (administrador).
- `POST /api/organizations/review`: aprobar/rechazar KYB (administrador).
- `POST /api/orders`: enviar orden (empresa verificada); `requestId` idempotente.
- `POST /api/orders/review`, `/orders/fund`: controles de operaciones.
- `POST /api/orders/cancel`: cancelar antes del fondeo; requiere propiedad o rol admin.
- `POST /api/matching`, `/batches`, `/batches/confirm`, `/batches/reconcile`: administrador.
- `POST /api/demo/seed`: carga de ejemplo de una sola ejecución.

Las mutaciones requieren JSON y un encabezado Origin que coincida con APP_ORIGIN. Los cuerpos se limitan a 16 KiB. Respuestas autenticadas con no-store, cookies HttpOnly/SameSite=Strict y Secure con HTTPS. Una sesión dura 8 horas; iniciar otra sesión para la misma cuenta revoca la anterior. Cerrar sesión la revoca en servidor.

## Límites explícitos

Sin proveedores financieros reales, email transaccional, MFA o recuperación de contraseña. El límite de acceso por correo debe complementarse con protección de borde antes de exponer un piloto ampliamente. APP_ORIGIN se fija explícitamente en despliegues. La auditoría registra acciones de negocio y sesiones correctas; no es un registro completo de seguridad ni evidencia inmutable. Se requiere copia de seguridad, rotación de secretos y retención antes de un piloto externo.
