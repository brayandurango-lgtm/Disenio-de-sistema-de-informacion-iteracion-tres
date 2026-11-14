# Informe final — Autos Colombia (iteración 3 / verificación del backend)

> Fecha: **2026-11-13**. Responsable de esta revisión: Qoder (rol de
> desarrollador backend senior / revisor técnico). Continúa el trabajo de
> Devin sin rehacer la arquitectura.
>
> **Declaración de estado (actualizada al 2026-11-13, ver §12):** el backend
> está implementado y **verificado contra MySQL** en una tercera pasada:
> migraciones aplicadas en la base principal y en `_test`, integración
> **17/17 aprobadas** (0 omitidas), flujo HTTP completo y herramienta Java
> ejecutados. Las secciones §1–§11 conservan el historial de las pasadas
> anteriores (cuando aún no existía `.env`); no deben leerse como el estado
> final. Pendientes locales: cuenta `root` en la API y `create-admin` en la
> base principal (ver la viñeta «Pendientes locales» de §12).

## 1. Qué encontraste realmente

El proyecto se inspeccionó en la raíz del workspace, que contiene las carpetas `back end/`, `front end/` y `full stack/`. No se creó una copia ni módulos duplicados.

### 1.1 Afirmaciones del informe anterior vs. realidad

| Afirmación previa | Verificación |
|---|---|
| Express 4 ESM, mysql2 pool, JWT/bcrypt, límite de login, `create-admin`, 3 iteraciones | **Confirmado** por lectura de código (`src/app.js`, `src/db.js`, `src/middleware/*`, `src/scripts/create-admin.js`). |
| Pagos idempotentes, anulación, consecutivo de comprobante, auditoría | **Confirmado** en código (`src/routes/pagos.js`, migración 002). |
| 15 pruebas unitarias | **Confirmado y ampliado**: se ejecutaron **17** (2 nuevas de contraseña/huella). |
| 14 pruebas de integración escritas pero nunca ejecutadas | **Confirmado y ampliado**: 16 escritas, **0 ejecutadas**, 16 omitidas. |
| Migraciones 001/002 nunca aplicadas | **Confirmado**: no hay `.env`, no hay cliente `mysql`, no se aplicó nada. |
| Backend "implementado" | Cierto a nivel de código, pero **sin verificación de punta a punta** contra MySQL. |

### 1.2 Hallazgos corregidos (dentro del alcance)

1. **Sesiones válidas tras cambio de contraseña.** No había invalidación:
   un token emitido antes del cambio seguía sirviendo. Se añadió una huella no
   reversible del `password_hash` al JWT (`claim pwd`) y se revalida en cada
   petición. Sin migración de BD.
2. **Carrera entre entrada de vehículo y deshabilitación de celda.**
   `POST /api/estancias` no bloqueaba la celda; ahora usa
   `SELECT … FOR UPDATE` sobre la celda, igual que `PATCH /api/celdas/:id`.
3. **Solape de contratos por PATCH concurrente.** `PATCH /api/contratos/:id`
   ahora bloquea primero el vehículo y luego el contrato, en el mismo orden
   que la creación.
4. **Normalización de fechas ISO incompleta.** `aHoraBogota` no aceptaba
   fecha sola ni milisegundos, y aceptaba fechas inexistentes. Corregido y
   cubierto con pruebas unitarias.
5. **Documentación sobrevalorada.** README y contrato decían "implementado"
   sin distinguir "probado". Se corrigió la redacción y se añadieron plan de
   pruebas y matriz de trazabilidad.

### 1.3 Restricciones respetadas

- No se tocó `front end/` (Isabella).
- No se creó otra API ni módulos duplicados en otros lenguajes.
- No se borró ni recreó la base principal; no se escribió en ella.
- No se creó `.env`, no se probaron contraseñas vacías ni se adivinaron
  credenciales; no se solicitó contraseña por chat ni se mostró `.env`.
- No se instalaron dependencias globales ni servicios; no se hizo commit,
  push ni publicación externa; no se inventaron URLs de GitHub.

## 2. Archivos creados y modificados

### 2.1 Backend — modificados

