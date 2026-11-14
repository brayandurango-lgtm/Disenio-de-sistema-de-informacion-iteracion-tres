# Contrato de API — Autos Colombia

> **Estado: IMPLEMENTADO Y VERIFICADO CONTRA MYSQL** (backend Express en
> `back end/`). Los endpoints existen, coinciden con este contrato y la suite
> de integración **17/17 se ejecutó el 2026-11-13** sobre la base `_test`
> (MySQL 8.0.46). Las pruebas unitarias (17) también se ejecutaron.
> Leyenda: **[P]** propuesto · **[I]** implementado · **[✔]** probado en
> integración.
>
> Base: `/api` · Formato: JSON · Fechas: `AAAA-MM-DD` · Instantes:
> ISO 8601 con offset `-05:00` · Montos: **cadena decimal** (`"120000.00"`),
> moneda siempre `COP` · Errores: formato centralizado (ver §0.2).

## 0. Convenciones transversales

### 0.1 Autenticación y roles **[I]**
JWT Bearer: `POST /api/auth/login` → `{ token, usuario }`. El token se envía
como `Authorization: Bearer <token>`; el servidor valida firma, expiración
(`JWT_EXPIRES_IN`, defecto 8h) y recarga el usuario desde la BD en cada
petición (rol y `activo` siempre frescos). El token incluye una huella no
reversible del `password_hash`: si la contraseña cambia, los tokens emitidos
antes responden `401 NO_AUTENTICADO` y el usuario debe iniciar sesión de nuevo
(prueba de integración `auth: cambio de contraseña invalida tokens anteriores`,
ejecutada y en verde).
`GET /api/auth/yo` devuelve el usuario autenticado (sin `password_hash`).
Roles: `administrador`, `operador`. Todas las rutas
`/api/*` requieren autenticación salvo `/api/auth/login`, `/api/salud` y
`/api/salud/db`. Login con límite de intentos (5 por IP+usuario / 15 min →
`429 DEMASIADOS_INTENTOS`).

### 0.2 Errores **[I]**
Formato único:
```json
{ "error": { "codigo": "PAGO_DUPLICADO", "mensaje": "...", "detalles": {} } }
```
Códigos implementados: `VALIDACION` (400), `NO_AUTENTICADO` (401),
`PERMISO_DENEGADO` (403), `NO_ENCONTRADO` (404), `DEMASIADOS_INTENTOS` (429),
`DUPLICADO`/`ESTADO_INVALIDO`/`OBLIGACION_YA_PAGADA`/`CELDA_NO_DISPONIBLE`/
`CONFLICTO_CONCURRENCIA` (409), `IDEMPOTENCIA_CONFLICTO` (409),
`ERROR_INTERNO` (500). `PAGO_YA_REGISTRADO` se devuelve con HTTP 200 como
respuesta idempotente (ver §0.3).

### 0.3 Idempotencia de pagos
`POST /api/pagos` exige `clave_idempotencia` (UUID v4 generado por el
cliente **una vez por intento de pago**, reutilizado en reintentos).
- Mismo `clave_idempotencia` + misma obligación → devuelve el pago
  existente con `200` (no duplica).
- `clave_idempotencia` ya usada con datos distintos → `409 IDEMPOTENCIA_CONFLICTO`.

### 0.4 Dinero
Los montos viajan como strings decimales. El servidor **ignora/compara** el
`monto` enviado contra el de la obligación; la fuente de verdad es la BD.

---

## 1. Iteración 1 — Vehículos, novedades y movimientos

### 1.1 Vehículos

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/vehiculos` | Registrar vehículo | operador, administrador |
| GET | `/api/vehiculos` | Listar (filtros: `cliente_id`, `placa`, `pagina`, `tamano`) | ambos |
| GET | `/api/vehiculos/:id` | Detalle | ambos |
| PATCH | `/api/vehiculos/:id` | Editar datos (no placa sin regla definida → propongo permitir, registrar auditoría) | ambos |

**POST `/api/vehiculos`** — body:
```json
{ "cliente_id": 1, "placa": "ABC123", "marca": "Renault",
  "modelo": "Sandero", "anio": 2021, "color": "Blanco" }
