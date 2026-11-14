# Requisitos — Gestión de pagos

**Proyecto académico basado en el caso del parqueadero Autos Colombia.** Identidad de presentación: Parqueadero Cyber Automoviles Electronicos. No se recibió aquí el enunciado institucional completo; estos requisitos se derivan de decisiones del equipo, contrato existente y alcance del mensaje 2, no se atribuyen automáticamente al docente.

## Requisitos funcionales

Cada especificación incluye descripción, actor, entradas, precondición, resultado, excepciones, prioridad, origen y verificación.

| ID / nombre | Especificación verificable |
|---|---|
| RF-PAG-001 Consultar obligaciones | Operador/admin consulta y filtra por contrato, periodo, estado y paginación (filtros/page). Pre: bearer válido. Resultado: importe, periodo, vencimiento, cliente, vehículo y estado. Excepción: 400 filtro inválido; vacío informado. Alta; origen: necesidad aprobada/contrato. Aceptación: GET /api/obligaciones devuelve coincidencias; integración histórica, no reejecutada. |
| RF-PAG-002 Ver detalle | Operador/admin consulta asociaciones y pagos de ID. Entrada: ID; pre: sesión/registro existente. Resultado: cliente, contrato, vehículo, periodo, importe, estado, pagos. 400/404. Alta; origen: necesidad de identificar obligación. GET /api/obligaciones/:id; código leído. |
| RF-PAG-003 Generar explícitamente | Operador/admin solicita periodos o rango para contrato vigente; día vencimiento 1–28 y overrides opcionales. Pre: sesión, contrato no cancelado y periodos dentro vigencia. Resultado: crea faltantes e informa omitidas/audita. Excepción: datos/vigencia inválidos y rollback. Alta; decisión del equipo. POST /api/contratos/:id/obligaciones/generar; integración histórica. |
| RF-PAG-004 Consultar estado efectivo | Operador/admin consulta pendiente, vencida derivada (pendiente y vencimiento < hoy Bogotá) o pagada persistida. Entrada: obligación. Resultado consistente en listados/detalle/resumen; errores de consulta informados. Alta; decisión de mora. GET obligaciones/detalle/resumen; código leído, test histórico. |
| RF-PAG-005 Registrar pago completo manual | Operador/admin registra una obligación completa; entradas obligacion_id, método efectivo/transferencia, UUID, fecha opcional, monto opcional. Pre: sesión y obligación pendiente. Resultado: importe fuente servidor, COP, pago confirmado, UUID y CMP-AAAA-NNNNNN. Excepciones: 400 datos/monto/fecha, 404, 409 pagada, rollback. Crítica; decisión aprobada. POST /api/pagos. Transferencia se registra manualmente; no confirma el banco. |
| RF-PAG-006 Idempotencia/duplicidad | Mismo UUID+datos equivale al mismo pago; misma clave con datos distintos se rechaza; no hay dos pagos válidos por obligación. Actor personal; entrada UUID/payload; pre intento previo. Resultado 200 equivalente o 409 IDEMPOTENCIA_CONFLICTO/OBLIGACION_YA_PAGADA. Crítica; contrato/decisión. POST /api/pagos y unique/lock; pruebas históricas. UI conserva UUID en memoria, no tras recarga garantizada. |
| RF-PAG-007 Historial/detalle/comprobante | Operador/admin filtra y consulta pagos. Entrada: filtros/ID; pre sesión. Resultado: estado, método, importe, fecha, obligación; comprobante explícitamente interno y no factura electrónica. Excepciones 400/404. Alta; decisión equipo. GET /api/pagos, /:id, /:id/comprobante; test histórico. |
| RF-PAG-008 Anular pago | Solo admin anula pago confirmado con motivo no vacío de hasta 300 caracteres. Pre sesión admin/pago confirmado. Resultado anulado, usuario/fecha/motivo/auditoría y obligación pendiente dentro de transacción; no devuelve dinero. Excepciones operador 403, datos 400, ausente 404, estado inválido, rollback. Alta; decisión aprobada. POST /api/pagos/:id/anular; código y prueba histórica. |
| RF-PAG-009 Re-pago | Personal registra nuevo pago tras anulación confirmada si la obligación está pendiente y sin otro pago válido. Entrada UUID nuevo. Resultado nuevo recibo, anterior conserva anulado; no elegible 409. Alta; decisión equipo. POST /api/pagos; integración histórica. |
| RF-PAG-010 Resumen deuda | Operador/admin consulta cartera y estancias abiertas por cliente. Entrada ID; pre sesión/cliente existente. Resultado desglose y totales COP; mora no bloquea entrada/salida. 400/404. Media; decisión equipo. GET /api/resumen/cliente/:id; test histórico. |
| RF-PAG-011 Auditoría | Sistema registra actor/entidad/acción de pago o anulación en transacción. Pre operación válida. Resultado auditoría confirma junto al cambio; falla revierte. Alta; decisión trazabilidad. INSERT auditoria_operaciones en pagos.js; inspección y test histórico. |
| RF-PAG-012 Restricción por rol | Rutas exigen autenticación; anular requiere admin. Entrada bearer/acción; usuario activo. Resultado permitido conforme rol; error no muta. 401/403. Crítica; decisión de roles. Middleware + POST anular; pruebas históricas. |