| Archivo | Cambio |
|---|---|
| `back end/src/auth/password.js` | Nueva `huellaPassword()` (SHA-256 truncado) para invalidar tokens. |
| `back end/src/middleware/auth.js` | `emitirToken` incluye `pwd`; la verificación rechaza tokens con huella distinta o usuario inactivo; no expone `password_hash`. |
| `back end/src/routes/estancias.js` | Bloqueo de la fila de la celda en la entrada. |
| `back end/src/routes/contratos.js` | PATCH bloquea vehículo → contrato. |
| `back end/src/utils/fechas.js` | Normalización ISO: fecha sola, minutos opcionales, milisegundos, fechas inexistentes. |
| `back end/test/unit/fechas.test.js` | Casos nuevos de fecha sola, milisegundos y fecha inexistente. |

### 2.2 Backend — creado

| Archivo | Contenido |
|---|---|
| `back end/test/unit/password.test.js` | bcrypt hash/verify y cambio de huella al cambiar contraseña. |

### 2.3 Herramienta Python (creada, no ejecutada)

| Archivo |
|---|
| `back end/tools/python/reporte_cartera/reporte_cartera.py` |
| `back end/tools/python/reporte_cartera/tests/test_reporte_cartera.py` |
| `back end/tools/python/reporte_cartera/tests/fixtures/obligaciones_ficticias.json` |
| `back end/tools/python/reporte_cartera/README.md` |

### 2.4 Herramienta Java (creada y verificada)

| Archivo |
|---|
| `back end/tools/java/reporte_recaudos/pom.xml` |
| `back end/tools/java/reporte_recaudos/README.md` |
| `back end/tools/java/reporte_recaudos/examples/pagos_ficticios.json` |
| `back end/tools/java/reporte_recaudos/src/main/java/co/autoscolombia/tools/recaudos/{Main,Config,ApiClient,ApiException,Pago,Pagina,RecaudosService,Resumen,Csv}.java` |
| `back end/tools/java/reporte_recaudos/src/test/java/co/autoscolombia/tools/recaudos/{ApiClientTest,ConfigTest,CsvTest,RecaudosServiceTest,ResumenTest}.java` |

### 2.5 Documentación

| Archivo | Acción |
|---|---|
| `README.md` (raíz) | Reescrito con estado verificado, resultados reales y comandos. |
| `back end/README.md` | Añadido estado verificado 2026-11-13, herramientas y estado de la BD. |
| `.gitignore` | Ignora `target/`, `__pycache__/`, `.venv/` y CSV de salida. |
| `full stack/docs/contrato-api-propuesto.md` | Estado real de pruebas; `pwd` en token; semántica de `desde/hasta`. |
| `full stack/docs/pendientes-y-riesgos.md` | Pendientes 11–15, correcciones del 2026-11-13 y limitaciones. |
| `full stack/docs/plan-pruebas.md` | **Nuevo**: comandos, resultados reales y qué falta. |
| `full stack/docs/matriz-trazabilidad.md` | **Nuevo**: requisito → implementación → prueba → estado. |
| `full stack/docs/informe-qoder.md` | **Nuevo**: este informe. |

`full stack/docs/traspaso-qoder.md` no se modificó: es el documento histórico
de traspaso de Devin. Los cambios de estado están en `pendientes-y-riesgos.md`.

## 3. Migraciones aplicadas y base utilizada

- Migraciones `001_esquema_integrado.sql` y `002_secuencias_comprobante.sql`:
  **no aplicadas**.
- Base de datos usada: **ninguna** (no hubo conexión).
- Base principal `Disenio_de_sistema_de_informacion_iteracion_tres`: **intacta**,
  no se consultó ni se modificó.
- Base de pruebas `..._test`: no se creó ni se tocó.
- Motivo: no existe `back end/.env`, no hay credenciales locales disponibles y
  no hay cliente `mysql` en el PATH. El servidor MySQL sí está escuchando en
  el puerto 3306, pero sin credenciales no se puede operar. Por instrucción
  explícita no se probaron contraseñas vacías ni se adivinaron usuarios.

## 4. Funcionalidades comprobadas

### 4.1 Comprobadas por prueba unitaria ejecutada

