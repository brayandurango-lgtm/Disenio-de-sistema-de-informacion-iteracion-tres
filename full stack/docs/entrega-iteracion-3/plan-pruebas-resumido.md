# Plan resumido de pruebas — formato propio, adaptable

Objetivo: verificar pagos, roles, integridad y presentación. Alcance local, no producción. Entorno esperado: Windows/Node; solo base exacta _test y datos ficticios. Responsables: Brayan backend/BD; Isabella interfaz/mockup; equipo revisión. Entrada: configuración segura, sin ejecución simultánea, conteo previo y propiedad de fixtures identificada. Salida: resultado/evidencia por caso, incidencias y cero cambios a principal. No se encontró plantilla institucional.

Alias compactos: RF1..RF12 = RF-PAG-001..012; HU1..HU9 = HU-PAG-001..009; RNF3 = RNF-PAG-003, RNF8 = RNF-PAG-008 y RNF10 = RNF-PAG-010; TP-PAG-01..14 son IDs completos.

| ID | RF/HU | Objetivo | Precondiciones | Pasos y datos | Resultado esperado | Resultado obtenido | Estado | Evidencia | Responsable/fecha |
|---|---|---|---|---|---|---|---|---|---|
| TP-PAG-01 | RF1/HU1 | Listar/filtrar | Sesión operador | GET periodo/estado válido e inválido | Coincidencias; 400 inválido | No obtenido | No ejecutado Etapa 2 | Ruta obligaciones | Brayan/pendiente |
| TP-PAG-02 | RF2/HU1 | Consultar detalle | Sesión; ID válido/inexistente | GET ambas variantes | Asociaciones completas/404 | No obtenido | No ejecutado Etapa 2 | Ruta obligaciones | Brayan/pendiente |
| TP-PAG-03 | RF3/HU2 | Generar periodo | Contrato vigente | POST periodos; repetir | Crear faltantes, omitir existentes | Informe afirma aprobado; no revalidado aquí | Histórico reportado | Plan backend | Informe/2026-11-13 |
| TP-PAG-04 | RF4/HU1 | Ver estado efectivo | Obligaciones con tres estados | GET listado/detalle | Bogotá: pendiente/vencida/pagada | Informe afirma probado; no revalidado aquí | Histórico reportado | Matriz/plan backend | Informe/fecha reportada |
| TP-PAG-05 | RF5/HU3 | Pago válido | Sesión; obligación pendiente | POST importe exacto, método y UUID ficticio | 201, COP, pagada, comprobante | Flujo API aprobado en ejecución previa; no etapa 2 | Ejecutado sesión anterior | npm test frontend previo | Asistente/sesión anterior |
| TP-PAG-06 | RF5/HU3 | Datos inválidos | Obligación pendiente | POST monto/medio/fecha inválidos | Error, sin efecto parcial | Informe afirma probado; no revalidado | Histórico reportado | Test integración previo | Informe/fecha reportada |
| TP-PAG-07 | RF6/HU4 | Retry/conflicto | Clave UUID del pago | Misma clave igual y luego payload distinto | Mismo pago 200; conflicto 409 | Unit frontend aprobada antes; backend histórico | Parcial, sesión previa | npm test:unit y plan backend | Sesión anterior |
| TP-PAG-08 | RF6/HU5 | Doble cobro/concurrencia | Pendiente; dos solicitudes simultáneas | POST misma obligación con UUID distintos | Como máximo uno vigente | Histórico afirma verificado; no reejecutado | Histórico reportado | Test backend integración | Informe/fecha reportada |
| TP-PAG-09 | RF7/HU6 | Historial y recibo | Pago existente | GET historial/detalle/comprobante | Campos asociados; recibo interno; 404 | Informe afirma probado | Histórico reportado | Test backend | Informe/fecha reportada |
| TP-PAG-10 | RF8/HU7 | Anular y auditar | Pago confirmado; roles distintos | Operador; admin con motivo; vacío y repetición | 403 operador; admin auditado; inválido sin cambio | Informe afirma probado | Histórico reportado | Test backend | Informe/fecha reportada |
| TP-PAG-11 | RF9/HU8 | Repago | Pago anulado/obligación pendiente | POST UUID nuevo | Nuevo comprobante, anterior anulado | Informe afirma probado | Histórico reportado | Test backend | Informe/fecha reportada |
| TP-PAG-12 | RF10/HU9 | Resumen de deuda | Cliente existente con obligaciones | GET resumen | Totales COP y mora no bloqueante | Informe afirma probado | Histórico reportado | Test backend | Informe/fecha reportada |
| TP-PAG-13 | RNF3/8 | Rollback/auditoría | Harness aislado _test | Forzar fallo dentro de transacción y consultar BD | Sin mutación parcial, auditoría atómica | Histórico parcial, no reejecutado | Histórico reportado | Test reversión/auditoría | Brayan/pendiente |
| TP-PAG-14 | RNF10 | Teclado/contraste | Browser disponible | Navegar modal/vistas a 375×667 y escritorio | Labels/foco/estados claros/sin overflow | No obtenido | No ejecutado | Sin captura; browser no revisado | Isabella/pendiente |

## Registro histórico separado

Informes anteriores reportan backend unitarias 17/17, backend integración 17/17 y Java 14/14 (fecha informada 2026-11-13); no reejecutadas aquí. En interacción anterior se ejecutó frontend 10 unitarias, 11 total y build correcto; no reejecutados Etapa 2. El flujo frontend produjo registros persistentes en _test y no los limpia por ID. Pasos HTTP no son tests independientes. Python no ejecutado; alias de Microsoft Store. No hubo ejecución nueva aprobada/fallida durante esta etapa.

## Ejecución Etapa 3 y aislamiento

El helper valida TEST_MODE=1 y el nombre exacto `_test`; antes del flujo se verifica además `SELECT DATABASE()` desde el pool compartido por la API. Cada corrida genera UUID y marcadores exclusivos de cliente, vehículo y celda. El teardown cierra el servidor/pool y borra dentro de una transacción solo IDs derivados de esos marcadores, respetando FK; valida que las entidades raíz ya no existan. No usa `resetDb`, no toca datos desconocidos, usuarios semilla o `secuencias_comprobante`.

| Caso | Resultado Etapa 3 | Evidencia |
|---|---|---|
| Flujo frontend integrado | Aprobado 1/1, primera ejecución; limpieza confirmada | `front end/test/api-integration-flow.test.js` |
| Repetición secuencial | Aprobado 1/1; limpieza confirmada | Mismo test, segunda ejecución independiente |
| Integración backend | No ejecutado: suite llama reset global `resetDb()` | `back end/test/integration/api.test.js` |
| Inspección visual mockup | No ejecutado: navegador no disponible; sin capturas | Fuentes mockup estáticas |

Los demás resultados anotados arriba son históricos, no revalidados en esta etapa. No se ejecutaron suites adicionales.

## Aislamiento histórico Etapa 2

Durante Etapa 2 no se ejecutaron suites ni reset. Helper backend exige TEST_MODE=1, DB_NAME exacto _test y ALLOW_TEST_DB_RESET=1 para reset; verifica SELECT DATABASE(). Flujo frontend crea datos, sin teardown visible. No borrar base completa. Antes de repetir, distinguir fixtures/residuos, añadir ID de ejecución/limpieza acotada y descartar procesos concurrentes. Si no se prueba propiedad, no limpiar ni ejecutar.
