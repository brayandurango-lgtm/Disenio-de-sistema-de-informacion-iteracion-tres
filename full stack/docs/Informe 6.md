# Traspaso a Antigravity — frontend e integración

> Este documento describe el backend **ya implementado y verificado**. No es
> una propuesta de reconstrucción: la API existe, responde y está probada
> contra MySQL. Antigravity continúa con el frontend, la integración y la
> evolución del contrato. **No reconstruya la API ni duplique la aplicación
> dentro de `full stack/`.** Antes de modificar archivos del frontend, revise
> si Isabella ya los creó.

## 1. Arquitectura real

```text
front end/            Cliente (Isabella) — no lo modifica el backend
back end/             API REST Express 4 (ESM) + MySQL 8
  src/app.js          Express, CORS, salud, montaje de rutas
  src/index.js        Arranque y apagado ordenado
  src/config.js       Variables validadas; sin secretos en errores
  src/db.js           Pool mysql2 + transacciones (conTransaccion)
  src/routes/         auth, clientes, usuarios, vehiculos, novedades,
                      celdas, estancias, contratos, obligaciones, pagos, resumen
  src/middleware/     auth JWT, roles, rate-limit login, errores, logger
  migrations/         001 esquema (10 tablas) y 002 secuencias de comprobante
  test/               unitarias e integración
  tools/              utilidades Java y Python (no son backends alternativos)
full stack/docs/      documentación compartida
```

- Node.js ≥ 20 (verificado con v26.7.0), MySQL ≥ 8.0.16 (verificado 8.0.46).
- La API **no** habilita `multipleStatements`; la migración usa un script
  aparte con conexión dedicada.
- No hay autenticación por cookies: solo `Authorization: Bearer <JWT>`.

## 2. Comandos de arranque

```bash
cd "back end"
npm install
npm start            # servidor en http://127.0.0.1:3000
npm run dev          # modo --watch
```

Salud (sin token):

```bash
curl http://127.0.0.1:3000/api/salud
curl http://127.0.0.1:3000/api/salud/db
```

**URL base local comprobada:** `http://127.0.0.1:3000/api` (puerto 3000
verificado libre; salud y base conectada respondieron en la verificación).

## 3. Configuración requerida (sin secretos)

`back end/.env` (no versionado) exige:

| Variable | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL |
| `JWT_SECRET` | Firma HS256; mínimo recomendable 32 caracteres |
| `PORT` | Puerto HTTP (3000 por defecto) |
| `CORS_ORIGIN` | Origen(es) del frontend separados por coma |
| `JWT_EXPIRES_IN` | Vida del token (`8h` por defecto) |
| `DB_POOL_SIZE`, `LOGIN_*` | Opcionales |

`back end/.env.test` (no versionado; solo pruebas) define `TEST_MODE=1`,
`ALLOW_TEST_DB_RESET=1`, `DB_NAME=..._test`, un `JWT_SECRET` exclusivo de
pruebas y hereda las credenciales `DB_*` de `.env`. **Nunca** apunte a la base
principal.

## 4. Contrato de autenticación

1. `POST /api/auth/login` con `{ "nombre_usuario", "password" }`.
2. Respuesta `200`:

```json
{
  "token": "<jwt>",
  "usuario": { "id": 1, "nombre_usuario": "admin.autoscolombia", "rol": "administrador" }
}
```

3. Enviar `Authorization: Bearer <jwt>` en todas las rutas salvo salud y login.
4. El servidor valida firma, expiración y recarga el usuario: si está
   desactivado o cambió su contraseña, responde `401 NO_AUTENTICADO`.
5. `GET /api/auth/yo` devuelve el usuario autenticado sin `password_hash`.
6. Tras 5 intentos fallidos del mismo usuario/IP en 15 minutos: `429
   DEMASIADOS_INTENTOS`.
7. El frontend debe descartar el token ante cualquier `401` y volver al login.
   No hay refresh token; al expirar (8h) se inicia sesión de nuevo.

## 5. Endpoints implementados

| Recurso | Rutas |
|---|---|
| Salud | `GET /api/salud`, `GET /api/salud/db` |
| Auth | `POST /api/auth/login`, `GET /api/auth/yo` |
| Clientes | `GET/POST /api/clientes`, `GET/PATCH /api/clientes/:id` |
| Usuarios | `GET/POST /api/usuarios`, `PATCH /api/usuarios/:id`, `POST /api/usuarios/:id/cambiar-password` |
| Vehículos | `GET/POST /api/vehiculos`, `GET/PATCH /api/vehiculos/:id` |
| Novedades | `GET/POST /api/vehiculos/:id/novedades` |
| Celdas | `GET/POST /api/celdas`, `GET/PATCH /api/celdas/:id` |
| Estancias | `GET/POST /api/estancias`, `GET /api/estancias/:id`, `POST /api/estancias/:id/salida` |
| Contratos | `GET/POST /api/contratos`, `GET/PATCH /api/contratos/:id`, `POST /api/contratos/:id/obligaciones/generar` |
| Obligaciones | `GET /api/obligaciones`, `GET /api/obligaciones/:id` |
| Pagos | `GET/POST /api/pagos`, `GET /api/pagos/:id`, `GET /api/pagos/:id/comprobante`, `POST /api/pagos/:id/anular` |
| Resumen | `GET /api/resumen/cliente/:id` |