- Aritmética monetaria exacta con cadenas decimales (sin `float`).
- Conversión y formato de fechas/horas de Bogotá (UTC-5), incluidos offsets,
  fechas naïve, fecha sola, milisegundos y rechazo de fechas inexistentes.
- Periodos `YYYY-MM`, reglas de vigencia del contrato y generación inclusiva
  de meses.
- Normalización/validación de placa.
- bcrypt (hash/verificación) e invalidación de sesión al cambiar contraseña.

### 4.2 Implementadas y revisadas en código (sin ejecución real)

- Login JWT, roles y autorización por operación; usuario desactivado.
- CRUD de clientes, usuarios, vehículos, novedades, celdas y estancias con las
  reglas de unicidad y estados.
- Contratos sin solape, obligaciones idempotentes por `(contrato, periodo)`,
  vencimiento explícito y estado `vencida` calculado.
- Pagos: un pago válido por obligación, idempotencia por clave, comprobante
  secuencial, anulación solo admin, auditoría y orden de bloqueo.
- Consultas parametrizadas, errores centralizados, paginación y filtros.

### 4.3 No comprobadas de punta a punta

Las 16 pruebas de integración (flujos HTTP + MySQL), la concurrencia real, la
creación del administrador, el arranque del servidor y las migraciones. Ver
`plan-pruebas.md` §6.

## 5. Resultados reales de pruebas

| Suite | Comando | Aprobadas | Fallidas | Omitidas | Ejecutada |
|---|---|---|---|---|---|
| Unitaria backend | `npm test` | **17** | 0 | 16 | Sí (2026-11-13) |
| Integración backend | requiere `.env.test` + MySQL | 0 | 0 | **16** | **No** |
| Java (`reporte_recaudos`) | `mvn test` | **14** | 0 | 0 | Sí (2026-11-13) |
| Python (`reporte_cartera`) | `python -m unittest …` | — | — | — | **No** (sin intérprete) |

Notas honestas:

- Las 17 unitarias no miden cobertura ni validan el API; cubren utilidades.
- Las 16 de integración no cuentan como aprobadas: están omitidas por diseño
  al no cumplirse `TEST_MODE=1` + base `_test`.
- El JAR `target/reporte-recaudos.jar` se generó con `mvn package` y responde
  a `--help`. No se ejecutó contra una API real.

## 6. Estado de las herramientas Python y Java

### Python — `back end/tools/python/reporte_cartera/`

- **Escrita y con pruebas, no ejecutada.** En este equipo Python no está
  instalado (solo el alias de Microsoft Store, que no ejecuta). No se instaló
  nada sin autorización.
- Diseño: solo biblioteca estándar (`urllib`, `csv`, `Decimal`, `unittest`),
  autenticación por token de entorno/usuario-contraseña o `getpass` (nunca
  token por argumento visible), paginación con tope, fecha de corte
  documentada, protección contra inyección de fórmulas CSV, salida UTF-8 con
  BOM y pruebas con HTTP falso y datos ficticios.
- No escribe en MySQL: solo consume el API.

### Java — `back end/tools/java/reporte_recaudos/`

- **Verificada.** 14/14 pruebas en verde; JAR sombreado generado; `--help`
  funcional. JDK 25 en runtime, compilación con `release 17`.
- Diseño: `HttpClient` + Jackson, token solo por variable de entorno o consola
  (`System.console().readPassword`, arreglo de caracteres borrado), paginación
  con tope de 10.000, `BigDecimal` para montos, sanitización de fórmulas CSV,
  salida UTF-8 con BOM y pruebas con datos ficticios.
- Limitación cosmética: acentos ilegibles en consola Windows con page code
  heredado (`chcp 65001` lo resuelve); el CSV no se ve afectado.

## 7. Comandos de ejecución

```bash
# Backend — pruebas unitarias (realmente ejecutado)
cd "back end"
npm test

# Backend — pruebas de integración (pendiente de credenciales)
# crear .env.test con TEST_MODE=1, ALLOW_TEST_DB_RESET=1 y DB_NAME=..._test
node --env-file=.env.test --test "test/integration/*.test.js"

# Backend — ejecución
npm install
npm run create-admin
npm start

# Java — compilar, probar y empaquetar (realmente ejecutado)
cd "back end/tools/java/reporte_recaudos"
mvn test
mvn package
java -jar target/reporte-recaudos.jar --help

# Python — cuando haya intérprete
cd "back end/tools/python/reporte_cartera"
python -m unittest discover -s tests -v
```

