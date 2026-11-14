# Pendientes y riesgos — Autos Colombia

## 1. Estado de pendientes

| # | Tema | Estado | Resolución |
|---|---|---|---|
| 1 | Autenticación y hash | **Resuelto** | JWT Bearer (HS256, `JWT_SECRET`, `JWT_EXPIRES_IN`) + bcryptjs (costo 12). Login con límite de intentos. `create-admin` crea el admin inicial sin contraseña en repo |
| 2 | `fecha_vencimiento` | **Resuelto** | Explícita al generar: `dia_vencimiento` (1-28) obligatorio u overrides `vencimientos{periodo:fecha}` |
| 3 | Edición de placa | **Resuelto** | Permitida vía PATCH con registro en `auditoria_operaciones` (`cambiar_placa`, placa anterior/nueva) |
| 4 | Consecutivo comprobante | **Resuelto** | `CMP-AAAA-NNNNNN` por año; tabla `secuencias_comprobante` con bloqueo de fila (sin `MAX()+1`) |
| 5 | Prorrateo | Excluido | `fecha_inicio` día 1 de mes, `fecha_fin` último día o NULL (validado en servicio) |
| 6 | Deuda al entrar | Alerta sin bloqueo | Implementado en `/api/resumen/cliente/:id` |
| 7 | Anular pago | **Resuelto** | Solo administrador; atómico; obligación vuelve a pendiente |
| 8 | Tipos de celda | Catálogo mínimo | `cubierta`/`techada`; ampliar requiere migración del ENUM |
| 9 | Búsqueda por placa en pagos | Cubierto | joins en listados de pagos/obligaciones |
| 10 | Diagramas StarUML (.mdj) | Pendiente | Fuera del alcance del backend; documentado para el equipo |
| 11 | Tokens viejos tras cambio de contraseña | **Resuelto (2026-11-13)** | El token lleva `pwd` (huella SHA-256 truncada del `password_hash`); `middleware/auth.js` la revalida en cada petición → `401 NO_AUTENTICADO` si la contraseña cambió o el usuario se desactivó. Sin migración: no se guarda nada adicional |
| 12 | Deshabilitar celda vs. entrada concurrente | **Resuelto (2026-11-13)** | `POST /api/estancias` bloquea la fila de la celda (`SELECT ... FOR UPDATE`) igual que `PATCH /api/celdas/:id`; se serializan |
| 13 | Contratos solapados por PATCH concurrente | **Resuelto (2026-11-13)** | `PATCH /api/contratos/:id` bloquea primero el vehículo y luego el contrato, mismo orden que `POST /api/contratos` |
| 14 | Fechas ISO sin minutos / con milisegundos / inexistentes | **Resuelto (2026-11-13)** | `aHoraBogota` acepta `AAAA-MM-DD`, minutos opcionales y `.mmm`; rechaza fechas inexistentes (`2026-02-31`). Cubierto en pruebas unitarias |
| 15 | Herramientas auxiliares | Parcial | Java: 14 pruebas JUnit y ejecución contra la API de pruebas (CSV coincide con BD). Python: escrito con pruebas, **no ejecutado** (no hay intérprete). Ver `cierre-backend.md` §6 |
| 16 | `back end/.env` ausente | **Resuelto (2026-11-13)** | Brayan completó `.env`; claves verificadas sin imprimir valores. Se corrigió el formato `DB_USER` (`root@localhost` → `root`). Queda cambiar `root` por una cuenta con solo DML antes de producción |
| 17 | Verificación y migraciones MySQL | **Resuelto (2026-11-13)** | Conexión autenticada, `SELECT VERSION()` = 8.0.46. Principal vacía migrada (11 tablas) y `_test` creada/migrada. Script controlado `src/scripts/aplicar-migraciones.js`; la principal no se recreó ni recibió datos ficticios |
| 18 | Cobertura de integración | **Resuelto (2026-11-13)** | 17 pruebas escritas y **17/17 ejecutadas** contra MySQL, incluye ocupación concurrente, estado final en BD, auditoría, idempotencia y bloqueo de login |
| 19 | Defectos hallados al ejecutar | **Resueltos (2026-11-13)** | Limitador de login bloqueaba tras un fallo; `POST /clientes` exigía campos opcionales; router de novedades mal montado (404); prueba de concurrencia con columna inexistente. Todos corregidos y cubiertos |
| 20 | Administrador de la base principal | Pendiente local | `npm run create-admin` (interactivo) no se ejecutó; el flujo se validó con usuarios ficticios de `_test` |
| 21 | Traspaso a Antigravity | Preparado | `full stack/docs/traspaso-antigravity.md` con arquitectura, contrato, ejemplos, CORS y matriz de pantallas |

