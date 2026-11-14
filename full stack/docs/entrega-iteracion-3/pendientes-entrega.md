# Pendientes y estado de la rúbrica

Actualización para el cierre técnico de noviembre de 2026. Esto no es una
calificación ni certifica que los entregables académicos estén completos.

| Criterio | Estado | Evidencia actual | Pendiente |
|---|---|---|---|
| Requerimientos (15) | Parcial | [requerimientos-pagos.md](requerimientos-pagos.md) | Cotejar con el enunciado institucional original; validar en equipo. |
| Historias (10) | Parcial | [historias-usuario-pagos.md](historias-usuario-pagos.md) | Revisión de Isabella/equipo y criterios con docente. |
| Mockups (10) | Fuente creada; validación pendiente | [fuente HTML del mockup](mockups/fuentes/pagos.html) | Revisión visual en navegador y evidencia requerida; no es Figma. |
| Plan de pruebas (15) | Parcial | [plan-pruebas-resumido.md](plan-pruebas-resumido.md) | La suite de integración backend requiere estrategia segura: su setup limpia globalmente `_test`. |
| Casos de uso (10) | Especificación y fuente auxiliar | [especificaciones-casos-uso.md](especificaciones-casos-uso.md) y PlantUML | Crear/revisar `.mdj` en StarUML; validar/exportar. |
| Secuencia (15) | Fuentes PlantUML auxiliares | [índice UML](diagramas/README.md) | Convertir/revisar en StarUML y guardar/exportar `.mdj`. |
| Componentes (10) | Fuente PlantUML auxiliar | [índice UML](diagramas/README.md) | Cotejar componentes/interfaces y validar `.mdj`. |
| GitHub (15) | Pendiente | [guía manual de publicación](guia-publicacion-github.md) | Brayan debe revisar, crear/publicar y comprobar el repositorio; no existe Git local verificado. |

No se asignan puntos ni se garantiza calificación.

## Estado de integración y herramientas

- El informe de Etapa 3 registra dos ejecuciones secuenciales del flujo frontend,
  con base `_test` comprobada y limpieza acotada al fixture de cada corrida.
  No se ejecutó esa prueba en este cierre documental.
- La integración backend completa no se ejecutó en Etapa 3: `resetDb()` borra
  filas de todas las tablas de `_test`. No ejecutar hasta contar con una base
  descartable y aislamiento aprobado.
- Java 25: herramienta de pagos con 17 pruebas aprobadas en la verificación
  anterior; la prueba HTTP usa servidor local de prueba, no API real.
- Python no se ejecutó por falta de intérprete utilizable en el diagnóstico.
- No se encontraron fuentes `.ts`, `tsconfig`, proyecto StarUML `.mdj` ni
  exportaciones UML. PlantUML es fuente auxiliar, no sustituto de StarUML.
- No se validó visualmente el frontend en navegador en Etapa 3.
- El estado actual de MySQL, cuenta efectiva y administrador principal no se
  volvió a comprobar en este cierre; informes anteriores mencionan `root` y
  administrador pendiente. Brayan debe verificar localmente.
- Confirmar con el docente la discrepancia entre actividad EA3 y la
  nomenclatura institucional `Apellido_Nombre_EA1`.
- Recuperar portada Word aprobada e incorporar evidencias críticas antes de
  producir el PDF académico. README, mockup y guía StarUML no los sustituyen.