## 8. Pendientes y limitaciones

1. **Bloqueante principal:** crear `.env` local y las bases principal y
   `_test`; aplicar migraciones 001/002; ejecutar las 16 pruebas de
   integración. Sin esto no se puede afirmar que el backend funciona con MySQL.
2. No hay cliente `mysql` en el equipo; la aplicación usa `mysql2` (Node), así
   que las migraciones deben aplicarse con otra herramienta (Workbench o el
   cliente que Brayan instale).
3. Python no está instalado: la herramienta de cartera no se ha ejecutado.
4. Las pruebas de concurrencia real (entradas, pagos y PATCH simultáneos) están
   diseñadas y escritas, pero no ejecutadas.
5. Rate limit de login en memoria: válido para una sola instancia.
6. JWT sin refresh token: al expirar se renueva con login; el cambio de
   contraseña invalida tokens de inmediato.
7. Diagramas StarUML (`.mdj`) siguen fuera del alcance del backend.
8. Publicación en GitHub/URL: pendiente de Brayan; no se inventó ninguna.
9. El frontend es responsabilidad de Isabella y no se modificó.

## 9. Instrucciones de integración para Isabella

- **Base URL:** `/api`; JSON en peticiones y respuestas.
- **Autenticación:** `POST /api/auth/login` con
  `{ "nombre_usuario", "password" }` → `{ token, usuario }`. Enviar
  `Authorization: Bearer <token>` en toda llamada autenticada. `GET
  /api/auth/yo` devuelve el usuario actual.
- **CORS:** el backend solo acepta los orígenes de `CORS_ORIGIN` (coma
  separada). Pedir a Brayan que agregue el origen real del frontend, p. ej.
  `CORS_ORIGIN=http://localhost:5173`.
- **Errores:** leer `error.codigo` y `error.mensaje`
  (`VALIDACION`, `NO_AUTENTICADO`, `PERMISO_DENEGADO`, `NO_ENCONTRADO`,
  `DUPLICADO`, `ESTADO_INVALIDO`, `OBLIGACION_YA_PAGADA`,
  `CELDA_NO_DISPONIBLE`, `IDEMPOTENCIA_CONFLICTO`, `DEMASIADOS_INTENTOS`).
  Un `409` no siempre significa error fatal: puede requerir refrescar datos.
- **Montos:** enviar y recibir como cadena decimal (`"120000.00"`); nunca
  convertir a `float` para mostrar o sumar.
- **Fechas:** días como `AAAA-MM-DD`; instantes como ISO 8601 con offset
  `-05:00`. En filtros `desde/hasta`, una fecha sola equivale a las 00:00; para
  incluir un día completo usar `T23:59:59-05:00`.
- **Pagos:** generar un UUID v4 en `clave_idempotencia` **una vez por intento**
  y reutilizarlo en reintentos (no por clic). Un `200` con pago existente es
  éxito idempotente. Un `409 OBLIGACION_YA_PAGADA` indica que ya hay otro pago.
- **Anulación:** solo visible/habilitada para rol administrador.
- **Estados de obligación:** usar `estado_efectivo` (`pendiente` | `pagada` |
  `vencida`), no la columna almacenada, para pintar morosidad.
- **Paginación:** parámetros `pagina` y `tamano`; respetar los metadatos que
  devuelve el listado.
- **Comprobante:** `CMP-AAAA-NNNNNN` es un comprobante interno, **no** una
  factura electrónica.

## 10. Siguiente paso recomendado

1. Brayan crea las bases principal y `_test` vacías, completa `back end/.env`
   y aplica `001_esquema_integrado.sql` y `002_secuencias_comprobante.sql`
   (verificando antes que no existan tablas).
2. Ejecuta `npm run create-admin`, arranca el servidor y valida `/api/salud` y
   `/api/salud/db`.