## 2. Riesgos técnicos (estado)

| Riesgo | Mitigación implementada |
|---|---|
| MySQL < 8.0.16 (CHECK) / < 8.0.13 (generadas) | `SELECT VERSION()` autenticado = 8.0.46; requisito cumplido |
| Concurrencia en pagos | `SELECT ... FOR UPDATE` sobre obligación + `UNIQUE(obligacion_valida_id)` + `UNIQUE(clave_idempotencia)` |
| Doble ocupación de celda/vehículo | Columnas generadas + UNIQUE; entrada también bloquea fila del vehículo |
| Doble clic / reintento de pago | `clave_idempotencia` UNIQUE + respuesta idempotente 200 |
| Precisión monetaria | `DECIMAL(12,2)` + cadenas en API + sumas con BigInt |
| Zona horaria | DATETIME hora Bogotá (UTC-5 fijo); `dateStrings:true`; normalización ISO en API |
| Comprobante duplicado | `secuencias_comprobante` con `INSERT ... ON DUPLICATE KEY UPDATE` + `FOR UPDATE` |
| Tablas preexistentes | Script sin `IF NOT EXISTS`; verificar `SHOW TABLES` antes de aplicar |
| `vencida` no almacenada | Calculada (`pendiente` + `fecha_vencimiento < hoyBogota()`) |
| Sesión válida tras cambio de contraseña | Huella `pwd` en el JWT revalidada contra `password_hash` en cada petición |
| Entrada vs. deshabilitar celda | Ambos bloquean la fila de la celda con `FOR UPDATE` |
| Solape de contratos por PATCH | Bloqueo vehículo → contrato en el mismo orden que la creación |
| Limpieza accidental de la base principal | Guardas por nombre exacto, `TEST_MODE`, `ALLOW_TEST_DB_RESET` y `SELECT DATABASE()` en la conexión |
| Migración redirigida por error | 001/002 no contienen `USE` ni nombre de base en SQL ejecutable; se aplican sobre el esquema seleccionado |
| `.env.test` con secretos | Contiene un `JWT_SECRET` exclusivo de pruebas (no reutiliza el principal); las credenciales `DB_*` se heredan de `.env`. Ambos archivos están en `.gitignore` |

## 2.1 Correcciones aplicadas el 2026-11-13

Cambios dentro del alcance del backend, sin alterar reglas de negocio aprobadas
ni el contrato de API (solo se documenta el comportamiento de `pwd` y de
`desde/hasta`):

1. `src/auth/password.js`: `huellaPassword(hash)` (SHA-256 truncado a 24 hex).
2. `src/middleware/auth.js`: `emitirToken` incluye `pwd`; la verificación
   rechaza tokens con huella distinta o usuario inactivo/inexistente.
3. `src/routes/estancias.js`: la entrada bloquea la celda antes de validar
   estado/ocupación.
4. `src/routes/contratos.js` (PATCH): bloqueo de vehículo previo al contrato
   para impedir solapes concurrentes.
5. `src/utils/fechas.js`: normalización ISO más estricta (fecha sola, minutos
   opcionales, milisegundos, fechas inexistentes).
