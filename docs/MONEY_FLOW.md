# Flujo contable de simulación

Este documento define estados de software y dinero ficticio; no representa un flujo de pagos real autorizado.

## Órdenes

Empresa KYB_PENDING → revisión del administrador → VERIFIED.
Orden COMPLIANCE_REVIEW → aprobación → AWAITING_FUNDING → fondeo simulado → OPEN.
Solo OPEN y PARTIALLY_MATCHED participan en matching. Se ordenan por fecha y después ID para desempatar; se omiten cruces dentro de la misma empresa. Cada ejecución añade únicamente asignaciones del remanente disponible.

Una asignación pertenece a un solo lote. Los lotes tienen dos instrucciones por asignación: Cuba y EE. UU. Cada instrucción tiene un identificador estable usado como referencia por el proveedor mock. La conciliación verifica la correspondencia de orden, asignación, lado, importe, moneda, referencia única dentro del lote y fondeo previo.

FULLY_MATCHED → SETTLEMENT_PENDING al crear el lote → SETTLED cuando el principal liquidado alcanza el total. Una orden parcial conserva su remanente disponible aunque un lote anterior esté cerrado. Los importes `matchedMinor` y `settledMinor` nunca se reinician.

## Importes y comisiones

Se aceptan cadenas decimales y se convierten por separación de parte entera y centavos. No se usa aritmética flotante para calcular comisiones: se usa BigInt, puntos básicos y redondeo half-up a centavos. El MVP aplica 400 bps (4%) a cada orden. `formatUsd` muestra dos decimales.

Ejemplo: principal $1.000,01; comisión $40,00; fondeo $1.040,01.

Fondeo:

- Debe `sandbox:clearing`: principal + comisión.
- Haber `liability:<orderId>`: principal + comisión.

Liquidación por instrucción:

- Debe `liability:<orderId>`: principal liquidado + comisión proporcional.
- Haber `sandbox:clearing`: principal liquidado.
- Haber `sandbox:fee-revenue`: comisión proporcional.

La comisión de un parcial es la diferencia entre la comisión calculada sobre el acumulado nuevo y el acumulado anterior. Así, la suma de parciales equivale exactamente a la comisión total. La comisión pendiente permanece como pasivo hasta liquidar el remanente.

Cada asiento tiene referencia única. Se rechazan importes negativos, fraccionarios, no finitos, fuera del rango entero seguro, asientos vacíos, líneas sin movimiento, líneas con debe y haber simultáneos y asientos desequilibrados. Cualquier excepción durante el comando revierte la transacción.

No hay devolución de fondos ni cancelación de órdenes fondeadas en esta versión.
