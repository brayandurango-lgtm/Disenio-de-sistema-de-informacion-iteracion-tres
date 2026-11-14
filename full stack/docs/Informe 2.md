# Modelo de datos — Autos Colombia (esquema integrado)

Fuente DDL: `back end/migrations/001_esquema_integrado.sql` +
`back end/migrations/002_secuencias_comprobante.sql`.
Motor: MySQL 8.0.16+ (verificado contra 8.0.46), InnoDB, utf8mb4.
Estado: migraciones escritas; aplicación a la base principal pendiente de
credenciales (ver `back end/README.md`).

## 1. Diagrama entidad-relación (texto)

```
clientes 1───* vehiculos 1───* estancias *───1 celdas
    │            │              │
    │            │              └── usuario_registro → usuarios
    │            │
    │            └──* contratos_mensualidad *───1 obligaciones_pago
    │                     (cliente_id → clientes)        │
    │                                                    └──* pagos
    └──* usuarios (cuenta de acceso, opcional)              │
                                                         └── anulado_por → usuarios
vehiculos 1───* novedades_vehiculo

usuarios 1───* auditoria_operaciones (usuario_id)
```

## 2. Entidades y cardinalidades

| Tabla | Propósito | Cardinalidad clave |
|---|---|---|
| `clientes` | Persona que registra vehículos y paga | 1:N con `vehiculos`, `contratos_mensualidad` (responsable), `usuarios` (opcional) |
| `usuarios` | Cuenta de acceso al sistema (admin/operador) | N:1 con `clientes` (NULL = staff) |
| `vehiculos` | Vehículo registrado por un cliente | N:1 con `clientes`; 1:N con `estancias`, `novedades`, `contratos` |
| `novedades_vehiculo` | Novedad sencilla del vehículo | N:1 con `vehiculos` |
| `celdas` | Celda física del parqueadero | 1:N con `estancias` (histórico) |
| `estancias` | Entrada/salida (movimiento) | N:1 con `vehiculos`, `celdas`, `usuarios` |
| `contratos_mensualidad` | Contrato de mensualidad por vehículo | N:1 con `vehiculos` y `clientes`; 1:N con `obligaciones_pago` |
| `obligaciones_pago` | Lo que se debe por un periodo | N:1 con `contratos_mensualidad` |
| `pagos` | Registro de pago manual | N:1 con `obligaciones_pago`, `usuarios` (registro y anulación) |
| `auditoria_operaciones` | Trazabilidad transversal | N:1 con `usuarios` (quien ejecutó) |
| `secuencias_comprobante` | Consecutivo `CMP-AAAA-NNNNNN` por año | 1:1 con año; bloqueo de fila en transacción |

## 3. Reglas de integridad implementadas en DDL

- PKs `BIGINT UNSIGNED AUTO_INCREMENT` en todas las tablas.
- FKs con `InnoDB` en todas las relaciones (sin huérfanos).
- `UNIQUE` en: documento de cliente (tipo+número), nombre/correo de usuario,
  placa, código de celda, `(contrato_id, periodo)` de obligación,
  `identificador`/`comprobante`/`clave_idempotencia` de pago.
- Columnas generadas `STORED` + `UNIQUE` como guardas de concurrencia:
  - `estancias.vehiculo_ocupado_id`, `estancias.celda_ocupada_id`
    → máximo una estancia abierta por vehículo y por celda.
  - `pagos.obligacion_valida_id` → máximo un pago `confirmado` por
    obligación, permitiendo re-pago tras anulación.
- `CHECK` de coherencia: fechas de contrato/estancia, montos > 0,
  coherencia de datos de anulación en `pagos`.
- Índices en claves de búsqueda frecuente: periodo/estado de obligación,
  fecha de pago, vehículo/celda de estancia.

## 4. Reglas que viven en el servicio/transacción (no en DDL)

- No solapar contratos del mismo vehículo (validación + bloqueo de fila).
- `fecha_inicio` = primer día de mes; `fecha_fin` = último día de mes o NULL.
- `fecha_vencimiento` al generar obligación (regla acordada, p. ej. día 5
  del mes siguiente al periodo).
- Celda `habilitada` y libre al registrar entrada.
- Monto del pago = importe de la obligación (el servidor lo fija; el cliente
  no puede enviar otro valor).
- Generación de `comprobante` consecutivo sin huecos duplicados: tabla
  `secuencias_comprobante(anio, ultimo)` con `INSERT ... ON DUPLICATE KEY
  UPDATE` + `SELECT ... FOR UPDATE` dentro de la transacción del pago
  (sin `MAX()+1`).
- Alerta de mora calculada: `estado='pendiente' AND fecha_vencimiento < hoy`.

## 5. Separación obligación / pago

`obligaciones_pago` responde *qué se debe* (contrato + periodo + importe +
vencimiento). `pagos` responde *qué se registró* (monto, método, quién, cuándo,
estado). La obligación solo pasa a `pagada` cuando existe un pago
`confirmado`; la anulación la devuelve a `pendiente`. El importe de la
obligación nunca cambia aunque cambie la tarifa del contrato.

## 6. Convenciones de tipos

- `periodo CHAR(7)` formato `YYYY-MM`; comparable lexicográficamente.
- Fechas de negocio `DATE`; instantes `DATETIME` en hora Bogotá.
- Auditoría con `DATETIME(3)` para orden preciso de eventos.
- `JSON` en `auditoria_operaciones.detalle` para contexto variable.
