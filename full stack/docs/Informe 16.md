# Entrega técnica final — Brayan

**Actividad:** S25 - Evidencia de Aprendizaje 3. Diseño Sistema de Información – Iteración 3  
**Presentación:** Parqueadero Cyber Automoviles Electronicos  
**Caso académico:** implementación basada en el caso Autos Colombia  
**Fecha:** noviembre de 2026

Esta entrega documenta el estado técnico observado y no declara completados los pendientes académicos o de Isabella.

## Alcance técnico de esta etapa

- Revisión acotada de los README, evidencia Etapa 1/3, scripts, lockfiles, migraciones, fuentes UML, integración de pruebas y estado Git.
- Actualización del README raíz con descripción, estructura real, comandos, tecnologías, roles, límites y enlaces a evidencia existente.
- Actualización de advertencias obsoletas sobre la suite de integración backend, que hace limpieza global de `_test`.
- Ajustes puntuales a `.gitignore`, la guía de publicación, el índice UML, el índice de evidencia, pendientes y READMEs para reflejar el estado reportado sin borrar archivos.
- No se modificó código de backend/frontend, esquema, datos ni dependencias. Java 25/Jackson no se cambiaron nuevamente en esta etapa.

### Archivos actualizados o creados en esta etapa

- `README.md` y `.gitignore`.
- `back end/README.md`, `back end/.env.example`, `front end/README.md` y `back end/tools/java/reporte_recaudos/README.md`.
- `full stack/docs/Informe 10.md`, `Informe 13.md` y `Informe 14.md` (rutas absolutas retiradas; se retiraron del informe histórico credenciales ficticias de usuarios semilla de pruebas).
- `full stack/docs/entrega-iteracion-3/indice-evidencias.md`, `pendientes-entrega.md` y `guia-publicacion-github.md`.
- `full stack/docs/entrega-iteracion-3/diagramas/README.md` (nuevo índice de fuentes UML).
- `full stack/docs/entrega-iteracion-3/borrador-entrega.md`.
- `full stack/docs/entrega-tecnica-final-brayan.md` (este documento).

## Estado por componente

### Backend y MySQL

Backend: API JavaScript/Node.js con Express y MySQL, autenticación JWT y permisos por rol. La API actúa como intermediaria entre navegador y base de datos. Pagos usan transacciones e idempotencia; la anulación es auditada y no representa devolución bancaria.

Los informes previos reportan migraciones en principal y `_test`, además de ejecuciones históricas de pruebas. MySQL no se consultó durante este cierre. La suite de integración backend no se ejecutó en Etapa 3 porque su preparación invoca `resetDb()` y elimina todas las tablas de `_test`; el README ahora advierte que no debe correrse hasta aislarla. Confirmar localmente si se sigue usando `root` y si falta crear el administrador de la base principal.

### Frontend

SPA modular con Vite, HTML, JavaScript y CSS. Hay áreas públicas, login y vistas operativas; el catálogo es local e ilustrativo. El flujo integrado frontend tiene dos corridas aprobadas registradas en el informe de Etapa 3 y limpia sus fixtures UUID de manera acotada. No se repitió en esta etapa documental. No se inspeccionó la interfaz en navegador, ni se afirma validación visual o WCAG.

### Java, Python y TypeScript

- **Java:** herramienta auxiliar `reporte_recaudos`, `maven.compiler.release=25`. La verificación previa registró compilación/empaquetado y **17/17 pruebas aprobadas** en Java 25. La prueba HTTP agregada usa un servidor local de prueba; no consulta la API real. No se cambió runtime/dependencias en esta etapa.
- **Python:** la herramienta `reporte_cartera` y su suite existen, pero no se ejecutaron por falta de intérprete utilizable en el diagnóstico local.
- **TypeScript:** no se encontraron fuentes `.ts`, `tsconfig` ni consumidor real; no está integrado ni se documenta como tecnología utilizada.

## Evidencia y enlaces del README raíz