```
→ `201` `{ "id": 6, "placa": "ABC123", ... }`
Errores: `VALIDACION`, `DUPLICADO` (placa), `NO_ENCONTRADO` (cliente).

### 1.2 Novedades del vehículo

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/vehiculos/:id/novedades` | Registrar novedad | ambos |
| GET | `/api/vehiculos/:id/novedades` | Listar novedades del vehículo | ambos |

**POST** body: `{ "descripcion": "...", "fecha": "2026-11-13", "responsable": "..." }`
→ `201` objeto novedad. Errores: `VALIDACION`, `NO_ENCONTRADO`.

### 1.3 Estancias (entradas y salidas)

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/estancias` | Registrar entrada | ambos |
| GET | `/api/estancias` | Listar (`estado=abierta|cerrada`, `vehiculo_id`, `celda_id`, paginación) | ambos |
| GET | `/api/estancias/:id` | Detalle | ambos |
| POST | `/api/estancias/:id/salida` | Registrar salida y liberar celda | ambos |

**POST `/api/estancias`** — body:
```json
{ "vehiculo_id": 2, "celda_id": 7, "fecha_hora_entrada": "2026-11-13T09:05:00-05:00" }
```
`fecha_hora_entrada` opcional (default: ahora, hora Bogotá).
→ `201` `{ "id": 3, "vehiculo_id": 2, "celda_id": 7,
  "fecha_hora_entrada": "...", "fecha_hora_salida": null, "estado": "abierta" }`
Errores: `NO_ENCONTRADO`, `CELDA_NO_DISPONIBLE` (ocupada o fuera de servicio),
`ESTADO_INVALIDO` (vehículo ya tiene estancia abierta → `409`).

**POST `/api/estancias/:id/salida`** — body:
```json
{ "fecha_hora_salida": "2026-11-13T18:40:00-05:00", "motivo_salida": "Fin de visita" }
```
→ `200` estancia con `estado: "cerrada"`.
Errores: `ESTADO_INVALIDO` si ya está cerrada; `VALIDACION` si salida < entrada.

---

## 2. Iteración 2 — Clientes, usuarios y celdas

### 2.1 Clientes

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/clientes` | Crear cliente | ambos |
| GET | `/api/clientes` | Listar/buscar (`q`, `pagina`, `tamano`) | ambos |
| GET | `/api/clientes/:id` | Detalle (+ vehículos, contratos resumidos) | ambos |
| PATCH | `/api/clientes/:id` | Editar datos | ambos |

**POST body**: `{ "nombres","apellidos","tipo_documento":"CC",
"numero_documento","telefono","correo","direccion" }`
→ `201`. Errores: `VALIDACION`, `DUPLICADO` (documento).

### 2.2 Usuarios (cuentas de acceso)

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/usuarios` | Crear cuenta (admin define password inicial) | **administrador** |
| GET | `/api/usuarios` | Listar | administrador |
| PATCH | `/api/usuarios/:id` | Editar datos / cambiar rol / desactivar | administrador |
| POST | `/api/usuarios/:id/cambiar-password` | Cambiar contraseña | administrador o el propio usuario |

**POST body**: `{ "nombre_usuario","correo","password","rol":"operador",
"cliente_id": null }`
→ `201` (sin devolver password). Errores: `VALIDACION`, `DUPLICADO`,
`PERMISO_DENEGADO`.
> Pendiente: mecanismo de hash (bcrypt) y login — bloque posterior.

### 2.3 Celdas

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/celdas` | Crear celda | administrador |
| GET | `/api/celdas` | Listar con ocupación derivada (`estado`, `ocupada`) | ambos |
| GET | `/api/celdas/:id` | Detalle + estancia abierta si existe | ambos |
| PATCH | `/api/celdas/:id` | Editar código/tipo/estado | administrador |

