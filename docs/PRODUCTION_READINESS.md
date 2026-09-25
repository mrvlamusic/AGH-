# Preparación operativa y límites de la entrega

## Estado

El producto continúa siendo un sandbox. Una compilación de producción (`next build`) no equivale a autorización para operar fondos ni a certificación de seguridad. No hay proveedor bancario, KYB externo, correo transaccional ni alojamiento de staging configurado.

## Controles incorporados

- Sesiones HttpOnly, SameSite, expiración, revocación al iniciar sesión de nuevo; contraseñas scrypt para empresas.
- Roles comprobados en servidor, proyecciones por empresa, validación de origen y límite de cuerpo.
- Admisión de autenticación limitada a 120 intentos/minuto por entorno y 10 intentos por correo/15 minutos antes del trabajo criptográfico. El límite global puede causar rechazo bajo abuso: complementar con protección perimetral del proveedor; no confiar en cabeceras de IP enviadas por clientes.
- Registro: validar invitación y campos antes de calcular scrypt.
- `CUBPAY_DEPLOYMENT=staging` exige PostgreSQL, origen HTTPS exacto y contraseña administrativa de al menos 24 caracteres. Vercel aplica las mismas restricciones. `CUBPAY_MODE=live` es rechazado; aún no existe modo de fondos reales.
- `CUBPAY_OPERATIONS_PAUSED=true` bloquea todos los POST excepto login/logout. Consultas y exportación siguen disponibles. Cambiar la variable requiere reiniciar/re desplegar, no cancela solicitudes ya en curso; registrar operador, motivo y hora en el sistema de incidencias.
- PostgreSQL: límites de conexión, consultas y transacciones inactivas para acotar bloqueos.
- `/api/health`: disponibilidad del proceso y configuración; `/api/ready`: también comprueba almacenamiento. No devuelve datos de cuentas ni configuración. Readiness usa una transacción del agregado y debe sondearse con moderación (p. ej. cada minuto).
- `node scripts/staging-check.mjs https://HOST`: prueba de lectura, disponibilidad, privacidad y caché; no crea órdenes ni mueve fondos.

## Condiciones pendientes antes de exposición real

1. Proveedor de alojamiento y PostgreSQL administrado, acceso restringido, TLS verificado, copias cifradas, retención definida y ensayo de restauración en un entorno aislado. El almacenamiento agregado actual favorece integridad y tiene un límite de escala que debe medirse.
2. Identidades individuales de operadores, MFA, recuperación de cuentas y segregación de funciones. El administrador compartido del MVP no es adecuado para un equipo de producción.
3. Proveedor de correo/push: remitente y dominio verificados, consentimiento/preferencias, cola persistente, reintentos e idempotencia. No exponer datos de contrapartes en mensajes.
4. Proveedor de KYB/sanciones y proveedor regulado de pagos: contratar y validar corredores, comisiones, conciliación, firma de eventos, eventos repetidos/fuera de orden, plazos y disputas. Configurar inicialmente credenciales sandbox por gestor de secretos.
5. Supervisión externa, alertas, inventario de secretos, rotación, retención de auditoría y respuesta a incidentes. La auditoría actual comparte almacenamiento con el estado y no es un registro inmutable externo.
6. Pruebas sobre staging con PostgreSQL: recorrido E2E, concurrencia/carga representativa, fallo de proveedor, caídas de red, recuperación y restauración. Revisión de seguridad independiente antes del lanzamiento.
7. Evaluación legal por jurisdicción y aprobación explícita antes de implementar o habilitar fondos reales.

## Procedimiento de incidencia

Pausar operaciones; confirmar que las lecturas siguen disponibles y los comandos devuelven 503; preservar datos/logs sin publicarlos; investigar y reconciliar; restaurar únicamente en un destino aislado durante el ensayo; reabrir con autorización del responsable y registrar el incidente. No borrar el estado para solucionar un acceso.

## Integraciones

El único adaptador de pagos actual es el mock. No se configura un webhook genérico que pueda acreditar pagos reales sin contrato de proveedor. Las integraciones externas y pruebas de producción permanecen pendientes hasta disponer de los servicios y del entorno elegidos. No existe despliegue nuevo como parte de esta revisión local.
