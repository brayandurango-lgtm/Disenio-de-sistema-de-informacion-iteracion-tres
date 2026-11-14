# Diagramas del parqueadero — Iteración 3

Este paquete cuenta la historia de Autos Colombia: desde que un vehículo entra a una celda hasta que se registra la mensualidad y queda su comprobante. Las fuentes se contrastaron con las rutas y pantallas disponibles en el proyecto.

| Diagrama | Fuente | Exportación | Herramienta | Estado de validación |
|---|---|---|---|---|
| Casos de uso de pagos | [casos-uso-iteracion-3.puml](modelos-editables/casos-uso-iteracion-3.puml) | Pendiente | PlantUML como fuente; construcción final en StarUML | Revisado contra requisitos y permisos del backend; sin render ni revisión en StarUML |
| Secuencia de pago e idempotencia | [secuencia-pago.puml](modelos-editables/secuencia-pago.puml) | Pendiente | PlantUML como fuente; construcción final en StarUML | Orden cotejado con `back end/src/routes/pagos.js`, `middleware/auth.js` y `db.js`; sin render ni revisión en StarUML |
| Secuencia de las tres iteraciones | [secuencia-integrada-tres-iteraciones.puml](modelos-editables/secuencia-integrada-tres-iteraciones.puml) | Pendiente | PlantUML como fuente; construcción final en StarUML | Recorrido contrastado con las rutas disponibles; sin render ni revisión en StarUML |
| Componentes de las tres iteraciones | [componentes-tres-iteraciones.puml](modelos-editables/componentes-tres-iteraciones.puml) | Pendiente | PlantUML como fuente; construcción final en StarUML | Componentes cotejados con la aplicación y las herramientas; Python sigue pendiente de ejecución |

## Qué cuenta cada diagrama

1. **Casos de uso:** quién puede consultar obligaciones, generar mensualidades, registrar pagos, revisar historial y deuda, o anular un pago.
2. **Pago e idempotencia:** cómo una confirmación se convierte en un pago único y qué ocurre si la respuesta se pierde o se repite la solicitud.
3. **Recorrido integrado:** cómo conviven el registro de clientes y vehículos, la ocupación de celdas, las estancias y los pagos mensuales.
4. **Componentes:** cómo se comunican la interfaz, la API, MySQL y las herramientas de reporte.

## Estado de entrega

Las cuatro fuentes editables `.puml` están disponibles en [modelos-editables/](modelos-editables/). En este equipo no se detectaron StarUML ni PlantUML; por tanto, no se generó un proyecto `.mdj` ni exportaciones SVG/PNG. Tampoco se declara una revisión visual. La actividad todavía requiere construir y abrir el proyecto en StarUML, revisar su disposición y exportar cada vista. La guía paso a paso está en [guia-manual-staruml.md](../guia-manual-staruml.md).

El diagrama integrado es un recorrido ilustrativo: generar una obligación después de una salida no es requisito del sistema. El cobro corresponde a una mensualidad completa, no al tiempo estacionado; una deuda genera información de cartera, no un bloqueo automático de entrada o salida.