Listados: `pagina` y `tamano` (por defecto 1 y 20). Respuesta:
`{ "datos": [...], "paginacion": { "pagina", "tamano", "total", "paginas" } }`.
Filtros: clientes `q`; vehículos `cliente_id`/`placa`; contratos
`cliente_id`/`vehiculo_id`/`estado`; pagos `obligacion_id`/`contrato_id`/
`cliente_id`/`desde`/`hasta`/`estado`.

## 6. Ejemplos ficticios

Crear cliente:

```http
POST /api/clientes
{ "nombres": "Ana", "apellidos": "Pérez", "tipo_documento": "CC",
  "numero_documento": "900000123", "correo": "ana@ficticio.example" }
```

`201`:

```json
{ "id": 10, "nombres": "Ana", "apellidos": "Pérez", "tipo_documento": "CC",
  "numero_documento": "900000123", "telefono": null,
  "correo": "ana@ficticio.example", "direccion": null }
```

`telefono`, `correo` y `direccion` son opcionales; omitirlos guarda `NULL`.

Pago idempotente:

```http
POST /api/pagos
{ "obligacion_id": 7, "metodo_pago": "efectivo",
  "clave_idempotencia": "3f1c9a1e-7b2d-4c55-9a10-0f6a2b8c9d11" }
```

`201`:

```json
{ "id": 21, "comprobante": "CMP-2026-000004", "estado": "confirmado",
  "monto": "120000.00", "moneda": "COP", "metodo_pago": "efectivo" }
```

Repetir la misma clave con los mismos datos → `200` con el mismo pago.
Misma clave con datos distintos → `409 IDEMPOTENCIA_CONFLICTO`.
Obligación ya pagada con otra clave → `409 OBLIGACION_YA_PAGADA`.

Error típico:

```json
{ "error": { "codigo": "CELDA_NO_DISPONIBLE", "mensaje": "...", "detalles": {} } }
```

## 7. Estructura de errores

```json
{ "error": { "codigo": "VALIDACION", "mensaje": "...", "detalles": {} } }
```

| HTTP | Códigos |
|---|---|
| 400 | `VALIDACION` |
| 401 | `NO_AUTENTICADO` |
| 403 | `PERMISO_DENEGADO` |
| 404 | `NO_ENCONTRADO` |
| 409 | `DUPLICADO`, `ESTADO_INVALIDO`, `OBLIGACION_YA_PAGADA`, `CELDA_NO_DISPONIBLE`, `CONFLICTO_CONCURRENCIA`, `IDEMPOTENCIA_CONFLICTO` |
| 429 | `DEMASIADOS_INTENTOS` |
| 500 | `ERROR_INTERNO` (sin detalles internos) |

El frontend debe mostrar `error.mensaje` y usar `error.codigo` para lógica.
`PAGO_YA_REGISTRADO` llega con HTTP 200 como respuesta idempotente.

## 8. Roles y permisos

| Acción | administrador | operador |
|---|---|---|
| Consultar clientes, vehículos, celdas, estancias, contratos, obligaciones, pagos | sí | sí |
| Crear/editar clientes, vehículos, novedades, estancias, contratos, generar obligaciones, registrar pagos | sí | sí |
| Crear/editar celdas y usuarios; listar usuarios | sí | no |
| Anular pagos | sí | no |
| Cambiar contraseña | de cualquiera | solo la propia (exige `password_actual`) |

## 9. Formatos monetarios y de fecha

- Montos: **cadena decimal** con dos decimales (`"120000.00"`); moneda `COP`.
  Nunca usar `number`/`float` para sumar. `DECIMAL(12,2)` en MySQL.
- Fechas de negocio: `AAAA-MM-DD` (`fecha_inicio`, `fecha_vencimiento`).
- Periodos de mensualidad: `AAAA-MM`.
- Instantes: ISO 8601 con offset `-05:00` (Colombia, UTC-5 fijo). Los listados
  aceptan `desde`/`hasta` con ese formato.
- `fecha_hora_entrada`/`salida` se devuelven como `DATETIME` de Bogotá.

## 10. Reglas de idempotencia

- Cada intento de pago envía un UUID v4 en `clave_idempotencia`.
- Reintentos con la misma clave y mismos datos devuelven el pago existente
  (HTTP 200) sin duplicar.
- Misma clave con datos distintos → conflicto (409).
- Una obligación admite un solo pago válido; el duplicado concurrente se
  resuelve con bloqueo de fila y restricción única.
