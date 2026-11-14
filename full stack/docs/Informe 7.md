# Plan y resultados de pruebas — Autos Colombia

> Fecha de ejecución registrada: **2026-11-13**.
> Este documento solo reporta resultados **realmente ejecutados** en el
> entorno de Brayan. Lo que no se ejecutó se marca explícitamente como
> pendiente; no se cuenta como aprobado.

## 1. Entorno de ejecución

| Elemento | Valor verificado |
|---|---|
| Sistema operativo | Windows 11 (10.0.22631), shell Git Bash |
| Node.js / npm | v26.7.0 / 11.19.0 |
| Java (runtime) | 25.0.4.1 LTS; compilación Maven con `release 17` |
| Maven | disponible en el equipo |
| MySQL | servicio `MySQL80`; `SELECT VERSION()` = **8.0.46**; escucha en `3306` |
| Cliente `mysql` | **no disponible** en el PATH (se usó `mysql2`) |
| `back end/.env` | **existe**, completado por Brayan; claves verificadas sin imprimir valores |
| `back end/.env.test` | existe; `_test`, `TEST_MODE=1`, `ALLOW_TEST_DB_RESET=1`, secreto JWT exclusivo |
| Python | **no instalado** (solo el alias de Microsoft Store, que no ejecuta) |

Consecuencia: se ejecutaron las pruebas unitarias, las 17 de integración
contra MySQL, las de Java, el servidor real y la herramienta Java contra la
API de pruebas. Python sigue sin ejecutarse.

## 2. Pruebas unitarias del backend

Comando:

```bash
cd "back end"
npm test
```

Resultado real (salida de `node --test`):

| Métrica | Valor |
|---|---|
| Total | 17 |
| Aprobadas | **17** |
| Fallidas | **0** |
| Omitidas (`skipped`) | 0 |
| Duración | ~5 s |

Pruebas aprobadas (17):

- `unit/dinero.test.js` (3): normalización `aDecimalStr` a 2 decimales,
  rechazo de formatos inválidos, `sumarDecimales` exacto sin `float`.
- `unit/fechas.test.js` (5): conversión de offsets a hora Bogotá, naïve
  interpretada como Bogotá, rechazo de entradas inválidas (incluye fecha
  inexistente `2026-02-31`), formatos de `ahoraBogota`/`hoyBogota`,
  `sumarMeses`/`sumarDias`.
- `unit/periodos.test.js` (6): formato `YYYY-MM`, `exigirPeriodo`,
  fechas válidas, primer/último día de mes, reglas de vigencia del contrato,
  generación inclusiva de meses.
- `unit/placa.test.js` (1): normalización y validación de placa.
- `unit/password.test.js` (2): bcrypt hash/verify y cambio de huella
  `huellaPassword` al cambiar el hash (invalidación de tokens).

Advertencia: 17 pruebas aprobadas **no** equivalen a cobertura ni a
verificación funcional del API. Cubren utilidades puras.

## 3. Pruebas de integración contra MySQL

Estado: **17 pruebas escritas y ejecutadas, 17 aprobadas, 0 omitidas**
(2026-11-13, MySQL 8.0.46, base `_test`).

Archivo: `back end/test/integration/api.test.js` (helper:
`test/integration/helpers.js`). Se omiten automáticamente si no se cumple:

```text
TEST_MODE=1  y  DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test
```

Pruebas escritas:

1. auth: login válido e inválido
2. auth: bloqueo tras 5 intentos fallidos del mismo usuario (429)
3. auth: operador no puede crear usuarios ni anular pagos
4. clientes: CRUD y duplicado de documento
5. celdas: crear (admin), listar con ocupación, deshabilitar ocupada
6. vehiculos: crear, placa duplicada, normalización
7. estancias: entrada, doble entrada mismo vehículo, celda ocupada, salida
8. estancias: ocupación concurrente de celda y vehículo (+ estado final en BD)
9. novedades: registrar y listar
10. contratos: crear, solape rechazado, solape concurrente (+ estado en BD)
11. obligaciones: generación explícita, idempotencia, vigencia
12. pagos: válido, monto incorrecto, pago simultáneo, idempotencia y conflicto
    (+ un solo pago confirmado en BD)
13. pagos: anulación solo admin, repetida, nuevo pago posterior y auditoría
14. pagos: historial, detalle y comprobante
15. resumen: deuda del cliente
16. reversión: pago inválido no deja efectos
17. auth: cambio de contraseña invalida tokens anteriores

La prueba 2 se añadió tras encontrar un defecto real en el limitador (bloqueaba
tras un solo fallo); protege la regresión sin relajar ninguna aserción.

Comando ejecutado:

```bash
cd "back end"
node --env-file=.env.test --test "test/integration/*.test.js"
```

Resultado real: `tests 17, pass 17, fail 0, skipped 0` (~9.6 s). Las pruebas
de concurrencia usan dos peticiones simultáneas y luego consultan la base con
`consultaDb` para confirmar el estado final (una sola estancia abierta, un solo
contrato, un solo pago confirmado).

`back end/.env.test` ya existe (no versionado) y define:

```text
TEST_MODE=1
ALLOW_TEST_DB_RESET=1
DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test
JWT_SECRET=<secreto exclusivo de pruebas>
```

