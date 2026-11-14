# Autos Colombia — Backend

API REST del parqueadero (Express + MySQL). Cubre las iteraciones 1, 2 y 3:
vehículos/novedades/movimientos, clientes/usuarios/celdas/contratos, y
obligaciones/pagos con idempotencia y auditoría.

## Resultados técnicos reportados

Los informes del 2026-11-13 registraron 17/17 pruebas unitarias aprobadas y
17/17 pruebas de integración aprobadas contra MySQL 8.0.46 y la base `_test`.
Son resultados históricos, no revalidados en el cierre documental. En Etapa 3
la suite de integración no se ejecutó: su `before` invoca `resetDb()` y elimina
filas de todas las tablas de `_test`; no la ejecutes hasta disponer de una base
descartable y una estrategia de aislamiento aprobada.

Los informes previos también registran aplicación de migraciones 001/002 y
verificaciones de salud/autenticación, pero el estado actual de MySQL no se
consultó en este cierre. Los reportes locales anteriores señalan uso de `root`
y administrador principal pendiente; confirma ambos datos localmente.

La utilidad Java tiene actualmente 17 pruebas en Java 25; su prueba HTTP usa
un servidor local de prueba y no la API real. La herramienta Python no se ha
ejecutado en el entorno diagnosticado por falta de un intérprete utilizable.

## Requisitos

- Node.js >= 20
- MySQL 8.0.16+ (se verificó compatibilidad con 8.0.46; se requieren columnas
  generadas `STORED` + `UNIQUE` → 8.0.13+, y `CHECK` forzado por el servidor →
  8.0.16+)

## Instalación

```bash
npm ci
cp .env.example .env   # complete DB_*, JWT_SECRET, PORT, CORS_ORIGIN
```

Comprobación de la configuración sin mostrar valores (solo nombres, estado,
duplicados, CORS y puerto libre):

```bash
node src/scripts/verificar-env.js
node src/scripts/diagnostico-env.js   # formato: BOM/CRLF, comillas, espacios
```

Inspección de solo lectura (versión, base real, tablas y migraciones aplicadas):

```bash
node src/scripts/inspeccionar-bd.js
node --env-file=.env.test src/scripts/inspeccionar-bd.js
```

## Base de datos

1. Verifique que la base `Disenio_de_sistema_de_informacion_iteracion_tres`
   no tenga tablas previas:
   `SHOW TABLES;` dentro de la base.
2. Aplique las migraciones en orden (no son reversibles con ROLLBACK; el
   registro de aplicación es este orden + fecha en `full stack/docs`):

```bash
mysql -h <host> -P <puerto> -u <usuario> -p Disenio_de_sistema_de_informacion_iteracion_tres \
  < migrations/001_esquema_integrado.sql
mysql -h <host> -P <puerto> -u <usuario> -p Disenio_de_sistema_de_informacion_iteracion_tres \
  < migrations/002_secuencias_comprobante.sql
```

Alternativa desde Node, con conexión dedicada (`multipleStatements` solo aquí,
nunca en el pool de la API). Rechaza bases no autorizadas, se detiene si la
base tiene tablas desconocidas o una migración parcial, y exige
`--confirmar-base-principal` para la principal y `TEST_MODE=1` para la `_test`:

```bash
node --env-file=.env.test src/scripts/aplicar-migraciones.js --crear-test # crea _test si falta y aplica 001/002
node src/scripts/aplicar-migraciones.js --confirmar-base-principal  # solo si está vacía
```

3. Cree el administrador inicial (contraseña interactiva, nunca en el repo):

```bash
npm run create-admin
```

### Cuentas de MySQL (separación recomendada)

| Cuenta | Privilegios | Uso |
|---|---|---|
| Aplicación | `SELECT, INSERT, UPDATE, DELETE` sobre la base principal y `_test` | `DB_USER` de `.env` para la API |
| Migraciones | `SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES` sobre la base destino | aplicar `001`/`002` a mano; sin `DROP` global |
| Pruebas | mismos DML que la aplicación, limitado a `..._test` | `.env.test` hereda `DB_*` |

La API nunca ejecuta DDL ni varias sentencias por llamada (no se habilita
`multipleStatements`). Ejemplo local, sin contraseñas reales:

```sql
CREATE USER '<usuario_app>'@'localhost' IDENTIFIED BY '<contraseña_local>';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON Disenio_de_sistema_de_informacion_iteracion_tres.* TO '<usuario_app>'@'localhost';
```

