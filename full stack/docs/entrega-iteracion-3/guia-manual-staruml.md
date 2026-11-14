# Guía de construcción manual en StarUML

Esta guía permite elaborar el archivo `.mdj` de la entrega sin confundirlo con las fuentes auxiliares PlantUML. StarUML no está instalado/detectable en este equipo y no existe un `.mdj`; por eso no se entrega aquí un proyecto nativo ni se afirma validación visual.

## Proyecto y organización

1. En StarUML, crear un proyecto UML nuevo y guardarlo como `AutosColombia-Iteracion3.mdj` en `diagramas/staruml/`.
2. Crear paquetes `Casos de uso`, `Secuencias` y `Componentes`. Usar los nombres de actores, casos, rutas y módulos que se indican abajo.
3. Guardar el proyecto tras cada diagrama. Las fuentes `.puml` de `diagramas/modelos-editables/` sirven como referencia auxiliar, no como sustituto del `.mdj`.

## Diagrama de casos de uso

- Límite del sistema: `Autos Colombia — Gestión de Parqueadero`.
- Actores: `Operador` y `Administrador`; modelar Administrador como especialización de Operador porque puede ejecutar sus tareas además de anular pagos.
- Casos: `Consultar obligaciones`, `Generar obligaciones de contrato`, `Registrar pago completo manual`, `Consultar historial de pagos`, `Consultar comprobante interno`, `Anular pago con motivo` y `Consultar resumen de deuda`.
- Asociar Operador con todos excepto anulación; asociar Administrador con anulación. Evitar `include`/`extend` si no representan una dependencia observada en los requisitos.
- Nota: transferencia es un registro manual y no confirma recepción bancaria; el comprobante es interno, no factura electrónica.

## Diagramas de secuencia

Crear una secuencia para pago/idempotencia y otra para el recorrido integrado.

Participantes del pago: `Operador`, `SPA/vistas`, `Cliente API fetch`, `Express /api/pagos`, `Middleware JWT/rol`, `mysql2/pool` y `MySQL`. Mostrar solicitud HTTP y respuesta de regreso por las mismas capas. Añadir fragmentos `alt` para pago nuevo (201), repetición igual (200), misma clave con datos distintos (409), error/rollback; representar transacción y bloqueo de obligación. En anulación, reflejar requisito de rol administrador y auditoría.

Para el recorrido integrado, ordenar los mensajes: crear cliente/vehículo/contrato; entrada y salida de estancia; generar obligaciones; registrar pago; consultar comprobante; anular y volver a pagar con UUID nuevo. Las respuestas SQL regresan al router; las respuestas HTTP vuelven al frontend. No dibujar conexión directa MySQL–navegador.

## Diagrama de componentes

- Nodo/browser: SPA JavaScript modular, enrutador, vistas, sesión `sessionStorage`, cliente `fetch` con Bearer.
- Nodo/API Node: Express, routers de auth, clientes/vehículos/novedades, celdas/estancias, contratos/obligaciones, pagos y usuarios/resumen; middleware JWT/roles; pool `mysql2` y transacciones.
- Nodo/base de datos: MySQL y tablas del dominio.
- Herramientas externas: cliente Java que consume HTTP API según documentación; herramienta Python de cartera documentada pero con ejecución pendiente.
- Mostrar HTTP JSON entre frontend/API y SQL entre pool/MySQL. El frontend también tiene catálogo local demostrativo, que no se persiste.

## Revisión y exportación

1. Confirmar nombres de rutas con `back end/src/app.js` y routers, y nombres de tablas con las migraciones.
2. Alinear cardinalidades/relaciones con el esquema; no inventar servicios o conectores no presentes.
3. Revisar legibilidad, direcciones de flechas, fragmentos de secuencia y que ninguna respuesta parezca salir directamente de MySQL hacia el actor.
4. Guardar `.mdj`; exportar cada diagrama a PNG o SVG y registrar fecha/herramienta en el índice de evidencias.
5. Reabrir el `.mdj` y las exportaciones para comprobar que cargan y que no hay elementos cortados. Esta lista queda pendiente hasta ejecutar StarUML.