3. `.env.test` ya existe (sin secretos) apuntando **solo** a la base `_test`;
   completar `back end/.env` y correr las 16 pruebas de integración.
4. Corrige cualquier fallo que aparezca y registra los resultados reales en
   `plan-pruebas.md`.
5. Solo entonces: instalar Python (con autorización), ejecutar la herramienta
   de cartera y publicar el repositorio/URL, actualizando `README.md` con la
   URL real.

## 11. Actualización — cierre técnico del 2026-11-13 (segunda pasada)

Este bloque no agregó módulos de negocio. Cambios y hallazgos:

- **MySQL**: servicio `MySQL80` en ejecución y binario **8.0.46** identificado
  sin autenticarse; `SELECT VERSION()` y la inspección de bases siguen
  pendientes porque `back end/.env` no existe.
- **Migraciones**: 001/002 revisadas; no usan `USE`, no son destructivas y no
  se aplicaron en ninguna base.
- **Configuración**: `back end/.env.test` creado sin secretos; `.gitignore`
  excluye `.env` y `.env.test`; precedencia shell > `.env.test` > `.env`
  comprobada con valores ficticios.
- **Guardas**: `SELECT DATABASE()` obligatorio antes de limpiar/sembrar la base
  de pruebas; helper `consultaDb` para validar estado final en BD.
- **Pruebas**: integración ampliada de 14 a **16** (ocupación concurrente y
  token invalidado por cambio de contraseña), con aserciones directas en BD
  para concurrencia de contratos, pagos y auditoría. Siguen **0 ejecutadas**.
- **Herramientas**: Java 14/14 JUnit y JAR; no se ejecutó contra la API.
  Python sigue sin intérprete y sin ejecutar.
- **Inspección**: nuevo `src/scripts/inspeccionar-bd.js` (solo lectura) para
  versión, `DATABASE()`, tablas, conteos y estado de migraciones.

Detalle completo, comandos y bloqueos en
`full stack/docs/cierre-backend.md`. El backend **no** se declara terminado.

## 12. Actualización — verificación real con MySQL (2026-11-13, tercera pasada)

Brayan completó `back end/.env`; esta pasada ejecutó lo que antes estaba
bloqueado. No se agregaron módulos de negocio ni se publicó nada.

- **Configuración**: claves verificadas sin imprimir valores. Se corrigió
  `DB_USER` (`root@localhost` → `root`) y se detectó que Windows devuelve el
  nombre de base en minúsculas (`lower_case_table_names=1`); las guardas ahora
  comparan case-insensitive. `PORT=3000` estaba libre. `CORS_ORIGIN` tiene un
  origen concreto, sin comodín. `.env.test` conserva solo la base `_test` y se
  le añadió un `JWT_SECRET` exclusivo de pruebas.
- **Bases**: `SELECT VERSION()` = 8.0.46. Principal existía con 0 tablas; `_test`
  no existía. Se aplicaron 001/002 a ambas con un script controlado; 11 tablas
  en cada una. La principal no se recreó ni recibió datos ficticios.
- **Pruebas**: unitarias 17/17; **integración 17/17 ejecutadas, 0 omitidas**;
  Java 14/14 y además ejecutado contra la API de pruebas (5 pagos, totales
  coincidentes con la BD). Python sigue sin intérprete.
- **Defectos corregidos**: limitador de login que bloqueaba tras un solo fallo;
  campos opcionales de cliente exigidos por error; router de novedades mal
  montado (404); consulta de concurrencia con columna inexistente.
- **Servidor real**: salud OK, base conectada, 401 sin token, recorrido
  cliente→vehículo→celda→contrato→entrada/salida→obligación→pago→comprobante→
  anulación→re-pago→resumen completo (19/19). Log sin JWT.
- **Pendientes locales**: cuenta de aplicación distinta de `root`,
  `npm run create-admin` en la principal, Python 3.10+ y traspaso a Antigravity
  (`full stack/docs/traspaso-antigravity.md`).

Con esto el backend deja de estar bloqueado por MySQL. No implica cobertura
total ni ausencia de errores: las pruebas cubren los flujos acordados, no carga
real ni recuperación ante fallos.