**PATCH `/api/celdas/:id`** body: `{ "estado": "fuera_de_servicio" }`
→ `200`. Error: `ESTADO_INVALIDO` si se intenta deshabilitar una celda con
estancia abierta (`409`).

---

## 3. Iteración 3 — Contratos, obligaciones y pagos

### 3.1 Contratos de mensualidad

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/contratos` | Crear contrato | ambos |
| GET | `/api/contratos` | Listar (`cliente_id`, `vehiculo_id`, `estado`) | ambos |
| GET | `/api/contratos/:id` | Detalle + obligaciones | ambos |
| PATCH | `/api/contratos/:id` | Editar tarifa/finitud/estado (finalizar, cancelar) | ambos |

**POST body**:
```json
{ "vehiculo_id": 1, "cliente_id": 1, "tarifa_mensual": "120000.00",
  "fecha_inicio": "2026-01-01", "fecha_fin": null }
```
→ `201`. Errores: `VALIDACION` (fechas no día 1/fin de mes, tarifa ≤ 0),
`CONFLICTO_CONCURRENCIA`/`ESTADO_INVALIDO` (solape de periodos del vehículo).

### 3.2 Obligaciones de pago **[I]**

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/contratos/:id/obligaciones/generar` | Generar obligaciones explícitamente | ambos |
| GET | `/api/obligaciones` | Listar (`contrato_id`, `estado`, `periodo_desde/hasta`, paginación) | ambos |
| GET | `/api/obligaciones/:id` | Detalle + pagos asociados | ambos |

**Respuesta obligación** incluye `estado_efectivo` calculado:
`pendiente` | `pagada` | `vencida` (pendiente + `fecha_vencimiento < hoy` Bogotá).
La columna almacenada `estado` solo distingue `pendiente`/`pagada`.

**POST generar** — body (implementado):
```json
{ "periodos": ["2026-11", "2026-12"], "dia_vencimiento": 5 }
```
- `periodos` **o** rango `desde`/`hasta` (ambos `YYYY-MM`, inclusivos).
- `dia_vencimiento` (entero 1-28) **obligatorio**: regla explícita del
  solicitante; el vencimiento = ese día del mes siguiente al periodo.
- `vencimientos` opcional: `{ "2026-11": "2026-12-07" }` para overrides.
- Todos los periodos deben estar dentro de la vigencia del contrato.
→ `201` `{ "generadas": n, "omitidas": n, "obligaciones": [...] }`.
Idempotente por `UNIQUE(contrato_id, periodo)`.
Errores: `VALIDACION` (periodo fuera de vigencia, formato, falta
`dia_vencimiento`), `NO_ENCONTRADO`, `ESTADO_INVALIDO` (contrato cancelado).

### 3.3 Pagos **[I]**

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| POST | `/api/pagos` | Registrar pago de una obligación | ambos |
| GET | `/api/pagos` | Historial (`obligacion_id`, `contrato_id`, `cliente_id`, `desde`, `hasta`, `estado`, paginación) | ambos |

`desde` y `hasta` son instantes ISO 8601 y se comparan contra `fecha_hora`
(hora Bogotá). Una fecha sola (`AAAA-MM-DD`) se interpreta como las 00:00 de
ese día. Para incluir un día completo en un reporte use
`hasta=AAAA-MM-DDT23:59:59-05:00` (así lo hacen las herramientas auxiliares).
| GET | `/api/pagos/:id` | Detalle + comprobante | ambos |
| POST | `/api/pagos/:id/anular` | Anular pago (corrección) | **administrador** |

