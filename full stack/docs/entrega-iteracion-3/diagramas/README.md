# Diagramas del parqueadero — Iteración 3

Cuatro vistas para entender cómo se administra una mensualidad en Autos Colombia: quién puede hacerlo, cómo se registra sin duplicar pagos, cómo encaja con las estancias y qué piezas colaboran detrás de la interfaz.

| Diagrama | Fuente PlantUML | Exportación visual | Renderizado | Revisión visual | StarUML |
|---|---|---|---|---|---|
| Casos de uso de pagos | [casos-uso-iteracion-3.puml](modelos-editables/casos-uso-iteracion-3.puml) | [SVG](exportaciones/casos-uso-iteracion-3.svg) · [PNG](exportaciones/casos-uso-iteracion-3.png) | PlantUML 1.2026.10: correcto | Revisado en pantalla | Pendiente |
| Pago e idempotencia | [secuencia-pago.puml](modelos-editables/secuencia-pago.puml) | [SVG](exportaciones/secuencia-pago.svg) · [PNG](exportaciones/secuencia-pago.png) | PlantUML 1.2026.10: correcto | Revisado en pantalla | Pendiente |
| Secuencia integrada | [secuencia-integrada-tres-iteraciones.puml](modelos-editables/secuencia-integrada-tres-iteraciones.puml) | [SVG](exportaciones/secuencia-integrada-tres-iteraciones.svg) · [PNG](exportaciones/secuencia-integrada-tres-iteraciones.png) | PlantUML 1.2026.10: correcto | Revisado en pantalla | Pendiente |
| Componentes | [componentes-tres-iteraciones.puml](modelos-editables/componentes-tres-iteraciones.puml) | [SVG](exportaciones/componentes-tres-iteraciones.svg) · [PNG](exportaciones/componentes-tres-iteraciones.png) | PlantUML 1.2026.10: correcto | Revisado en pantalla | Pendiente |

## Cómo leerlos

1. **Casos de uso:** muestra las tareas de Operador y Administrador; la anulación queda reservada a administración.
2. **Pago e idempotencia:** sigue la confirmación desde la interfaz hasta MySQL y enseña qué pasa con reintentos, errores y pagos ya registrados.
3. **Secuencia integrada:** recorre preparación, entradas/salidas y mensualidades. Es un ejemplo de recorrido, no una dependencia temporal del sistema.
4. **Componentes:** presenta la interfaz, la API, la base de datos y las herramientas de reportes como piezas conectadas, sin tratarlas como microservicios.

## Alcance y observaciones

Las fuentes se contrastaron con requisitos, historias, rutas y código. La ruta de entrada actual valida que existan el vehículo y la celda esté habilitada y libre, pero no consulta el contrato; el diagrama lo señala para no atribuir al código una comprobación que hoy no hace. Asimismo, al recuperar una clave idempotente existente, el backend compara obligación y método, pero no coteja todos los campos opcionales del payload; la secuencia documenta esta limitación.

El diagrama integrado no calcula cobro por horas: la mensualidad se genera explícitamente y no depende de una salida. Una deuda no bloquea automáticamente el movimiento del vehículo. Los pagos son manuales y el comprobante es interno, no una factura electrónica. La herramienta Python de cartera está documentada, pero su ejecución no se verificó.

Las imágenes se generaron localmente con PlantUML 1.2026.10 y Java 25. Las cuatro PNG están exportadas a 180 dpi para lectura e impresión; SVG conserva calidad vectorial. Se revisaron las imágenes en pantalla. No se generó ni abrió un proyecto `.mdj`: StarUML permanece pendiente. Para construirlo y revisarlo manualmente, consulta la [guía de StarUML](../guia-manual-staruml.md).