6. Pruebas unitarias nuevas: `test/unit/password.test.js` y casos añadidos en
   `test/unit/fechas.test.js`. Total unitario: 17/17 en verde.

## 2.2 Cierre técnico: cambios del 2026-11-13 (segunda pasada)

Sin módulos de negocio nuevos ni cambios de reglas:

1. `test/integration/helpers.js`: conexión de pruebas centralizada con
   `SELECT DATABASE()` obligatorio; helper de solo lectura `consultaDb` para
   validar el estado final en la base.
2. `src/scripts/seed-test-users.js`: verifica `SELECT DATABASE()` antes de
   sembrar usuarios ficticios.
3. `test/integration/api.test.js`: se añadieron 2 pruebas (ocupación
   concurrente de celda/vehículo y cambio de contraseña que invalida tokens) y
   aserciones directas en BD para concurrencia de contratos, pagos y auditoría.
   Total integración a esa fecha: 16 escritas, 0 ejecutadas (resuelto en §2.3:
   17/17 ejecutadas el mismo día).
4. `back end/.env.test`: archivo sin secretos con `TEST_MODE`,
   `ALLOW_TEST_DB_RESET` y `DB_NAME=_test`; credenciales heredadas de `.env`.
5. `.gitignore`: agrega `.env.test`.
6. `src/scripts/inspeccionar-bd.js`: inspección de solo lectura (versión,
   `DATABASE()`, tablas, conteos y estado de migraciones) usando mysql2.
7. Verificación de entorno: servicio `MySQL80` en ejecución y binario 8.0.46;
   precedencia `.env.test` > `.env` comprobada con valores ficticios.
8. Se revisaron 001/002: no contienen `USE`, `DROP`, `TRUNCATE` ni `DELETE`.

## 2.3 Verificación real con MySQL (2026-11-13, tercera pasada)

1. `back end/.env`: completado por Brayan; se corrigió `DB_USER` (incluía
   `@localhost`) sin imprimir valores.
2. `.env.test`: conserva solo la base `_test` y se le agregó un `JWT_SECRET`
   exclusivo de pruebas; `LOGIN_*` no se relaja.
3. Guardas: `SELECT DATABASE()` compara en minúsculas por
   `lower_case_table_names=1`; se añadió `src/scripts/aplicar-migraciones.js`
   con conexión dedicada y detención ante bases no autorizadas o parciales.
4. Migraciones 001/002 aplicadas a la principal (vacía) y a `_test`; 11 tablas
   en cada una. Sin `DROP`/`TRUNCATE` ni datos ficticios en la principal.
5. Defectos corregidos: limitador de login (bloqueaba tras un fallo),
   `POST /clientes` (campos opcionales), montaje de novedades (404) y una
   consulta de prueba con columna inexistente.
6. Integración: **17/17 ejecutadas**; servidor real con salud, 401, login,
   permisos y flujo completo; Java ejecutado contra la API de pruebas con CSV
   coincidente con la BD.
7. Queda: cambiar `root` por una cuenta con solo DML, `create-admin` en la
   principal y Python.

## 3. Limitaciones conocidas

- Rate limit de login es en memoria del proceso (válido para instancia única).
- JWT sin refresh token: al expirar (8h) se renueva con login. Cambiar la
  contraseña invalida los tokens anteriores de inmediato (no espera expiración).
- El seed con datos ficticios y credenciales de prueba es SOLO para la base
  `_test`; la base principal está migrada y sin administrador todavía.
- `.env` usa `DB_USER=root`; debe cambiarse por una cuenta con solo DML antes
  de operar fuera de pruebas.
- Cobertura: la suite 17/17 cubre los flujos acordados, no carga real,
  caída de MySQL ni recuperación.
- Herramienta Python sin ejecutar (no hay intérprete disponible en el equipo).
- Herramienta Java verificada con JUnit/JAR y contra la API de pruebas; no se
  probó contra la base principal (sin administrador).
- Publicación en GitHub/URL: pendiente de Brayan; no se inventó ninguna URL.