Las credenciales `DB_*` se heredan de `back end/.env`. Si se
quiere una cuenta exclusiva de pruebas, definir `DB_USER`/`DB_PASSWORD` en
`.env.test`. Precedencia verificada: shell > `.env.test` (`--env-file`) >
`.env` (dotenv no sobrescribe).

Guardas implementadas:

- `DB_NAME` debe ser exactamente la base `_test`; la principal se rechaza.
- `TEST_MODE=1` obligatorio.
- El borrado de datos (reset) exige además `ALLOW_TEST_DB_RESET=1`.
- La conexión ejecuta `SELECT DATABASE()` y aborta si no es la base autorizada
  (`test/integration/helpers.js` y `src/scripts/seed-test-users.js`),
  comparando en minúsculas por `lower_case_table_names=1` de Windows.
- `helpers.js` crea sus propios usuarios de prueba (`admin.autoscolombia`,
  `operador.autoscolombia`) solo dentro de la base `_test`.

Defectos encontrados y corregidos al ejecutar la suite:

1. `src/middleware/loginLimiter.js` bloqueaba tras un solo fallo.
2. `POST /api/clientes` exigía `telefono`, `correo` y `direccion`, que el
   esquema define `NULL`.
3. `/api/vehiculos/:id/novedades` devolvía 404 por montaje incorrecto.
4. La prueba de concurrencia usaba una columna `estado` inexistente en
   `estancias`; se corrigió a `fecha_hora_salida IS NULL`.

Las bases se migraron con `src/scripts/aplicar-migraciones.js`: la principal
estaba vacía (0 tablas) y la `_test` se creó porque no existía. No se usaron
contraseñas vacías ni credenciales adivinadas, y no se limpió la base principal.

## 4. Herramienta Java (reporte de recaudos)

Comandos ejecutados:

```bash
cd "back end/tools/java/reporte_recaudos"
mvn test
mvn package
java -jar target/reporte-recaudos.jar --help
```

Resultado real de `mvn test`:

| Clase de prueba | Pruebas | Fallos | Errores |
|---|---|---|---|
| `ApiClientTest` | 3 | 0 | 0 |
| `ConfigTest` | 4 | 0 | 0 |
| `CsvTest` | 3 | 0 | 0 |
| `RecaudosServiceTest` | 2 | 0 | 0 |
| `ResumenTest` | 2 | 0 | 0 |
| **Total** | **14** | **0** | **0** |

`mvn package` genera `target/reporte-recaudos.jar`; `--help` responde y
lista las opciones. Limitación cosmética: en consola Windows con page code
heredado los acentos se ven como `�`; el CSV se escribe en UTF-8 con BOM.

Ejecución contra la API de pruebas (servidor real sobre `_test`, cuenta
ficticia por variables de entorno):

```text
Pagos descargados: 5 (confirmados: 3, anulados: 2)
Total confirmados: 360000.00 COP
Total anulados: 240000.00 COP
CSV con BOM y 13 columnas; los totales coinciden con la base _test.
```

No se registró el token. La herramienta no se ejecutó contra la base principal
porque aún no tiene administrador.

## 5. Herramienta Python (reporte de cartera)

Estado: **escrita, no ejecutada**. No hay intérprete de Python en el equipo,
así que ni la herramienta ni su suite `unittest` se pudieron correr. No se
instaló nada globalmente. Requiere **Python 3.10+** (usa `str | None`), solo
biblioteca estándar y `argparse` (por eso `--help` está disponible). Ver
`back end/tools/python/reporte_cartera/README.md`.

Para ejecutarla, Brayan debe instalar Python 3.10+ desde el instalador
oficial, verificar `python --version` y luego, desde
`back end/tools/python/reporte_cartera`:

```bash
python -m unittest discover -s tests -v
python reporte_cartera.py --help
```

## 6. Qué no se probó (explícito)

- `npm run create-admin` en la base principal (no se ejecutó).
- La base principal con datos reales: está migrada y vacía de datos de negocio.
- Carga real, caída de MySQL, recuperación y despliegue en otro entorno.
- Herramienta Python y su suite de pruebas.
- Frontend (`front end/`): fuera de alcance, no modificado ni probado.

La concurrencia se verificó con dos peticiones simultáneas contra el servidor
real y dos conexiones independientes para leer el estado final; no se ejecutó
una prueba de estrés con decenas de hilos.

## 7. Cómo ejecutar todo de forma segura (estado actual)

1. Bases: la principal existe y está migrada; `_test` fue creada y migrada.
   No recrear la principal ni cargarle datos ficticios.
2. `back end/.env` ya está completo; no se comparten valores. `back end/.env.test`
   ya existe con la base `_test` y secreto exclusivo de pruebas.
3. Migraciones: ya aplicadas. Para reaplicar en un entorno nuevo, usar
   `node src/scripts/aplicar-migraciones.js` con la guarda correspondiente.
4. Pendiente local: `cd "back end" && npm run create-admin` (interactivo) para
   la base principal, y cambiar `DB_USER` de `root` a una cuenta con solo DML.
5. `npm start` y probar `/api/salud` y `/api/salud/db`.
6. `node --env-file=.env.test --test "test/integration/*.test.js"` para
   repetir las 17 pruebas.
7. Registrar aquí los resultados reales antes de declarar el backend
   verificado en otro entorno.
