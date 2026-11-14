# Cierre técnico del backend — Autos Colombia (2026-11-13)

> **Estado: verificado con MySQL real.** `back end/.env` fue completado por
> Brayan; ambas bases están migradas y la suite de integración se ejecutó
> **17/17**. Quedan pendientes locales fuera del código: cuenta de aplicación
> distinta de `root` (hoy configurada), administrador de la base principal y
> la herramienta Python (sin intérprete). La verificación de la primera pasada
> (sin `.env`) se conserva en el historial de este documento y en
> `informe-qoder.md`.

## 1. Fecha y entorno de ejecución

| Elemento | Valor verificado |
|---|---|
| Fecha | 2026-11-13 |
| Sistema operativo | Windows 11 (10.0.22631), shell Git Bash |
| Node.js / npm | v26.7.0 / 11.19.0 |
| Java runtime | 25.0.4.1 LTS; compilación Maven con `release 17` |
| Maven | disponible |
| Servicio MySQL | `MySQL80`, estado `Running`, inicio `Automatic` |
| Puerto MySQL | `0.0.0.0:3306` (PID 16480) |
| Binario MySQL | `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe` |
| Versión del binario | **8.0.46** (MySQL Community Server - GPL, Win64 x86_64) |
| `back end/.env` | **existe** (completado por Brayan); claves verificadas sin imprimir valores |
| `back end/.env.test` | existe; base `_test` + `TEST_MODE=1` + secreto JWT exclusivo de pruebas |
| Cliente `mysql` CLI | no disponible en PATH (se usó `mysql2` con script controlado) |
| Python | no instalado (solo alias de Microsoft Store, no ejecuta) |
| Repositorio Git | no inicializado en la carpeta; `.gitignore` excluye `.env` y `.env.test` |

## 2. Versión real de MySQL

`SELECT VERSION()` ejecutado con conexión autenticada:

```text
8.0.46
```

`DATABASE()` devuelve el nombre en minúsculas
(`disenio_de_sistema_de_informacion_iteracion_tres`) porque Windows usa
`lower_case_table_names=1`. Las guardas comparan **case-insensitive** pero
exigen el mismo nombre; cualquier otra base se rechaza. El requisito
(8.0.16+ por `CHECK` y columnas generadas) se cumple.

## 3. Migraciones aplicadas por base

| Base | Migraciones aplicadas | Evidencia |
|---|---|---|
| `Disenio_de_sistema_de_informacion_iteracion_tres` (principal) | **001 y 002**, 11 tablas | base vacía verificada (0 tablas) antes de aplicar; inspección final `esquema=completo` |
| `Disenio_de_sistema_de_informacion_iteracion_tres_test` | **001 y 002**, 11 tablas | base creada por el script controlado (no existía); `esquema=completo` |

Script usado: `src/scripts/aplicar-migraciones.js` (conexión dedicada con
multi-statement solo para migrar; la API no lo habilita). Guardas: solo los dos
nombres autorizados, base principal vacía, sin `DROP`/`TRUNCATE`, detención si
encuentra tablas no reconocidas o una migración parcial. La principal **no se
recreó** y no recibió datos ficticios.

Revisión estática de los scripts:

- `001_esquema_integrado.sql`: crea 10 tablas; **no** contiene `USE`,
  `CREATE/DROP DATABASE`, `DROP TABLE`, `TRUNCATE` ni `DELETE`; solo
  `SET NAMES utf8mb4` y `SET time_zone = '-05:00'`.
- `002_secuencias_comprobante.sql`: crea 1 tabla; no destructiva.
- No hay nombre de base codificado en sentencias ejecutables (solo en
  comentarios), por lo que el destino es el esquema seleccionado en el
  cliente. **No se deben hacer reemplazos de texto para redirigirlas.**

Si al inspeccionar aparece estructura previa parcial o incompatible:
detenerse, comparar tabla por tabla y restaurar desde respaldo; no volver a
ejecutar 001 a ciegas (no usa `IF NOT EXISTS`).

## 4. Resultados de pruebas por suite

| Suite | Comando | Aprobadas | Fallidas | Omitidas | Estado |
|---|---|---|---|---|---|
| Unitaria backend | `npm run test:unit` | **17** | 0 | 0 | ejecutada |
| Integración backend | `node --env-file=.env.test --test "test/integration/*.test.js"` | **17** | 0 | **0** | **ejecutada contra MySQL** |
| Java `reporte_recaudos` | `mvn test` | **14** | 0 | 0 | ejecutada |
| Java contra API de pruebas | JAR + CSV | 5 pagos | 0 | 0 | ejecutada (totales coinciden con BD) |
| Python `reporte_cartera` | `python -m unittest …` | — | — | — | **no ejecutada: sin intérprete** |