- El comprobante `CMP-AAAA-NNNNNN` es interno y consecutivo por año; **no** es
  factura electrónica.

## 11. Estados de deuda que debe mostrar el frontend

`GET /api/obligaciones/:id` y el resumen del cliente exponen `estado` y
`estado_efectivo`:

| `estado_efectivo` | Significado | UI sugerida |
|---|---|---|
| `pendiente` | No pagada y aún no vence | normal |
| `vencida` | No pagada con `fecha_vencimiento` anterior a hoy | alerta |
| `pagada` | Tiene pago confirmado | éxito |

`GET /api/resumen/cliente/:id` devuelve obligaciones pendientes/vencidas,
estancias abiertas y totales. La deuda es una **alerta**: no bloquea entradas
ni salidas.

## 12. Procedimiento para configurar CORS

1. Obtener el origen real del frontend (esquema, host y puerto; sin ruta).
2. En `back end/.env`, definir `CORS_ORIGIN` con uno o varios orígenes
   separados por coma, p. ej. `http://localhost:5173`.
3. Reiniciar el servidor. Vacío = solo mismo origen; `*` no está permitido
   como comodín en la configuración de pruebas y debe evitarse.
4. Verificar con una petición `OPTIONS`/`GET` desde el navegador; el error de
   CORS aparece en la consola del navegador, no en el log del API.
5. Si cambia el puerto del frontend, actualizar `CORS_ORIGIN`. Documentar el
   cambio en el contrato si afecta a otros entornos.

## 13. Matriz de pantallas y endpoints sugerida

| Pantalla | Endpoints |
|---|---|
| Login | `POST /auth/login`, `GET /auth/yo` |
| Panel/inicio | `GET /salud` (estado), `GET /resumen/cliente/:id` |
| Clientes (lista/detalle) | `GET/POST /clientes`, `GET/PATCH /clientes/:id` |
| Vehículos y novedades | `GET/POST /vehiculos`, `GET /vehiculos/:id`, `GET/POST /vehiculos/:id/novedades` |
| Celdas y ocupación | `GET /celdas`, `GET/POST /celdas` (admin), `GET/PATCH /celdas/:id` |
| Entradas/salidas | `GET/POST /estancias`, `POST /estancias/:id/salida` |
| Contratos | `GET/POST /contratos`, `GET/PATCH /contratos/:id` |
| Obligaciones | `GET /obligaciones`, `GET /obligaciones/:id`, `POST /contratos/:id/obligaciones/generar` |
| Pagos y comprobantes | `GET/POST /pagos`, `GET /pagos/:id`, `GET /pagos/:id/comprobante`, `POST /pagos/:id/anular` (admin) |
| Usuarios (admin) | `GET/POST /usuarios`, `PATCH /usuarios/:id`, `POST /usuarios/:id/cambiar-password` |
| Deuda del cliente | `GET /resumen/cliente/:id` |

## 14. Resultados reales de pruebas (2026-11-13)

| Suite | Resultado |
|---|---|
| Unitarias backend | **17/17** |
| Integración contra MySQL | **17/17 ejecutadas**, 0 omitidas |
| Java `reporte_recaudos` | **14/14** JUnit + ejecución contra la API de pruebas: 5 pagos, 3 confirmados (360000.00 COP), 2 anulados (240000.00 COP); CSV coincide con la BD |
| Servidor real | salud OK, base conectada, 401 sin token, recorrido integrado 19/19 |
| Python | **no ejecutada** (no hay intérprete en el equipo) |

Las pruebas cubren los flujos acordados, no carga real, no recuperación ante
caída de MySQL y no cobertura total de combinaciones.

## 15. Limitaciones y pendientes

- `.env` usa `DB_USER=root`; debe cambiarse a una cuenta con solo DML antes de
  operar fuera de pruebas.
- La base principal está migrada pero **sin administrador**:
  `npm run create-admin` (interactivo) queda a cargo de Brayan.
- Rate limit de login en memoria: válido para una sola instancia.
- Sin refresh token: al expirar se vuelve a iniciar sesión.
- Sin tarea automática de generación de obligaciones: es explícita por
  endpoint (decisión de negocio).
- Comprobante interno, no factura electrónica.
- Python 3.10+: instalar y ejecutar su suite y la herramienta contra la API de
  pruebas cuando esté disponible.
- Si el contrato cambia, actualice `contrato-api-propuesto.md`, agregue o
  ajuste pruebas y registre el resultado; no cambie el contrato solo en el
  frontend.

## 16. Límites para Antigravity

- No reconstruir la API ni mover lógica de negocio al frontend.
- No duplicar la aplicación dentro de `full stack/`.
- Revisar los archivos existentes de Isabella antes de modificarlos.
- No publicar credenciales, tokens ni archivos `.env`.
- TypeScript para un cliente tipado queda para una fase posterior; no migrar
  el backend a TypeScript en esta etapa.
