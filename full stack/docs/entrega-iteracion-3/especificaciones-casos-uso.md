# Casos de uso — Iteración 3

Alias de referencias: RF-001..012 = RF-PAG-001..012. Casos identificados como UC-PAG-01..05.

Límite: Autos Colombia — Gestión de Parqueadero. Proyecto académico basado en el caso Autos Colombia. Actores: operador y administrador autenticados. Cliente es dato asociado; no es usuario de acceso. No hay actor bancario.

## UC-PAG-01 Gestionar obligaciones
**Propósito:** consultar/generar mensualidades. **Actor:** operador/admin. **Pre:** bearer válido; contrato vigente para generar. **Flujo:** abrir Contratos/Pagos, filtrar y ver detalle; opcionalmente indicar periodos/rango y día de vencimiento; confirmar solicitud y mostrar respuesta. **Alternos:** vacío, filtro inválido, contrato cancelado/vigencia inválida; repetidos omitidos. **Post:** consulta sin mutación; generación crea faltantes y audita. RF-001…004.

## UC-PAG-02 Registrar pago
**Propósito:** registrar pago manual completo. **Actor:** operador/admin. **Pre:** sesión y obligación pendiente. **Flujo:** seleccionar obligación, verificar importe/método, confirmar; UI envía UUID; middleware autentica; ruta valida; transacción bloquea obligación FOR UPDATE; revisa idempotencia/estado; persiste pago y consecutivo, actualiza obligación y auditoría; commit; responde 201. **Alternos:** UUID equivalente 200; incompatible/pagada 409; validación o SQL falla y rollback; red incierta, retry usa UUID original en memoria. **Post:** máximo un pago válido, COP exacto/auditoría. RF-005/006/011/012.

## UC-PAG-03 Consultar historial/comprobante
**Propósito:** localizar/revisar pago. **Actor:** operador/admin. **Pre:** sesión. **Flujo:** filtrar historial, elegir registro, abrir comprobante interno. **Alternos:** 400 filtro, 404 pago, error de red sin éxito ficticio. **Post:** sin mutación. RF-007/012.

## UC-PAG-04 Anular y re-pagar
**Propósito:** corrección auditada y nuevo recaudo. **Actor:** admin anula; personal puede repagar. **Pre:** pago confirmado y motivo. **Flujo:** admin confirma motivo; middleware exige admin; ruta valida; transacción bloquea obligación/pago, anula, actualiza obligación/auditoría; commit; luego operación de pago con clave nueva. **Alternos:** operador 403, motivo inválido, ya anulado, rollback. **Post:** anterior permanece anulado, comprobante de repago distinto. RF-008/009/011/012.

## UC-PAG-05 Consultar resumen
**Propósito:** informar deuda sin bloqueo operativo. **Actor:** operador/admin. **Pre:** sesión/cliente existente. **Flujo:** consultar desglose de pendientes/vencidas y estancias, mostrar COP. **Alternos:** 400/404/error lectura. **Post:** sin mutación. RF-010/012.

## Modelo editable
No existe StarUML detectable ni archivo .mdj. La fuente casos-uso-iteracion-3.puml es auxiliar y no sustituye .mdj. Brayan debe abrir/convertir/verificar en StarUML; no se declara este requisito satisfecho.
