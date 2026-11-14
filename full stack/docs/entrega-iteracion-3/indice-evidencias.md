# Índice de evidencias — Iteración 3

Proyecto **S25 - Evidencia de Aprendizaje 3**, Diseño Sistema de Información –
Iteración 3. Presentación: **Parqueadero Cyber Automoviles Electronicos**.
Proyecto académico basado en el caso del parqueadero Autos Colombia.

Los artefactos de requisitos, historias, casos de uso, mockup, plan y trazabilidad
están presentes en esta carpeta y requieren los cotejos/validaciones indicados
abajo. Las fuentes PlantUML son auxiliares, no `.mdj` de StarUML. Los resultados
de pruebas de distintas fechas se mantienen separados; no se agregan en un
subtotal porque corresponden a suites y ejecuciones distintas.

| Evidencia | Ubicación | Estado |
|---|---|---|
| Requerimientos | [requerimientos-pagos.md](requerimientos-pagos.md) | Derivados de decisiones/alcance; cotejo con enunciado original pendiente. |
| Historias | [historias-usuario-pagos.md](historias-usuario-pagos.md) | Documento creado; revisión del equipo/docente pendiente. |
| Casos de uso | [especificaciones-casos-uso.md](especificaciones-casos-uso.md), [fuente PlantUML](diagramas/modelos-editables/casos-uso-iteracion-3.puml) | StarUML `.mdj` y validación pendientes. |
| Secuencias y componentes | [índice de fuentes UML](diagramas/README.md) | PlantUML auxiliar disponible; no hay `.mdj` ni exportaciones verificadas. |
| Mockup de pagos | [fuente HTML](mockups/fuentes/pagos.html), CSS y JS en la misma carpeta | Prototipo local independiente, no Figma ni productivo; revisión visual pendiente. |
| Plan y trazabilidad | [plan-pruebas-resumido.md](plan-pruebas-resumido.md), [matriz-trazabilidad.md](matriz-trazabilidad.md) | Fuentes técnicas/académicas en progreso; cotejo/actualización requerido. |
| Entrega y pendientes | [borrador-entrega.md](borrador-entrega.md), [pendientes-entrega.md](pendientes-entrega.md) | No es PDF final; portada aprobada y evidencias críticas pendientes. |
| GitHub | [guía manual](guia-publicacion-github.md) | Repositorio previsto; publicación pendiente de Brayan. |
| Datos/modelo | `back end/migrations/001_esquema_integrado.sql` y `002_secuencias_comprobante.sql` | Fuentes SQL existentes; no hay documento independiente de modelo de datos localizado. |
| API | `back end/src/routes/` y pruebas del backend | No se encontró un archivo autónomo de contrato API; no se afirma cobertura de todos los endpoints. |

## Resultados técnicos con alcance y fecha

- **Etapa 1:** [Diagnóstico de VS Code](../Informe%2014.md). Inspección de solo
  lectura del 2026-11-13; reporta, entre otros hallazgos, que no existía Git en
  la raíz, que Python no tenía intérprete utilizable y que no se encontró
  integración TypeScript. No volver a presentar ese informe como medición de
  estado de base de datos actual.
- **Etapa 3:** [Informe VS Code](../informe-vscode-etapa-3.md), 2026-11-14.
  Registra dos ejecuciones secuenciales del flujo frontend integrado, cada una
  1/1 aprobada y con limpieza del fixture propio. La suite de integración
  backend no se ejecutó por `resetDb()` global. No hubo navegador ni StarUML.
- **Java:** `reporte_recaudos` requiere Java 25. En la verificación posterior a
  la ampliación de tests se registraron 17/17 aprobadas; la prueba HTTP usa un
  servidor local de prueba, no la API real.
- **Python:** fuente y tests presentes; ejecución pendiente por falta de un
  intérprete local utilizable.

## Discrepancias y límites a conservar

- No sumar suites diferentes ni pasos HTTP como si fueran casos independientes.
- La idempotencia frontend conserva la clave en memoria; no garantiza
  recuperación tras recargar la página.
- La transferencia se registra manualmente y no confirma recepción bancaria.
- El comprobante es interno, no factura electrónica.
- El catálogo de vehículos es ilustrativo, no inventario comercial.
- El mockup no está conectado al API y no se validó visualmente en navegador.
- No se encontró un cierre técnico de Etapa 4. La entrega técnica de Brayan no
  declara terminada la continuación asignada a Isabella.
