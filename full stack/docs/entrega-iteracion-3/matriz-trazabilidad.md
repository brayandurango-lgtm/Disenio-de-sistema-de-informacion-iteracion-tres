# Trazabilidad académica — gestión de pagos

La fuente técnica anterior se conserva en full stack/docs/matriz-trazabilidad.md. Esta matriz cruza entregables académicos.

Alias compactos de filas: RF1..RF12 = RF-PAG-001..012; RNF1..RNF14 = RNF-PAG-001..014; HU1..HU9 = HU-PAG-001..009; UC1..UC5 = UC-PAG-01..05; TP1..TP14 = TP-PAG-01..14.

| RF/RNF | HU | UC | Mockup | Diagrama | Endpoint | Prueba/evidencia | Estado |
|---|---|---|---|---|---|---|---|
| RF1/2/4, RNF1/7/9/10 | HU1 | UC1 | listado/filtros | integrada | GET obligaciones y :id | TP1/2, código leído | Parcial |
| RF3, RNF3/8/14 | HU2 | UC1 | contratos/obligaciones | integrada | POST contratos/:id/obligaciones/generar | TP3 histórico | Parcial |
| RF5/11/12, RNF1/3/6/7/8/9 | HU3 | UC2 | confirmar/éxito | pago | POST pagos | TP5/6, histórico/sesión previa | Parcial |
| RF6, RNF3/4/5/14 | HU4/5 | UC2 | incierto/denegado | pago | POST pagos | TP7/8, unit previo e integración histórica | Parcial; recarga pendiente |
| RF7, RNF1/9/10 | HU6 | UC3 | historial/recibo | integrada | GET pagos y comprobante | TP9 histórico | Parcial; browser pendiente |
| RF8/11/12, RNF1/3/8 | HU7 | UC4 | anulación/permiso | integrada | POST pagos/:id/anular | TP10 histórico | Parcial |
| RF9, RNF3/5/8 | HU8 | UC4 | pendiente postanulación | integrada | POST pagos | TP11 histórico | Parcial |
| RF10, RNF1/6/7 | HU9 | UC5 | resumen | integrada | GET resumen/cliente/:id | TP12 histórico | Parcial |
| RNF1–14 | HU1–9 | UC1–5 | HTML/CSS local | tres fuentes puml | módulos API | TP13/14 | Parcial; StarUML, aislamiento y accesibilidad pendientes |

IDs nuevos: RF-PAG-001..012, RNF-PAG-001..014, HU-PAG-001..009, UC-PAG-01..05, TP-PAG-01..14. No se encontraron identificadores previos que deban preservarse.

Actualización Etapa 3: TP-PAG-05/07/09/10/11/12 cubiertos en el flujo integrado frontend aprobado dos veces. La ejecución no sustituye los casos independientes de error ni concurrencia del plan; el backend global no se corrió por su limpieza destructiva. TP-PAG-14 sigue sin inspección en navegador.
