# Alcance y decisiones — Autos Colombia (iteración 3 / reconstrucción)

> Estado: decisiones aprobadas por el equipo (Brayan + Isabella) para la
> reconstrucción integrada de las iteraciones 1, 2 y 3. Son decisiones de
> diseño del equipo, no requisitos textuales del docente.

## 1. Decisiones aprobadas

### A. Clientes y cuentas de acceso
- Se distingue **cliente** (quien registra vehículos y paga) de **cuenta de
  acceso** (staff que opera el sistema).
- Roles iniciales: `administrador` y `operador`.
- No hay portal de autoservicio del cliente en esta versión.
- No se hacen eliminaciones físicas de registros referenciados; se usan
  estados (`activo`, `finalizado`, `cancelado`, `anulado`, etc.).

### B. Vehículos y contratos
- Un cliente puede registrar varios vehículos.
- Cada contrato de mensualidad corresponde a **un vehículo** y a **un cliente
  responsable** (puede diferir del titular del vehículo).
- Un vehículo no puede tener contratos vigentes con periodos superpuestos.
- La tarifa mensual se registra en el contrato.
- Las obligaciones generadas conservan su importe aunque la tarifa del
  contrato cambie después.
- Los importes de ejemplo son ficticios; no hay valor monetario definitivo.

### C. Periodos y obligaciones
- Mensualidades por **mes calendario** (`periodo = 'YYYY-MM'`).
- Sin prorrateos.
- Cada obligación registra periodo, importe y fecha de vencimiento.
- `UNIQUE(contrato_id, periodo)` impide duplicar la obligación del mismo mes.
- La generación de obligaciones es una **operación explícita** del sistema
  (endpoint), no una tarea automática en segundo plano.
- `fecha_inicio` y `fecha_fin` del contrato delimitan los periodos
  facturables. `fecha_inicio` debe ser el primer día de un mes; `fecha_fin`
  NULL = sin fin; si existe, debe ser el último día de un mes. Estas reglas
  se validan en el servicio (no en DDL).

### D. Celdas
- Celdas compartidas; se asignan por estancia, no reservadas por contrato.
- Una entrada requiere celda `habilitada` y libre.
- Un vehículo no puede tener dos estancias abiertas.
- Una celda no puede tener dos estancias abiertas.
- La salida cierra la estancia y libera la ocupación.
- `celdas.estado` (habilitada/fuera_de_servicio) es independiente de la
  ocupación.
- No se puede deshabilitar una celda ocupada sin cerrar antes la estancia.

### E. Pagos
- Moneda: **COP** (pesos colombianos).
- Registro **manual** por un operador. El sistema registra la operación; **no
  verifica** que una transferencia bancaria se haya recibido.
- Medios: `efectivo` y `transferencia`.
- Un pago cubre **una sola obligación completa**. Sin abonos parciales ni
  pagos agregados.
- Se permite pagar una obligación de periodo futuro si ya existe y está
  dentro de la vigencia del contrato.
- Sin intereses, descuentos, pasarela bancaria ni facturación electrónica.
- Cada pago genera `identificador` (UUID) y `comprobante` interno
  (`CMP-AAAA-NNNNNN`); el comprobante **no es una factura electrónica**.

### F. Correcciones
- No se edita ni elimina físicamente un pago confirmado.
- Corrección = **anulación** autorizada solo al `administrador`.
- La anulación conserva motivo, fecha y responsable.
- La obligación vuelve a `pendiente` salvo que exista otro pago válido.
- La anulación es un ajuste de registro; **no ejecuta devoluciones**.

### G. Morosidad
- Obligación vencida y no pagada → **alerta** (calculada, no almacenada).
- La deuda **no bloquea** entradas ni salidas.
- La vigencia del contrato es independiente de la alerta de deuda.

## 2. Estructura de carpetas acordada

```
Disenio de sistema de informacion iteracion tres/
├── back end/            # backend Express + migraciones + seeds + pruebas
├── front end/           # frontend a cargo de Isabella (no se toca aquí)
└── full stack/docs/     # documentación e integración compartida
```

## 3. Convenciones

- Fechas de negocio (periodo, vencimiento) → `DATE` / `CHAR(7)`.
- Instantes (entrada, salida, pago, auditoría) → `DATETIME` en **hora local
  de Colombia (America/Bogota, UTC-5 fijo; Colombia no usa horario de
  verano)**. El servidor normaliza las entradas ISO 8601 al offset -05:00.
- Importes → `DECIMAL(12,2)` en MySQL; en JavaScript se transportan como
  **cadena decimal** (mysql2 `decimalNumbers: false`) para evitar pérdida de
  precisión; nunca se hacen cálculos monetarios con `float`.