Fuera de alcance: cobro por horas, pagos parciales, pasarela o confirmación bancaria automática, factura electrónica, ventas de vehículos, intereses y descuentos. El catálogo es ilustrativo, no comercial ni parte del recaudo.

## Requisitos no funcionales

| ID | Descripción | Condición observable | Método/entorno | Estado |
|---|---|---|---|---|
| RNF-PAG-001 | Seguridad/permisos | Bearer en rutas; anulación admin; operador 403 | Middleware/ruta y test _test | Código leído; tests históricos |
| RNF-PAG-002 | Credenciales | Sin DB_PASSWORD/JWT/tokens en UI, logs o entregables; .env ignorado | Inspección sin valores y .gitignore | .env excluido; auditoría integral pendiente |
| RNF-PAG-003 | Integridad | Pago/obligación/auditoría confirman juntos o rollback | Transacción y fallo controlado _test | Código leído; histórico reportado |
| RNF-PAG-004 | Concurrencia | Dos pagos simultáneos dejan máximo uno válido | Test paralelo/consulta final _test | Histórico reportado; rerun bloqueado por residuos |
| RNF-PAG-005 | Idempotencia | Retry igual mismo pago; payload diferente 409 | Tests API/UI aislados | Unit frontend en sesión previa; backend histórico |
| RNF-PAG-006 | Exactitud monetaria | DECIMAL y string; no float | DDL/utilidades/tests | Código leído; histórico |
| RNF-PAG-007 | Fechas | Bogotá; pago >5 minutos futuro rechazado | Handler/unitarias | Código leído; histórico |
| RNF-PAG-008 | Trazabilidad | Actor, fecha, motivo/acción y consecutivo | SQL/auditoría _test | Código leído; histórico |
| RNF-PAG-009 | Errores | Sin éxito prematuro; error claro; retry conserva UUID en vista | UI/API/browser | Código leído; browser y recarga pendientes |
| RNF-PAG-010 | Usabilidad/accesibilidad | Labels, foco, teclado, contraste; estado no solo color | Auditoría lector/teclado, móvil/escritorio | CSS/modal existentes; revisión completa pendiente |
| RNF-PAG-011 | Mantenibilidad | Módulos delimitados, no duplicar lógica | Revisión arquitectura | Estructura observada, no mide defectos |
| RNF-PAG-012 | Rendimiento local | **Meta propuesta, no aprobada:** GET de 100 obligaciones <2s p95 | Medir con hardware/volumen definidos | No medido |
| RNF-PAG-013 | Disponibilidad | No se fija SLO de producción | Monitoreo fuera del entorno local | Pendiente; salud local no prueba disponibilidad |
| RNF-PAG-014 | Aislamiento | Nombre exacto _test; identificar propiedad de fixtures antes de borrar | Guardas + conteo antes/después | Guardas backend; flujo frontend deja registros |