- Acceso local de frontend: [Abrir interfaz web — ejecución local](http://localhost:5173/). Requiere iniciar servicios; no es una publicación web.
- Fuentes UML: [Fuentes UML y guía de StarUML](entrega-iteracion-3/diagramas/README.md). Hay fuentes PlantUML auxiliares; `.mdj`, exportaciones y validación StarUML siguen pendientes.
- El README raíz enlaza también requerimientos, historias, casos de uso, mockup, plan resumido, matriz, migraciones, READMEs e informes existentes. No se encontró un contrato API independiente, un modelo de datos documental separado, ni cierre técnico de Etapa 4. Las rutas y migraciones existentes son fuentes de implementación; no sustituyen por sí mismas esos artefactos académicos.

## Verificaciones registradas

| Suite/verificación | Estado conocido | Alcance |
|---|---|---|
| Java, JDK 25 | 17 aprobadas, 0 fallidas, 0 omitidas | Incluye servidor HTTP local de prueba, no API real; verificación previa al cierre documental. |
| Flujo frontend integrado, Etapa 3 | 1/1 aprobado en cada una de dos corridas secuenciales | Usa base exacta `_test`, pool verificado y limpieza limitada a fixture. No se repitió en esta etapa. |
| Integración backend | No ejecutada en Etapa 3 | Bloqueada hasta remover el borrado global de `resetDb()` del alcance de la suite. |
| Pruebas unitarias backend/frontend | Resultados históricos citados en informes anteriores | No reejecutadas en este cierre documental. |
| Python | No ejecutado | No había intérprete utilizable en el equipo diagnosticado. |
| MySQL | No consultado en este cierre | Estado de migraciones, `DB_USER` y cuenta administradora deben confirmarse localmente. |
| Navegador / StarUML | No revisados aquí | No hay capturas ni proyecto `.mdj` verificado. |

No se suman pasos HTTP de un flujo como si fueran pruebas independientes y no se reporta cobertura porcentual.

## Pendientes manuales de Brayan

1. Revisar visualmente el README y enlaces; confirmar las variables de entorno localmente sin exponer secretos.
2. Confirmar estado real de MySQL, cuenta de aplicación limitada a DML y administrador inicial; no usar `root` en la operación normal si sigue configurado.
3. Antes de ejecutar la suite de integración backend, aislar `resetDb()` en una base descartable o reemplazarlo por fixtures propios identificados y limpieza acotada.
4. Revisar `.gitignore`, archivos uno por uno, secretos y datos personales antes de iniciar un repositorio. La carpeta local no es un repositorio Git.
5. Crear manualmente el repositorio previsto solo tras aprobación, revisar lo que se stagea y publicar mediante el flujo autorizado; no usar `git add -A` sin inspección.
6. Completar/validar el modelo `.mdj` y exportaciones en StarUML según la guía; no presentar PlantUML como sustituto.
7. Confirmar con el docente la discrepancia entre la actividad EA3 y la nomenclatura institucional `Apellido_Nombre_EA1`.
8. Incorporar portada Word aprobada y evidencias críticas antes de producir el PDF académico final.

**Estado GitHub:** repositorio previsto; publicación pendiente de Brayan. URL propuesta, aún no comprobada: <https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres>. No se creó remoto, commit, rama o push; no se atribuyen puntos de GitHub.

## Continuación prevista de Isabella

Continuar el rol asignado de análisis funcional y UX/UI: cotejar historias, revisar y validar mockup/interfaz en navegador, documentar observaciones de usabilidad/responsive/teclado y aportar evidencias que pida la rúbrica. Su parte no se declara finalizada por esta entrega técnica.

## Pendientes académicos

Los ocho criterios y su estado se resumen en el README. Requerimientos e historias necesitan cotejo/validación; mockup espera revisión visual; plan de pruebas mantiene el bloqueo de integración backend; los tres artefactos UML requieren `.mdj`/validación; GitHub está pendiente. No hay puntajes asignados ni garantía de calificación. El README no reemplaza PDF, Word, Figma ni StarUML.

## Publicación prevista — instrucciones no ejecutadas

Nombre previsto: `Disenio-de-sistema-de-informacion-iteracion-tres`. URL esperada: <https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres>. La [guía manual de GitHub](entrega-iteracion-3/guia-publicacion-github.md) prepara los pasos de revisión; no se ejecutaron.

## Limpieza y límites

No se eliminaron archivos. Se conservaron código, tests, migraciones, seeds ficticios, lockfiles, informes, mockup, fuentes PlantUML, guía y copias de procedencia no confirmada. La carpeta `.backup_polish/` se conserva porque no se determinó con certeza la procedencia/valor de su contenido. No hubo borrado de bases, `npm audit fix`, instalación de herramientas, contenedores, despliegue, cambios de arquitectura, creación de commits ni publicación.

Las credenciales retiradas del informe eran de usuarios semilla ficticios de
pruebas, no se verificó que correspondan a cuentas reales ni a la base
principal. Si se reutilizaron o estuvieron expuestas en un entorno accesible,
Brayan debe revisar y rotarlas desde el entorno local; quitar el texto no revoca
una posible exposición previa.