- `node --check`: todos los archivos JS compilan.
- La integración dejó de estar omitida: 17/17 en verde, sin recortar
  aserciones.
- Defectos reales encontrados por la suite y corregidos:
  1. `loginLimiter.js` bloqueaba tras **un solo** fallo (no comparaba el
     contador con el máximo). Ahora bloquea al alcanzar 5; se añadió prueba de
     regresión.
  2. `POST /api/clientes` exigía `telefono`, `correo` y `direccion` aunque el
     esquema los define `NULL`; ahora omitirlos equivale a `NULL`.
  3. `POST/GET /api/vehiculos/:id/novedades` devolvía 404 por montaje
     incorrecto del router; se montó en `/:id/novedades` con `mergeParams`.
  4. La prueba de concurrencia consultaba una columna `estado` inexistente en
     `estancias`; se corrigió a `fecha_hora_salida IS NULL` (defecto de la
     prueba, no del API).
- Guarda corregida: `SELECT DATABASE()` compara en minúsculas por
  `lower_case_table_names=1` de Windows.

## 5. Configuración de pruebas y protecciones

`back end/.env.test` (no versionado) contiene:

```text
TEST_MODE=1
ALLOW_TEST_DB_RESET=1
DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test
JWT_SECRET=<secreto exclusivo de pruebas, generado localmente>
```

Las credenciales `DB_*` se heredan de `back end/.env`; el `JWT_SECRET` de
pruebas es distinto del principal. Si se desea una cuenta exclusiva de
pruebas, definir `DB_USER` y `DB_PASSWORD` dentro de `.env.test`; esos valores
ganan.

Precedencia real (verificada):

1. Variables del proceso/shell.
2. `.env.test` cargado con `--env-file`.
3. `.env` cargado por dotenv (no sobrescribe valores ya definidos).

Guardas antes de limpiar o sembrar:

- `TEST_MODE=1` obligatorio.
- `ALLOW_TEST_DB_RESET=1` para operaciones destructivas de prueba.
- `DB_NAME` debe ser exactamente `..._test`; la principal se rechaza.
- La conexión ejecuta `SELECT DATABASE()` y aborta si no coincide con la base
  autorizada (`test/integration/helpers.js` y `src/scripts/seed-test-users.js`),
  comparando en minúsculas por `lower_case_table_names=1`.
- Limpieza con `DELETE` fila por fila, nunca `DROP`/`TRUNCATE` de la principal.

## 6. Flujos comprobados

**Probado solo de forma unitaria:** dinero exacto, fechas/hora Bogotá,
periodos y vigencia, placa, bcrypt, invalidación de huella de contraseña.

**Probado contra MySQL real (17/17, 2026-11-13):**

1. Login válido/inválido y rechazo sin token.
2. Bloqueo tras 5 intentos fallidos del mismo usuario (429).
3. Permisos: operador no crea usuarios ni anula pagos.
4. Clientes: CRUD y documento duplicado (campos opcionales omitidos).
5. Celdas: creación admin, ocupación derivada, deshabilitar ocupada.
6. Vehículos: creación, placa duplicada, normalización.
7. Estancias: entrada, doble entrada, celda ocupada/fuera de servicio, salida.
8. **Ocupación concurrente** de celda y de vehículo + estado final en BD.
9. Novedades por vehículo (ruta corregida).
10. Contratos: creación, solape directo y **solape concurrente** + estado en BD.
11. Obligaciones: generación explícita, idempotencia, vigencia.
12. Pagos: monto incorrecto, alta, comprobante, idempotencia y conflicto.
13. **Pago simultáneo** de una obligación + un solo confirmado en BD.
14. Anulación: permiso, estado, repetición, re-pago y **auditoría**.
15. Historial, detalle y comprobante.
16. Resumen de deuda.
17. Reversión de pago inválido y **cambio de contraseña invalida tokens**.

**Verificación HTTP adicional (servidor real sobre la base `_test`):**

- `/api/salud` → `{"estado":"ok"}`; `/api/salud/db` → `{"estado":"ok","db":"conectada"}`.
- `GET /api/clientes` sin token → 401.
- Recorrido único ejecutado: login admin/operador → cliente → vehículo → celda
  (admin) → rechazo de operador creando celda → contrato → entrada → rechazo de
  doble entrada → salida → obligación → pago (`CMP-2026-000004`) → reintento
  idempotente → comprobante → historial → operador no anula (403) → anulación
  admin → obligación pendiente → nuevo pago → resumen. **19/19 comprobaciones
  OK**; el log del servidor no contiene JWT (`grep` de `eyJ`/`Bearer` = 0).
- La herramienta Java se ejecutó contra esa API: descargó 5 pagos
  (3 confirmados = 360000.00 COP; 2 anulados = 240000.00 COP), CSV UTF-8 con
  BOM y 13 columnas; los totales coinciden exactamente con la base `_test`.