**POST `/api/pagos`** — body:
```json
{
  "obligacion_id": 2,
  "metodo_pago": "efectivo",
  "clave_idempotencia": "9f1b2c3d-....-uuid-del-cliente",
  "fecha_hora": "2026-11-13T10:30:00-05:00"
}
```
(`monto` opcional; si se envía debe coincidir con el importe de la obligación
→ si difiere, `400 VALIDACION`). `fecha_hora` rechaza valores a más de 5 min
en el futuro. `clave_idempotencia` debe ser UUID (formato validado).
→ `201` (o `200` si la clave ya existía con datos equivalentes):
```json
{ "id": 6, "identificador": "uuid", "comprobante": "CMP-2026-000006",
  "obligacion_id": 2, "metodo_pago": "efectivo", "monto": "120000.00",
  "moneda": "COP", "fecha_hora": "...", "estado": "confirmado",
  "obligacion": { "id": 2, "periodo": "2026-11", "estado": "pagada" } }
```
Errores: `OBLIGACION_YA_PAGADA` (`409`, incluye `pago_existente`),
`IDEMPOTENCIA_CONFLICTO` (`409`, misma clave con datos distintos),
`VALIDACION` (método, fecha futura, monto distinto, obligación inexistente),
`PERMISO_DENEGADO`, `CONFLICTO_CONCURRENCIA`. La respuesta incluye el objeto
`obligacion` resumida (`periodo`, `estado_efectivo`).

**POST `/api/pagos/:id/anular`** — body:
```json
{ "motivo": "Monto registrado con billete equivocado" }
```
→ `200` pago con `estado: "anulado"` + `motivo_anulacion`, `anulado_por_id`,
`anulado_en`. La obligación vuelve a `pendiente` y admite un nuevo pago.
Errores: `PERMISO_DENEGADO` (no admin), `ESTADO_INVALIDO` (ya anulado),
`VALIDACION` (sin motivo). La anulación es atómica (mismo orden de bloqueo
que el registro: obligación → pago) y queda en `auditoria_operaciones`.

**GET `/api/pagos/:id/comprobante`** — detalle del comprobante interno.

### 3.4 Consulta transversal útil **[I]**

| Método | Ruta | Objetivo | Rol |
|---|---|---|---|
| GET | `/api/resumen/cliente/:id` | Deuda actual del cliente: obligaciones vencidas/pendientes + estancias abiertas | ambos |

---

## 4. Matriz de autorización resumida

| Operación | operador | administrador |
|---|---|---|
| Clientes, vehículos, novedades, estancias, celdas (lectura) | ✔ | ✔ |
| Crear/editar clientes, vehículos, novedades, estancias | ✔ | ✔ |
| Celdas: crear/editar estado | ✘ | ✔ |
| Usuarios: crear/editar/desactivar | ✘ | ✔ |
| Contratos, obligaciones, generar obligaciones | ✔ | ✔ |
| Registrar pago, consultar pagos | ✔ | ✔ |
| Anular pago | ✘ | ✔ |

---

## 5. Autenticación: endpoints **[I]**

| Método | Ruta | Rol | Notas |
|---|---|---|---|
| POST | `/api/auth/login` | público | body `{nombre_usuario, password}` → `{token, usuario}`. Errores: `VALIDACION`, `NO_AUTENTICADO`, `DEMASIADOS_INTENTOS` |
| GET | `/api/auth/yo` | ambos | usuario autenticado actual |

 health: `GET /api/salud`, `GET /api/salud/db` (públicos, sin datos sensibles).

## 6. Integración con el frontend (Isabella)

- **CORS**: el backend solo acepta orígenes listados en `CORS_ORIGIN`
  (variable de `.env`, separados por coma). Para desarrollo local agregar el
  origen real del frontend, p. ej. `CORS_ORIGIN=http://localhost:5173`
  (el puerto lo define el equipo de frontend; no está fijado aquí).
- **Cabecera**: `Authorization: Bearer <token>` en toda llamada autenticada.
- **Manejo de errores**: leer `error.codigo` del cuerpo (ver §0.2).
- **Pagos**: generar `clave_idempotencia` (UUID v4) una vez por intento de
  pago y reutilizarla en reintentos; nunca por clic.
- **Montos**: enviar/recibir como cadena decimal; no parsear a `float`.
