# Informe VS Code — Etapa 3

**Proyecto:** Diseño de sistema de información, iteración tres  
**Fecha:** 14 de noviembre de 2026  
**Alcance:** revisión de cambios, aislamiento seguro del flujo frontend, ejecución secuencial dos veces, actualización documental y revisión de herramientas disponibles.

## Resultado

Se revisaron los cambios previos y el estado del workspace. No existe `.git`, por lo que no es posible contrastar cambios frente a una rama o commit. No se hicieron cambios al esquema ni al código productivo.

El flujo frontend de integración se ajustó para crear un UUID por ejecución y marcadores únicos de cliente, vehículo y celda. El helper verifica nombre exacto de base y `SELECT DATABASE()` del pool que usa la API. Después del flujo, cierra el servicio y elimina el fixture identificado en una transacción y en orden compatible con las claves foráneas. La operación no llama a `resetDb`, no elimina filas sin marcador, usuarios semilla ni secuencias de comprobantes.

Se ejecutó `front end/test/api-integration-flow.test.js` dos veces en serie. La primera y la segunda finalizaron con 1/1 aprobado y cero entidades raíz residuales de sus respectivos fixtures. Antes de iniciar se confirmó `TEST_MODE=1`, coincidencia exacta de `DB_NAME` con `DB_TEST_NOMBRE`, ausencia de proceso Node activo y ausencia de listener en el puerto 3000. El helper verificó además la base efectiva del pool.

La suite `back end/test/integration/api.test.js` no se ejecutó: su preparación llama a `resetDb()`, que elimina datos de todas las tablas de la base de pruebas con `FOREIGN_KEY_CHECKS=0`. Esa limpieza global excede el alcance seguro de esta etapa. Tampoco se ejecutaron suites adicionales.

## Artefactos actualizados

- `back end/test/integration/helpers.js`: marcadores deterministas a partir del UUID, guardia del pool y limpieza transaccional acotada al fixture.
- `front end/test/api-integration-flow.test.js`: datos únicos, verificación del pool, limpieza en `t.after` y comprobación del formato de comprobante.
- `diagramas/modelos-editables/secuencia-integrada-tres-iteraciones.puml`: respuestas del flujo vuelven desde MySQL al router, API y frontend.
- `full stack/docs/entrega-iteracion-3/guia-manual-staruml.md`: pasos concretos para crear y revisar el proyecto nativo `.mdj`.
- Índice de evidencias, plan resumido, matriz de trazabilidad y pendientes: resultados de etapa y límites documentados.

## Herramientas y límites

- No hay navegador disponible en las herramientas de esta sesión; no se inspeccionó visualmente el mockup y no se generaron capturas. El mockup se mantiene estático y no conectado al API.
- StarUML no está instalado/detectable y no hay archivo `.mdj`. No se instaló software ni se generó un falso archivo nativo. Las fuentes PlantUML son auxiliares; la validación visual StarUML sigue pendiente.
- No hay repositorio Git local; no se puede comprobar historial ni cambios ajenos.
- Los resultados históricos de otras suites se conservan diferenciados; no se presentan como ejecuciones nuevas.

## Continuación sugerida

1. Abrir/crear el proyecto en StarUML y seguir `entrega-iteracion-3/guia-manual-staruml.md`; guardar `.mdj` y exportar los diagramas.
2. Revisar el mockup en un navegador y adjuntar capturas si la rúbrica lo pide.
3. Revisar con Brayan/equipo los casos backend restantes y definir una estrategia aislada antes de ejecutar la suite cuyo setup contiene `resetDb()`.

**Etapa 3 terminada.** La siguiente instrucción de la secuencia queda pendiente del usuario.