**Observación:** la verificación se hizo con `DB_USER` = `root` porque es la
cuenta que quedó en `.env` al corregirse el formato. Para uso normal debe
cambiarse por una cuenta con solo DML (§9). El administrador de la base
principal aún no se crea; el flujo se ejecutó con usuarios ficticios de la
base `_test`.

## 7. Revisión del token y contraseña

`emitirToken` incluye el claim `pwd` =
`SHA-256(password_hash)` truncado a 24 hex (96 bits). En cada petición,
`middleware/auth.js`:

1. Verifica firma y expiración del JWT.
2. Recarga el usuario (`activo`, `rol`, `password_hash`) desde MySQL.
3. Rechaza si está inactivo/inexistente.
4. Recalcula la huella y la compara con `pwd`; si la contraseña cambió,
   responde `401 NO_AUTENTICADO`.

El JWT **no** contiene la contraseña, el hash bcrypt completo ni material
reversible. La huella es unidireccional y solo sirve para comparar igualdad.

Un contador de versión de sesión (`session_version`) cumpliría lo mismo, pero
exigiría una columna y migración nuevas, además de actualizarlo en cada cambio
de contraseña. No se cambió el diseño: la huella ya es stateless, no requiere
esquema y está cubierta por prueba unitaria y por la prueba de integración
`auth: cambio de contraseña invalida tokens anteriores` (ejecutada y en verde).
Si en el futuro se necesita revocar sesiones por administrador o listar
sesiones, el contador sería la opción natural.

## 8. Comandos exactos

### 8.1 Configuración local (Brayan, sin compartir valores)

```bash
cd "back end"
cp .env.example .env
# Edite .env localmente y complete SOLO estos nombres:
# DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# JWT_SECRET (genérelo con el comando de .env.example)
# Opcionales: PORT, CORS_ORIGIN, DB_POOL_SIZE, JWT_EXPIRES_IN, LOGIN_*
# No pegue credenciales en el chat ni en documentos.
```

`.env.test` ya está creado y no contiene secretos. Si usará una cuenta de
pruebas distinta, agregue `DB_USER`/`DB_PASSWORD` allí.

### 8.2 Inspección de MySQL (solo lectura)

```bash
cd "back end"
node src/scripts/verificar-env.js .env
node src/scripts/inspeccionar-bd.js
node --env-file=.env.test src/scripts/inspeccionar-bd.js
```

`verificar-env` reporta solo nombres y estado (definida/ausente/placeholder),
nunca valores; además comprueba `PORT` libre y que `CORS_ORIGIN` no use `*`.
`inspeccionar-bd` imprime versión, `DATABASE()`, tablas, conteos y si 001/002
están completas. Ninguno modifica datos.

### 8.3 Aplicar migraciones (solo base vacía o faltantes confirmadas)

Procedimiento controlado con `mysql2` (usado en esta pasada):

```bash
cd "back end"
# crea la base _test si falta y aplica 001/002
node --env-file=.env.test src/scripts/aplicar-migraciones.js --crear-test
# principal: solo si está vacía
node src/scripts/aplicar-migraciones.js --confirmar-base-principal
```

El script se detiene ante tablas no reconocidas o migración parcial y no usa
`DROP`/`TRUNCATE`. Con MySQL Workbench o cliente `mysql`:

```bash
cd "back end"
mysql -h <host> -P <puerto> -u <cuenta_migradora> -p \
  Disenio_de_sistema_de_informacion_iteracion_tres \
  < migrations/001_esquema_integrado.sql
mysql -h <host> -P <puerto> -u <cuenta_migradora> -p \
  Disenio_de_sistema_de_informacion_iteracion_tres \
  < migrations/002_secuencias_comprobante.sql
```

Repita contra `Disenio_de_sistema_de_informacion_iteracion_tres_test` para
preparar la base de pruebas. **No** ejecute seeds en la principal.

### 8.4 Administrador inicial

```bash
cd "back end"
npm run create-admin
```

Es interactivo; no use contraseñas fijas en el repositorio. La alternativa
`ADMIN_PASSWORD` existe, pero no es recomendable en equipos compartidos.

### 8.5 Arranque y salud

```bash
cd "back end"
npm start
# en otra terminal:
curl http://127.0.0.1:3000/api/salud
curl http://127.0.0.1:3000/api/salud/db
```

### 8.6 Pruebas

```bash
cd "back end"
npm run test:unit
node --env-file=.env.test --test "test/integration/*.test.js"
```

No use `npm test` para integración si espera ejecutarlas: sin `.env.test`
cargado se omiten (comportamiento seguro).

### 8.7 Herramientas

