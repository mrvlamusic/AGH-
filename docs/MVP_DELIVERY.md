# Revisión y entrega del MVP

## Problemas corregidos

1. Una segunda ejecución de matching borraba asignaciones y abría otra vez las órdenes: ahora el comando es incremental y conserva acumulados.
2. Los mismos pagos podían pasar por varios lotes: cada asignación tiene un único batchId; los lotes cerrados no se vuelven a procesar.
3. La reconciliación afirmaba verificar un ledger inexistente: ahora valida instrucciones y registra asientos balanceados dentro de la misma transacción.
4. El frontend mantenía órdenes y auditoría solo en memoria: ahora los guarda en servidor.
5. El cliente podía aprobar su KYB y ver contrapartes: ahora existen roles, aprobación de operaciones y proyecciones privadas.
6. La contabilidad aceptaba valores inválidos: se validan centavos enteros, saldo, líneas y equilibrio.
7. Admin y portal mostraban libros diferentes: ambos consultan la misma API y persistencia.
8. No había lockfile ni pruebas del recorrido completo: se incorpora instalación congelada y suites de dominio, almacenamiento, autenticación y navegador.

## Decisiones de alcance

- Unificar servidor y web en Next.js; retirar el esqueleto NestJS y Prisma no conectado.
- Portal en español y adaptable a móvil, con avisos de simulación, estados vacíos, errores y confirmaciones visibles.
- Tarifa fija de 4% para evitar que la empresa asigne libremente su tarifa. Cambiar la política requiere versionar condiciones en servidor.
- Invitaciones creadas por un administrador y copiadas manualmente; no se envían emails.
- Sandbox local utilizable sin base de datos externa y adaptador PostgreSQL para el alojamiento.
- Mantener todos los proveedores como mock y datos ficticios.

## Aceptación

El operador puede completar el escenario de $500.000 por lado. Dos empresas invitadas pueden registrarse, ser verificadas, enviar órdenes opuestas y consultar la liquidación sin revelar la contraparte. Repetir comandos, recargar o emitir solicitudes simultáneas conserva integridad. Los límites funcionales restantes están documentados en README.
