# Traspaso a Qoder — Backend Autos Colombia

Fecha: 2026-11-13 · Estado: backend implementado; pendiente validación contra
MySQL real por falta de credenciales en el entorno de desarrollo.

## 1. Arquitectura

API REST en Express 4 (CommonJS no; ES modules) + mysql2 (pool) + MySQL 8.0.
Sin framework ORM: SQL explícito en `src/routes/*`. Transacciones con helper
`conTransaccion()` (`src/db.js`). Errores de negocio con `AppError` y códigos
estables (`src/errors.js`). Auth: JWT Bearer (HS256) + bcryptjs; el usuario se
recarga desde la BD en cada petición.

## 2. Estructura de archivos

```
back end/
├── package.json            scripts: start, dev, create-admin, test*
├── .env.example            plantilla de configuración (sin secretos)
├── README.md               instalación, migraciones, pruebas
├── migrations/
│   ├── 001_esquema_integrado.sql      10 tablas del modelo
│   └── 002_secuencias_comprobante.sql consecutivo CMP-AAAA-NNNNNN
├── seeds/
│   └── 001_datos_ficticios.sql        SOLO base _test (hash bcrypt de prueba)
├── src/
│   ├── index.js / app.js / config.js / db.js / errors.js / logger.js
│   ├── auth/password.js
│   ├── middleware/  auth.js, errorHandler.js, loginLimiter.js, requestLogger.js
│   ├── routes/      auth, clientes, vehiculos, novedades, usuarios, celdas,
│   │                estancias, contratos, obligaciones, pagos, resumen
│   ├── scripts/     create-admin.js, seed-test-users.js, reset-test-db.js
│   └── utils/       fechas.js, periodos.js, dinero.js, placa.js,
│                    paginacion.js, testdb.js (guardas de base _test)
└── test/
    ├── unit/        periodos, dinero, fechas, placa (15 pruebas, sin BD)
    └── integration/ helpers.js + api.test.js (suite completa, requiere _test)
```

## 3. Dependencias y versiones

Runtime: `express ^4.22.3`, `mysql2 ^3.24.6`, `bcryptjs ^3.0.3`,
`jsonwebtoken ^9.0.3`, `dotenv ^18.0.10`, `zod ^4.6.7` (instalado; la
validación usa validadores propios — zod está disponible si se prefiere).
Pruebas: `node:test` nativo (sin dependencias extra). Node >= 20.

## 4. Migraciones

- `001_esquema_integrado.sql` — esquema completo (clientes, usuarios,
  vehiculos, novedades_vehiculo, celdas, estancias, contratos_mensualidad,
  obligaciones_pago, pagos, auditoria_operaciones). No destructiva; NO usa
  `IF NOT EXISTS` a propósito: verificar `SHOW TABLES` antes de aplicar.
- `002_secuencias_comprobante.sql` — `secuencias_comprobante(anio, ultimo)`.
- **Pendiente**: aplicar ambas a la base principal (no se pudo: sin
  credenciales) y a `..._test`. Rollback: no hay script; las tablas nuevas
  pueden eliminarse manualmente si la base está vacía de datos de negocio.

## 5. Comandos

```bash
cd "back end"
npm install
cp .env.example .env      # completar DB_*, JWT_SECRET, PORT, CORS_ORIGIN
npm run create-admin      # crea admin inicial (password interactiva)
npm start                 # http://localhost:3000
npm run test:unit         # siempre ejecutable
# integración (requiere base _test + TEST_MODE=1 + ALLOW_TEST_DB_RESET=1):
npm run test:integration
```

## 6. Funcionalidades terminadas

- Auth JWT + roles + rate-limit de login + create-admin + cambio/desactivación
  de cuentas.
- I1: vehículos (placa normalizada, corrección auditada), novedades, estancias
  entrada/salida con guardas de doble ocupación, listado de movimientos.
- I2: clientes, usuarios, celdas (ocupación derivada, no deshabilitar ocupada),
  contratos con validación de solapes bajo bloqueo de fila.
- I3: generación explícita de obligaciones (dia_vencimiento obligatorio),
  estados efectivo pendiente/pagada/vencida, pagos con idempotencia,
  comprobante interno por secuencia bloqueada, anulación solo admin con
  re-pago posterior, auditoría transversal, resumen de deuda por cliente.

## 7. Pruebas ejecutadas y resultados

- `npm run test:unit`: **15/15 pasan** (periodos, dinero, fechas Bogotá,
  placa).
- `node --check` en todos los archivos: OK; `createApp()` construye la app.
- Integración: **escrita pero NO ejecutada** (sin credenciales MySQL en este
  entorno). Cubre la matriz completa del encargo: auth/permisos, CRUDs,
  entradas/salidas, ocupación concurrente, obligaciones duplicadas, pago
  válido, montos inválidos, pago duplicado concurrente, reintento idempotente,
  conflicto de clave, anulación admin/operador/repetida, re-pago post-anulación,
  reversión ante errores, historial y comprobante.

## 8. Problemas conocidos

- Credenciales MySQL no disponibles en la sesión de desarrollo → migraciones y
  pruebas de integración pendientes de ejecución por Brayan.
- Rate limit de login en memoria (instancia única).
- JWT sin refresh; expiración configurable.
- `zod` instalado pero no usado (validación propia); valorarlo o retirarlo.

## 9. Tareas pendientes

1. Brayan: crear `.env` (ver `.env.example`), crear base `_test`, aplicar
   migraciones, ejecutar `create-admin`, correr `test:integration`.
2. Seed ficticio solo en `_test` (`seeds/001_datos_ficticios.sql` o
   `seed-test-users.js`).
3. Configurar `CORS_ORIGIN` con el origen real del frontend de Isabella.
4. Diagramas StarUML (.mdj) — pendiente del equipo.
5. Publicación en GitHub — pendiente de Brayan (no hay URL configurada).

## 10. Archivos que requieren especial cuidado

- `src/routes/pagos.js` — transacción pago+obligación, idempotencia, anulación:
  el orden de bloqueo es obligación → pago (no invertir).
- `src/routes/estancias.js` y `contratos.js` — bloqueos `FOR UPDATE` + UNIQUE
  de columnas generadas; no quitar las guardas de BD.
- `src/utils/fechas.js` — conversión ISO→Bogotá; Colombia es UTC-5 fijo.
- `src/utils/testdb.js` — guardas destructivas; no relajar.
- `migrations/001` — columnas generadas `STORED`+UNIQUE requieren MySQL ≥8.0.13
  y CHECK ≥8.0.16.

## 11. Recomendación del siguiente bloque

1. Brayan provee `.env` y crea/aplica la base `_test`; ejecutar la suite de
   integración y corregir lo que falle.
2. Aplicar migraciones a la base principal y verificar `SHOW TABLES` previo.
3. Entregar al frontend el contrato (`contrato-api-propuesto.md` §5-6) con el
   puerto real y `CORS_ORIGIN` configurado.
4. Bloque StarUML/documentación de casos de uso.