## Ejecución

```bash
npm start        # producción/local
npm run dev      --watch
```

Health: `GET /api/salud` · `GET /api/salud/db`.

## Pruebas

```bash
npm run test:unit
```

Esta suite no requiere MySQL. Informes del 2026-11-13 registraron 17/17
aprobadas; no se reejecutó en este cierre documental.

### Integración backend: ejecución bloqueada

No ejecutes `npm run test:integration` en el estado actual. El `before` de
`test/integration/api.test.js` invoca `resetDb()`, que elimina datos de todas
las tablas de `Disenio_de_sistema_de_informacion_iteracion_tres_test` antes de
recrear usuarios ficticios. Las guardas de entorno verifican que sea la base
`_test`, pero no restringen la eliminación a fixtures propios. Los 17/17
reportados anteriormente son históricos y no eliminan este riesgo. Se requiere
una base descartable y una estrategia de aislamiento aprobada antes de volver
a ejecutar esa suite.

Para preparar una base de pruebas sin lanzar esa suite, configura `.env.test`
localmente con `TEST_MODE=1`, el nombre exacto de la base `_test` y credenciales
locales. No publiques `.env.test`. Las migraciones se describen arriba; no
apliques cambios a una base existente sin revisar primero su contenido.

## Estructura

```
src/
  index.js            arranque + apagado ordenado
  app.js              app Express, CORS, rutas, health
  config.js           configuración validada (sin secretos en errores)
  db.js               pool mysql2 + helper de transacciones
  errors.js           AppError + traductor de errores MySQL
  middleware/         auth JWT, roles, rate-limit login, errores, logger
  auth/password.js    bcryptjs
  routes/             auth, clientes, vehiculos, novedades, usuarios,
                      celdas, estancias, contratos, obligaciones, pagos, resumen
  scripts/            create-admin, seed-test-users, reset-test-db,
                      inspeccionar-bd, verificar-env, diagnostico-env,
                      aplicar-migraciones
  utils/              fechas (Bogotá UTC-5), periodos, dinero, placa,
                      paginación, testdb (guardas)
migrations/           001 esquema, 002 secuencia comprobantes
seeds/                datos ficticios SOLO para base _test
test/unit|integration pruebas node:test
```

## Convenciones clave

- Autenticación: JWT Bearer (`POST /api/auth/login`). El token se verifica en
  cada petición y el usuario se recarga desde la BD (rol/activo frescos).
- Montos: `DECIMAL(12,2)` en MySQL, cadenas decimales en la API; sumas con
  BigInt, nunca float.
- Fechas: negocio `AAAA-MM-DD` / `AAAA-MM`; instantes ISO 8601 normalizados a
  hora Bogotá (UTC-5 fijo).
- Comprobante interno `CMP-AAAA-NNNNNN`: consecutivo por año con bloqueo de
  fila en `secuencias_comprobante` (sin `MAX()+1`).
- Idempotencia de pagos: `clave_idempotencia` UUID por intento del cliente.
- Sesiones: el JWT incluye una huella del `password_hash`; al cambiar la
  contraseña, los tokens emitidos antes dejan de ser válidos (401). Desactivar
  la cuenta también invalida el acceso en la siguiente petición.

## Herramientas auxiliares

No reemplazan la API ni escriben en MySQL; consumen los endpoints con JWT.

- `tools/python/reporte_cartera/` — reporte CSV de cartera por periodo
  (`GET /api/obligaciones`). Python 3.10+, solo biblioteca estándar.
- `tools/java/reporte_recaudos/` — detalle y resumen CSV de pagos por intervalo
  (`GET /api/pagos`), separando confirmados y anulados. JDK 25 y Maven 3.9+.

```bash
# Python
cd tools/python/reporte_cartera
python -m unittest discover -s tests -v

# Java
cd tools/java/reporte_recaudos
mvn -q test && mvn -q -DskipTests package
```

## Estado histórico del entorno local

Los informes anteriores registran MySQL 8.0.46, migraciones en ambas bases y
una cuenta `root` con administrador principal pendiente. Este cierre no se
conectó a MySQL, así que el servicio, las tablas, la identidad de `DB_USER` y el
administrador actual deben confirmarse localmente. Usa `npm run create-admin`
de forma interactiva cuando el equipo autorice crear la cuenta. Sustituye
`root` por una cuenta limitada a DML si continúa configurado.
