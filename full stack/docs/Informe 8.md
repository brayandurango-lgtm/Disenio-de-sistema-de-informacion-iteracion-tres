# Matriz de trazabilidad — Autos Colombia (iteraciones 1–3)

> Fecha: **2026-11-13**. Traza cada requisito/decisión aprobada hacia su
> implementación y su evidencia de prueba. No se marca nada como "probado en
> ejecución" si la prueba no se ejecutó.

## Leyenda de estado

| Código | Significado |
|---|---|
| **[U]** | Implementado y cubierto por prueba **unitaria ejecutada** (17/17 en verde). |
| **[I]** | Implementado y **verificado por la suite de integración contra MySQL ejecutada el 2026-11-13** (17/17 en verde). |
| **[C]** | Implementado y verificado por **lectura de código/DDL**; sin prueba automatizada del flujo. |
| **[P]** | Pendiente de verificación en un entorno distinto (carga, otro SO o despliegue). |

## 1. Autenticación y autorización

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Login con JWT HS256 y expiración | `src/routes/auth.js`, `src/middleware/auth.js`, `src/config.js` | integración "auth: login válido e inválido"; unit `password.test.js` | [I] |
| Hash bcrypt (costo 12), nunca en texto plano ni en respuestas | `src/auth/password.js`, `src/routes/usuarios.js` | unit `password.test.js`; `GET /auth/yo` omite `password_hash` | [U] |
| Roles `administrador`/`operador` y autorización por operación | `src/middleware/auth.js` (`requiereRol`), rutas | integración "operador no puede crear usuarios ni anular pagos" | [I] |
| Usuario desactivado no puede operar | `src/middleware/auth.js` recarga usuario en cada petición | lectura de código | [C] |
| Tokens emitidos antes de cambiar contraseña quedan inválidos | claim `pwd` = huella SHA-256 del hash; revalidado en cada petición | unit "huellaPassword cambia cuando cambia el hash" | [U] |
| Token anterior rechazado por el API tras cambiar contraseña | `middleware/auth.js` compara `pwd` contra el hash actual | integración "cambio de contraseña invalida tokens anteriores" | [I] |
| Sin credenciales por defecto en el repositorio | `src/scripts/create-admin.js`; `.env.example` con marcadores | lectura de código | [C] |
| Límite de intentos de login (5/IP+usuario/15 min) | `src/middleware/loginLimiter.js` | integración "auth: bloqueo tras 5 intentos fallidos" | [I] |

## 2. Clientes, usuarios, vehículos y novedades

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Cliente distinto de cuenta de acceso | tablas `clientes` y `usuarios`; `usuarios.cliente_id` opcional | integración "clientes: CRUD…" | [I] |
| Documento de cliente único | `migrations/001` UNIQUE; `src/routes/clientes.js` | integración "CRUD y duplicado de documento" | [I] |
| Crear/editar cuentas solo administrador | `src/routes/usuarios.js` | integración "operador no puede crear usuarios…" | [I] |
| Cambio de contraseña propio o por admin | `POST /api/usuarios/:id/cambiar-password` | lectura de código | [C] |
| Un cliente puede tener varios vehículos | FK `vehiculos.cliente_id`; `src/routes/vehiculos.js` | integración "vehiculos: crear…" | [I] |
| Placa normalizada y única | `src/utils/placa.js`; UNIQUE en DDL | unit `placa.test.js`; integración "placa duplicada" | [U] |
| Edición de placa permitida con auditoría | `PATCH /api/vehiculos/:id` + `auditoria_operaciones` | lectura de código | [C] |
| Novedades por vehículo con fecha y responsable | `src/routes/novedades.js` | integración "novedades: registrar y listar" | [I] |

## 3. Celdas y estancias

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Celda debe estar `habilitada` y libre para entrar | `src/routes/estancias.js` | integración "estancias: … celda ocupada" | [I] |
| Una estancia abierta por vehículo | columna generada + UNIQUE en DDL; bloqueo del vehículo | integración "doble entrada mismo vehículo" y "ocupación concurrente" | [I] |
| Una estancia abierta por celda | columna generada + UNIQUE en DDL | integración "celda ocupada" y "ocupación concurrente" | [I] |
| Ocupación concurrente (misma celda / mismo vehículo) | bloqueos `FOR UPDATE` + UNIQUE de columna generada | integración "ocupación concurrente…" con conteo final en BD | [I] |
| Salida cierra estancia y libera celda | `POST /api/estancias/:id/salida` | integración "… salida" | [I] |
| No deshabilitar celda ocupada | `PATCH /api/celdas/:id` valida estancia abierta | integración "celdas: … deshabilitar ocupada" | [I] |
| Entrada vs. deshabilitación concurrente serializadas | ambos bloquean la fila de la celda (`FOR UPDATE`) | lectura de código | [C] |
| Estado de celda independiente de la ocupación | `celdas.estado` + ocupación derivada en consulta | integración "listar con ocupación" | [I] |

