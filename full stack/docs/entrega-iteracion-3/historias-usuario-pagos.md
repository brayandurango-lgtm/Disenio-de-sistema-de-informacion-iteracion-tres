# Historias de usuario — pagos

Proyecto académico basado en el caso del parqueadero Autos Colombia. Cliente es dato, no actor de acceso. Mockup local en mockups/fuentes/pagos.html. Las pruebas señaladas como históricas no se reejecutaron en Etapa 2.

Alias de trazabilidad: RF-001..012 = RF-PAG-001..012; HU-001..009 = HU-PAG-001..009; UC-01..05 = UC-PAG-01..05; TP-01..14 = TP-PAG-01..14.

## HU-PAG-001 — Consultar cartera
Como operador, quiero consultar obligaciones por periodo/estado para identificar mensualidades que requieren gestión. RF-001/002/004; prioridad alta; pre: sesión. Aceptación: Dado cartera diversa, cuando filtro, entonces veo cliente/contrato/vehículo/periodo/importe/estado coincidentes; inválido genera error y vacío se informa. Alternos: 400 o lista vacía. Pantalla obligaciones; UC-PAG-01; GET /api/obligaciones y /:id; TP-01/02 histórico.

## HU-PAG-002 — Generar obligaciones
Como operador, quiero generar explícitamente mensualidades de un contrato vigente para preparar el recaudo. RF-003; alta; pre: contrato vigente. Aceptación: periodos/rango válido crea faltantes y omite duplicados; contrato cancelado/fuera vigencia se rechaza. Pantalla Contratos; UC-01; POST /api/contratos/:id/obligaciones/generar; TP-03 histórico.

## HU-PAG-003 — Registrar recaudo manual
Como operador, quiero registrar pago completo en efectivo o transferencia reportada para dejar constancia del recaudo. RF-005/011/012; crítica; pre: pendiente/sesión. Aceptación: Dado importe mostrado, al confirmar, entonces servidor confirma y entrega comprobante antes de mostrar éxito. Método/monto inválido no crea pago. Transferencia no verifica banco. Pantalla Pago; UC-02; POST /api/pagos; TP-05/06 histórico y flujo de sesión previa.

## HU-PAG-004 — Reintentar resultado incierto
Como operador, quiero reintentar con la clave original si se corta la red para no duplicar el cobro. RF-006; crítica; pre: solicitud sin respuesta concluyente. Aceptación: mismo UUID/payload devuelve el mismo pago o procesa una vez; payload distinto con misma clave produce 409 IDEMPOTENCIA_CONFLICTO. La UI retiene UUID en memoria; no garantiza tras recarga. Pantalla incierto; UC-02; POST /api/pagos; TP-07, unit previo/backend histórico.

## HU-PAG-005 — Evitar pago duplicado
Como operador, quiero saber si una obligación está pagada para no cobrarla de nuevo. RF-006/012; crítica. Aceptación: nueva clave ante pagada da 409 OBLIGACION_YA_PAGADA; solicitudes concurrentes dejan como máximo un pago válido. Pantalla Obligaciones; UC-02; POST /api/pagos; TP-08 histórico.

## HU-PAG-006 — Revisar historial
Como operador, quiero consultar historial y comprobante interno para responder consultas. RF-007; alta; pre: pago existente/sesión. Aceptación: detalle identifica importe, método, fecha, obligación y estado; recibo dice interno/no factura electrónica. Pantalla Historial; UC-03; GET /api/pagos y /:id/comprobante; TP-09 histórico.

## HU-PAG-007 — Corregir pago
Como administrador, quiero anular con motivo para corregir un registro y conservar auditoría. RF-008/011/012; alta; pre: pago confirmado. Aceptación: motivo 1–300; servidor confirma cambio/auditoría; operador recibe 403 sin mutación; repetición rechazada. Pantalla Anulación; UC-04; POST /api/pagos/:id/anular; TP-10 histórico. No devuelve dinero.

## HU-PAG-008 — Recaudar después de anulación
Como operador, quiero pagar una obligación que volvió a pendiente para completar el recaudo correcto. RF-009; alta; pre: anulación confirmada. Aceptación: UUID nuevo genera recibo nuevo y previo permanece anulado. Pantalla Obligaciones; UC-04; POST /api/pagos; TP-11 histórico.

## HU-PAG-009 — Informar deuda
Como operador, quiero consultar el resumen de deuda para informar al cliente sin bloquear entradas/salidas. RF-010; media; pre: cliente/sesión. Aceptación: desglose vencidas/pendientes COP y estancias; mora es alerta. UC-05; GET /api/resumen/cliente/:id; TP-12 histórico.