```bash
cd "back end/tools/java/reporte_recaudos"
mvn test
mvn package
java -jar target/reporte-recaudos.jar --help

cd "back end/tools/python/reporte_cartera"
python -m unittest discover -s tests -v
python reporte_cartera.py --help
```

La herramienta Java contra la API de pruebas solo debe ejecutarse cuando el
servidor y la base `_test` funcionen; use cuentas ficticias y no registre el
token.

## 9. Instrucciones de arranque y cuentas

Orden recomendado:

1. Confirmar servicio `MySQL80` en ejecución.
2. Crear las bases **solo si no existen** (no recrear la principal).
3. Crear cuentas separadas (ejecutar como administrador de MySQL, con
   contraseñas definidas localmente por Brayan):
   - **Aplicación** (`autos_app`): `SELECT, INSERT, UPDATE, DELETE` sobre la
     base principal y la de pruebas si `.env.test` hereda esa cuenta.
   - **Migraciones** (`autos_migrador`): además `CREATE, ALTER, INDEX,
     REFERENCES` sobre la base donde se aplicarán los scripts. No otorgar
     `DROP` ni permisos globales.
   - **Pruebas** (opcional): DML sobre `*_test`, definida en `.env.test`.
4. `back end/.env` con la cuenta de aplicación (no migradora).
5. Inspeccionar la principal; si está vacía, aplicar 001 y 002; inspeccionar
   de nuevo.
6. Inspeccionar la `_test`; aplicar migraciones; verificar `SELECT DATABASE()`.
7. `npm run create-admin` (interactivo) en la principal.
8. `npm start`, probar salud, 401 sin token, login y flujo integrado.
9. Ejecutar las 17 pruebas de integración y registrar resultados.

Estado de esta pasada: los pasos 5–6 y 8–9 se ejecutaron; el 7 (administrador
de la base principal) queda pendiente y no bloquea la base `_test`. La cuenta
de aplicación del paso 3 aún no se ha creado: `.env` usa `root`.

Plantilla de privilegios (sin contraseñas reales):

```sql
CREATE DATABASE IF NOT EXISTS `Disenio_de_sistema_de_informacion_iteracion_tres`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `Disenio_de_sistema_de_informacion_iteracion_tres_test`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'autos_app'@'localhost' IDENTIFIED BY '<definir-localmente>';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON `Disenio_de_sistema_de_informacion_iteracion_tres`.* TO 'autos_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON `Disenio_de_sistema_de_informacion_iteracion_tres_test`.* TO 'autos_app'@'localhost';

CREATE USER 'autos_migrador'@'localhost' IDENTIFIED BY '<definir-localmente>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON `Disenio_de_sistema_de_informacion_iteracion_tres`.* TO 'autos_migrador'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON `Disenio_de_sistema_de_informacion_iteracion_tres_test`.* TO 'autos_migrador'@'localhost';
```

No ejecute estos `CREATE`/`GRANT` desde la API ni los agregue a scripts del
repositorio. Son instrucciones para el administrador local de MySQL.

## 10. Información para Isabella

- Base `/api`; JSON; `Authorization: Bearer <token>` tras
  `POST /api/auth/login`.
- `CORS_ORIGIN` debe incluir el origen real del frontend (coma separada).
- Errores: leer `error.codigo`; `409` puede ser de negocio o concurrencia.
- Montos como cadena decimal; nunca `float`.
- Fechas de negocio `AAAA-MM-DD`; instantes ISO con offset `-05:00`.
- Pagos: `clave_idempotencia` UUID v4 por intento; reutilizarla en reintentos.
- Anulación solo administrador; comprobante `CMP-AAAA-NNNNNN` interno.
- Morosidad: usar `estado_efectivo` (`pendiente`/`pagada`/`vencida`).
- Un token deja de servir si el usuario se desactiva o cambia su contraseña.
- Paginación con `pagina`/`tamano`; respetar metadatos del listado.

## 11. Pendientes locales (no bloquean la base de pruebas)

1. **Cuenta de aplicación:** `.env` quedó con `DB_USER=root` (se corrigió el
   formato `root@localhost`). Antes de usar el sistema fuera de pruebas, cree
   `autos_app` con solo DML y actualice `DB_USER`/`DB_PASSWORD` en `.env`.
   No comparta esos valores.
2. **Administrador de la base principal:** ejecute localmente
   `npm run create-admin` (interactivo) y no use `ADMIN_PASSWORD` en equipos
   compartidos.
3. **Python 3.10+:** instálelo desde el instalador oficial; luego
   `python -m unittest discover -s tests -v` y la herramienta contra la API de
   pruebas con una cuenta ficticia.
4. **Antigravity:** continúa frontend e integración con
   `full stack/docs/traspaso-antigravity.md`; no reconstruir la API.