## 4. Contratos

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Un contrato = un vehículo + un cliente responsable | `contratos_mensualidad` | integración "contratos: crear…" | [I] |
| Sin contratos vigentes con periodos superpuestos | validación en `src/routes/contratos.js` | integración "solape rechazado", "solape concurrente" y conteo final en BD | [I] |
| `fecha_inicio` día 1; `fecha_fin` último día o NULL | `src/utils/periodos.js` (`periodosDeVigencia`) | unit `periodos.test.js` | [U] |
| Tarifa mensual registrada en el contrato | `tarifa_mensual DECIMAL(12,2)` | lectura de DDL | [C] |
| Cambiar tarifa no altera obligaciones ya generadas | importe copiado a la obligación al generar | lectura de código | [C] |
| PATCH concurrente no genera solape | bloqueo vehículo → contrato (mismo orden que creación) | lectura de código | [C] |

## 5. Obligaciones

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Mensualidad por mes calendario `YYYY-MM` | `src/utils/periodos.js` | unit `periodos.test.js` | [U] |
| Generación explícita (endpoint, no tarea automática) | `POST /api/contratos/:id/obligaciones/generar` | integración "generación explícita, idempotencia, vigencia" | [I] |
| `dia_vencimiento` 1–28 u overrides por periodo | `src/routes/obligaciones.js` | lectura de código | [C] |
| `UNIQUE(contrato_id, periodo)` impide duplicados | DDL + `INSERT ... ON DUPLICATE` | integración "idempotencia" | [I] |
| Periodos dentro de la vigencia del contrato | validación en servicio | integración "vigencia" | [I] |
| `vencida` calculada, no almacenada | `estado_efectivo` con `hoyBogota()` | lectura de código | [C] |
| Importes exactos `DECIMAL(12,2)` y cadena decimal en API | `src/utils/dinero.js`, `mysql2 decimalNumbers:false` | unit `dinero.test.js` | [U] |

## 6. Pagos y correcciones

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Pago manual, medios `efectivo`/`transferencia`, moneda COP | `src/routes/pagos.js` | integración "pagos: válido…" | [I] |
| Un pago cubre una sola obligación completa | FK `obligacion_id`; sin abonos | lectura de código | [C] |
| Un solo pago válido por obligación (también concurrente) | `SELECT … FOR UPDATE` + UNIQUE sobre obligación válida | integración "pago simultáneo" + un solo confirmado en BD | [I] |
| Monto enviado debe coincidir con la obligación | validación en `src/routes/pagos.js` | integración "monto incorrecto" | [I] |
| Reintento idempotente con `clave_idempotencia` | UNIQUE + respuesta 200 con pago existente | integración "idempotencia" | [I] |
| Misma clave con datos distintos → 409 | `IDEMPOTENCIA_CONFLICTO` | lectura de código | [C] |
| Obligación ya pagada con clave nueva → 409 | `OBLIGACION_YA_PAGADA` con `pago_existente` | integración "duplicado concurrente" | [I] |
| Comprobante `CMP-AAAA-NNNNNN` sin duplicados | `secuencias_comprobante` (migración 002) + `FOR UPDATE` | integración "comprobante" | [I] |
| Anulación solo administrador, con motivo | `POST /api/pagos/:id/anular` | integración "anulación solo admin…" | [I] |
| Anulación atómica y obligación vuelve a pendiente | transacción, mismo orden de bloqueo obligación → pago | integración "nuevo pago posterior" | [I] |
| Auditoría de pago/anulación | `auditoria_operaciones` (acciones `registrar` y `anular`) | integración "anulación… y auditoría" consulta la tabla | [I] |
| Fecha de pago no más de 5 min en el futuro | validación en servicio | lectura de código | [C] |

## 7. Transversales

| Requisito / decisión | Implementación | Evidencia | Estado |
|---|---|---|---|
| Hora local Colombia UTC-5 fijo | `src/utils/fechas.js`, `dateStrings:true` | unit `fechas.test.js` | [U] |
| Normalización ISO (offset, naïve, fecha sola, ms) | `aHoraBogota` | unit `fechas.test.js` | [U] |
| Consultas parametrizadas (sin concatenar SQL) | rutas + `mysql2` placeholders | revisión de código | [C] |
| Errores centralizados sin filtrar detalles sensibles | `src/errors.js`, `src/middleware/errorHandler.js` | lectura de código | [C] |
| Paginación y filtros en listados | `src/utils/paginacion.js` | lectura de código | [C] |
| Deuda genera alerta sin bloquear entradas/salidas | `GET /api/resumen/cliente/:id` | integración "deuda del cliente" | [I] |
| Estado final en BD tras operaciones concurrentes | consultas de solo lectura en las pruebas (`consultaDb`) | integración: conteos posconcurrencia de estancias, contratos y pagos | [I] |

## 8. Resumen de cobertura de estado

| Estado | Cantidad |
|---|---|
| [U] aprobado por prueba unitaria ejecutada | 8 requisitos |
| [I] verificado por integración ejecutada (17/17) | 32 requisitos |
| [C] implementado, verificado solo por lectura | 16 requisitos |
| Total de filas de la matriz | 56 |
| Verificado de punta a punta contra MySQL | **suite 17/17 (no cobertura total)** |

Las filas [I] se ejercitaron en la suite ejecutada el 2026-11-13 sobre la base
`_test` (MySQL 8.0.46). Las filas [C] siguen sin prueba automatizada directa;
no deben interpretarse como cobertura completa ni como ausencia de errores.
Ver `plan-pruebas.md` §3 y `cierre-backend.md` §4.
