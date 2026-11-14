# S25 - Evidencia de Aprendizaje 3
## Diseño Sistema de Información – Iteración 3

**Nombre de presentación:** Parqueadero Cyber Automoviles Electronicos  
**Caso académico:** implementación basada en el caso del parqueadero Autos Colombia.

| Actividad principal | Acceso |
|---|---|
| A. Abrir interfaz web | [Abrir interfaz web — ejecución local](http://localhost:5173/) |
| B. Consultar diagramas y documentación UML | [Fuentes UML y guía de StarUML](full%20stack/docs/entrega-iteracion-3/diagramas/README.md) |

La carpeta de diagramas reúne cuatro vistas complementarias: permisos de pago, recorrido seguro de una mensualidad, operación integrada de las tres iteraciones y arquitectura de componentes. Consulta allí el estado de cada fuente y los pasos para llevarla a StarUML.

El acceso web requiere iniciar localmente frontend, backend y los servicios que
use la configuración. No es una página publicada en Internet: solo responde
desde el equipo/red donde se ejecuta. Vite solicita el puerto `5173`, pero
`strictPort` no está configurado; si está ocupado puede elegir otro. Usa la URL
que muestre el terminal de Vite.

## Datos académicos

| Campo | Información |
|---|---|
| Institución | Institución Universitaria Digital de Antioquia |
| Programa | Tecnología en Desarrollo de Software |
| Asignatura | Ingeniería de Software |
| Estudiantes/autores | Brayan Alejandro Durango Urrea; Isabella Perdomo Hernandez |
| Profesor | Esteban Montoya Molina |
| Grupo | PREICA2602B020081 |
| Entrega | Noviembre de 2026 |
| Ubicación | Medellín, Antioquia, Colombia |

### Responsabilidades

| Integrante | Responsabilidad asignada | Estado de cierre |
|---|---|---|
| Brayan Alejandro Durango Urrea | Líder Técnico / Full Stack & Backend: arquitectura, modelo de datos, MySQL, lógica de negocio, API, integración, seguridad técnica y pruebas. | Cierre técnico y preparación documental descritos en esta entrega; quedan acciones locales y de publicación pendientes. |
| Isabella Perdomo Hernandez | Analista funcional / UX-UI & Frontend: análisis funcional, revisión de historias, diseño y validación de interfaces, mockups, usabilidad y documentación de usuario. | Continuación prevista después de esta entrega técnica; no se declara finalizada su parte ni una revisión visual no realizada. |

Las responsabilidades identifican el trabajo asignado, no prueban autoría
individual de cada archivo ni sustituyen el historial de contribuciones. No hay
repositorio Git local para comprobar commits o atribuciones.

## Descripción

Aplicación académica para administrar un parqueadero por mensualidad: clientes,
vehículos, celdas, entradas y salidas, contratos, obligaciones y pagos. Registra
historial y genera un comprobante interno; integra una SPA web, una API y MySQL.
La iteración 3 se centra en obligaciones y pagos. El catálogo de vehículos es
ilustrativo, no un inventario comercial. El comprobante no es factura
electrónica y no existe procesamiento ni confirmación bancaria real: los pagos
se registran manualmente.

## Estado comprobado y límites

Las cifras siguientes corresponden a ejecuciones identificadas en informes o
en esta sesión; no son una certificación integral del sistema.

| Área | Estado y evidencia |
|---|---|
| Java `reporte_recaudos` | JDK 25 y Maven: compilación, empaquetado y ejecución de ayuda verificados en el cierre previo. La suite pasó **17/17** en Java 25; tres pruebas añadidas solo modificaron tests. La prueba HTTP usa un servidor local de prueba, no la API real. |
| Flujo frontend integrado | Informe de Etapa 3 registra dos ejecuciones secuenciales, ambas 1/1, con guardas de base `_test` y limpieza limitada a fixtures propios. Esto no es una revisión visual del sitio. |
| Pruebas de integración backend | No ejecutadas en Etapa 3: el setup de la suite llama a `resetDb()` y elimina datos de todas las tablas de la base de pruebas. No ejecutar hasta definir aislamiento seguro para la suite completa. |
| Unitarias backend y frontend | Hay resultados históricos en informes anteriores; no se reejecutaron para este cierre documental. Consulta cada README antes de interpretar esas cifras como actuales. |
| Python | La herramienta y sus pruebas están en el árbol, pero no se ejecutaron: el diagnóstico de Etapa 1 no encontró un intérprete Python utilizable. |
| Interfaz visual | No se validó en navegador durante los informes de Etapa 3. La lista de revisión manual está en la entrega técnica final. |
| StarUML | Hay fuentes PlantUML auxiliares y guía manual; no se encontró proyecto `.mdj` ni exportaciones verificadas. |
| Estado de base de datos | Los informes anteriores registran migraciones en ambas bases. No se conectó ni inspeccionó MySQL durante este cierre; confirma localmente el estado antes de usarlo. |

## Tabla de áreas web

Las rutas de pantalla describen la navegación implementada en frontend. La
integración se resume por módulo; no se afirma que cada operación o endpoint
haya sido validado en navegador.

| Área/Pantalla | Función | Acceso | Integración |
|---|---|---|---|
| Inicio público | Presentación del parqueadero | Público | Contenido frontend |
| Servicios | Información del servicio por mensualidad | Público | Contenido frontend; sin operación de cobro |
| Catálogo ilustrativo | Ejemplos conceptuales de vehículos | Público | Datos locales de demostración, sin MySQL |
| Contacto | Muestra datos centralizados/configurados | Público | Configuración local en `front end/src/data/config-sedes.js`; confirmar datos antes de uso real |
| Login | Inicio de sesión | Público, autenticación requerida para continuar | API de autenticación |
| Dashboard | Resumen operativo | Cuenta autenticada | Consultas a módulos de API |
| Clientes | Consulta y gestión de clientes | Cuenta autenticada | API de clientes |
| Vehículos y novedades | Registro de vehículos y novedades | Cuenta autenticada | API de vehículos/novedades |
| Celdas | Consulta y gestión de celdas | Cuenta autenticada; acciones según rol | API de celdas |
| Entradas y salidas | Registro de estancias | Cuenta autenticada | API de estancias |
| Contratos | Contratos de mensualidad y generación explícita de obligaciones | Cuenta autenticada | API de contratos/obligaciones |
| Obligaciones y pagos | Consulta de obligaciones, pagos, historial, comprobantes y anulación | Cuenta autenticada; anulación administrativa según rol | API de obligaciones/pagos |
| Usuarios del sistema | Gestión de cuentas y roles | Según permisos; administración restringida | API de usuarios |

No se declara validación visual, de accesibilidad completa ni extremo a extremo
de todas estas pantallas en el navegador.

## Tecnologías y lenguajes

| Tecnología | Ubicación | Uso real | Estado de verificación |
|---|---|---|---|
| JavaScript | `back end/src/`, `front end/src/` y tests | API, SPA, scripts y pruebas | Código revisado; las suites tienen estados distintos indicados arriba. |
| Java | `back end/tools/java/reporte_recaudos/` | Utilidad CLI de reportes de pagos | `pom.xml` requiere Java 25; 17 pruebas pasaron en Java 25 en la verificación previa. No es requisito para Node ni para el frontend. |
| Python | `back end/tools/python/reporte_cartera/` | CLI de cartera con biblioteca estándar | Código y pruebas existentes; ejecución pendiente por falta de intérprete disponible en el diagnóstico local. |
| HTML | `front end/index.html`; mockup bajo `full stack/docs/entrega-iteracion-3/` | Marcado de la SPA y fuente del mockup | Archivos presentes; mockup no inspeccionado visualmente en navegador. |
| CSS | `front end/src/styles/`; fuentes del mockup | Estilos responsivos y tema cyber | Código presente; revisión visual pendiente. |
| TypeScript | No encontrado | No se observó fuente `.ts`, `tsconfig` ni consumidor real | No se presenta como tecnología utilizada; integración no existe en el estado inspeccionado. |
| SQL / MySQL | `back end/migrations/`, `back end/seeds/` | Esquema, restricciones, datos ficticios de prueba y persistencia | Archivos revisados; estado actual del servidor no fue consultado en este cierre. |
| Node.js | `back end/`, pruebas Node | Runtime del backend; el paquete declara Node.js `>=20` | Requisito leído de `package.json`; no se ejecutaron suites Node en este cierre. |
| Express | `back end/src/` | API HTTP y middleware | Dependencia y rutas presentes; no implica que todos los endpoints estén verificados. |
| Vite | `front end/` | Servidor de desarrollo y compilación frontend | Puerto solicitado `5173`; `strictPort` ausente. Usa el puerto que anuncie Vite. |
| Maven | Herramienta Java | Compilación, pruebas y empaquetado de `reporte_recaudos` | JDK 25 y Maven 3.9+ requeridos según documentación/build; Maven 3.9.16 fue detectado en diagnóstico anterior. |

JavaScript, Java y Python son lenguajes de programación; HTML es marcado,
CSS es estilo y SQL se usa para consultar/definir datos. Node.js, Express, Vite,
MySQL y Maven son runtime/framework, herramienta de desarrollo, base de datos o
sistema de build, respectivamente.

## Estructura real resumida

```text
.
├── back end/
│   ├── migrations/                 # esquema y secuencia de comprobantes
│   ├── seeds/                      # datos ficticios controlados
│   ├── src/                        # API Express, rutas, middleware, utilidades
│   ├── test/                       # unitarias e integración Node
│   └── tools/
│       ├── java/reporte_recaudos/  # CLI Java de pagos
│       └── python/reporte_cartera/ # CLI Python de obligaciones
├── front end/
│   ├── src/                        # vistas, servicios, componentes y estilos SPA
│   └── test/                       # pruebas unitarias y flujo integrado
└── full stack/
    └── docs/
        ├── Informe 1.md … Informe 14.md
        ├── informe-vscode-etapa-3.md
        └── entrega-iteracion-3/    # requisitos, historias, casos, mockup,
                                    # PlantUML, guías, plan y pendientes
```

`full stack/` contiene documentación y evidencia compartida; no es una tercera
aplicación duplicada.

## Instalación, configuración y ejecución

Para quien clone el repositorio cuando se publique: instalar Node.js `>=20`,
MySQL `8.0.16+`, JDK `25` y Maven `3.9+` solo si usará la utilidad Java. Crear
configuración local desde los `.env.example`, completar credenciales en el
equipo propio y crear/migrar las bases según el README del backend. Los
servicios deben estar disponibles localmente; no hay despliegue público.

Los comandos usan `npm ci` para respetar los lockfiles. No reinstales
dependencias en cada arranque.

### Backend y MySQL — desde `back end/`

```bash
npm ci
```

Copia `.env.example` a `.env` y completa localmente las variables requeridas
(`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` y
`CORS_ORIGIN`, entre otras opcionales). En PowerShell la copia puede hacerse
con `Copy-Item .env.example .env`. No compartas `.env`.

Las bases previstas son `Disenio_de_sistema_de_informacion_iteracion_tres`
(principal) y `Disenio_de_sistema_de_informacion_iteracion_tres_test` (pruebas).
Las migraciones 001 y 002 están en `back end/migrations/`; requieren permisos
MySQL adecuados y revisión del README backend. La aplicación no debe conectarse
con privilegios DDL. Crear el administrador inicial de forma interactiva,
cuando el responsable local lo autorice:

```bash
npm run create-admin
npm start
```

En desarrollo: `npm run dev`. El navegador se comunica con la API HTTP; la API
valida identidad/permisos y es la única capa de esta aplicación que accede a
MySQL. JWT Bearer protege rutas. Las operaciones de pago usan transacciones e
idempotencia para evitar duplicados; la suite de integración completa tiene un
setup que limpia globalmente la base `_test`, por lo que queda bloqueada hasta
que exista aislamiento seguro. No ejecutes `npm run test:integration` por ahora.

Pruebas backend no destructivas:

```bash
npm run test:unit
```

### Frontend — desde `front end/`

```bash
npm ci
npm run dev
npm run build
npm run test:unit
```

Para usar el flujo integrado, configura las variables locales de backend y
pruebas y ejecuta desde `front end/`:

```bash
node --env-file="../back end/.env" --env-file="../back end/.env.test" --test test/api-integration-flow.test.js
```

El flujo verifica la base exacta `_test` y elimina solo los fixtures
identificados de esa ejecución. No lo ejecutes mientras otra persona use esa
base. Los resultados de Etapa 3 registran dos corridas aprobadas; no se
repitieron en este cierre documental.

### Herramienta Java — desde `back end/tools/java/reporte_recaudos/`

```bash
mvn test
mvn -DskipTests package
java -jar target/reporte-recaudos.jar --help
```

Requiere JDK 25; los importes se manejan con `BigDecimal`. Para consultar la API
se requiere backend activo y credencial mediante entorno/consola; nunca la
incluyas como argumento visible. La suite Java tuvo 17/17 aprobadas en la
verificación previa del cierre, incluyendo una prueba HTTP con servidor local
de prueba, no con la API real.

### Herramienta Python — desde `back end/tools/python/reporte_cartera/`

```bash
python -m unittest discover -s tests -v
python reporte_cartera.py --help
```

Requiere Python 3.10+ y no requiere paquetes externos. No fue posible ejecutar
estos comandos en el entorno diagnosticado porque no se encontró intérprete
Python utilizable.

No hay comandos TypeScript: no se encontró integración TypeScript real.

## Persistencia y pagos

MySQL almacena usuarios, clientes, vehículos, celdas, estancias, contratos,
obligaciones, pagos, auditoría y secuencia de comprobantes. Los scripts de
migración aplican el esquema en orden; los seeds son ficticios y destinados a
pruebas. Configura entornos por variables locales y mantiene la base principal
separada de la de pruebas. La API Express es intermediaria entre navegador y
MySQL: valida autenticación JWT y permisos, y ejecuta transacciones. El registro
de pagos es manual; la transferencia no tiene confirmación bancaria. La
idempotencia usa clave por intento y las correcciones se registran mediante
anulación auditada, no borrado/devolución.

La documentación técnica previa señala que en el entorno local se usaba `root`
y faltaba crear el administrador de la base principal; el usuario/estado actual
no se revalidó aquí. Brayan debe confirmar si sigue pendiente sustituir `root`
por una cuenta MySQL limitada a DML y completar el administrador.

## Diagramas, fuentes y documentación

- [Fuentes UML y guía de StarUML](full%20stack/docs/entrega-iteracion-3/diagramas/README.md) — índice de fuentes; `.mdj` y validación/exportación StarUML siguen pendientes.
- [Requerimientos de pagos](full%20stack/docs/entrega-iteracion-3/requerimientos-pagos.md) y [historias de usuario](full%20stack/docs/entrega-iteracion-3/historias-usuario-pagos.md) — derivados del alcance; validación académica pendiente.
- [Especificaciones de casos de uso](full%20stack/docs/entrega-iteracion-3/especificaciones-casos-uso.md).
- [Mockup local de pagos](full%20stack/docs/entrega-iteracion-3/mockups/fuentes/pagos.html) y [guía de trabajo manual](full%20stack/docs/entrega-iteracion-3/guia-manual-staruml.md).
- [Plan de pruebas resumido](full%20stack/docs/entrega-iteracion-3/plan-pruebas-resumido.md) y [matriz de trazabilidad](full%20stack/docs/entrega-iteracion-3/matriz-trazabilidad.md).
- [Migración SQL principal](back%20end/migrations/001_esquema_integrado.sql) y [secuencias de comprobante](back%20end/migrations/002_secuencias_comprobante.sql) — fuente actual del modelo relacional; no hay un documento separado de modelo de datos localizado.
- [README del backend](back%20end/README.md), [README del frontend](front%20end/README.md), [README Java](back%20end/tools/java/reporte_recaudos/README.md) y [README Python](back%20end/tools/python/reporte_cartera/README.md).
- [Diagnóstico de Etapa 1](full%20stack/docs/Informe%2014.md), [informe de Etapa 3](full%20stack/docs/informe-vscode-etapa-3.md), [índice de evidencias](full%20stack/docs/entrega-iteracion-3/indice-evidencias.md), [pendientes de entrega](full%20stack/docs/entrega-iteracion-3/pendientes-entrega.md) y [borrador académico](full%20stack/docs/entrega-iteracion-3/borrador-entrega.md).
- [Entrega técnica final de Brayan](full%20stack/docs/entrega-tecnica-final-brayan.md) — estado técnico y pendientes, no sustituye la entrega académica.
- [Guía de publicación GitHub](full%20stack/docs/entrega-iteracion-3/guia-publicacion-github.md) — instrucciones para Brayan; no se ejecutaron.
- No se encontró un archivo autónomo de contrato API ni un cierre técnico de Etapa 4. Las rutas implementadas se consultan en `back end/src/routes/`; el código no sustituye un contrato académico formal.

## Rúbrica y entregables académicos

| Criterio | Estado honesto al cierre |
|---|---|
| Requerimientos (15) | Parcial: existe documento de pagos derivado; falta cotejar con enunciado institucional original. |
| Historias (10) | Parcial: historias documentadas; validación del equipo/docente pendiente. |
| Mockups (10) | Fuente HTML/CSS/JS disponible; revisión de Isabella/docente y validación visual pendientes. No es archivo Figma. |
| Plan de pruebas (15) | Documentado técnicamente, con resultados históricos separados; suite backend de integración bloqueada por limpieza global. |
| Casos de uso (10) | Especificación y PlantUML auxiliar presentes; StarUML `.mdj` y validación pendientes. |
| Secuencia integrada (15) | PlantUML auxiliar presente; conversión/validación `.mdj` pendientes. |
| Componentes (10) | PlantUML auxiliar presente; cotejo y validación `.mdj` pendientes. |
| GitHub (15) | Pendiente: no existe repositorio local/remoto verificado ni publicación. No se atribuyen puntos. |

El README y esta documentación técnica no sustituyen el PDF académico. No se
generará el PDF final mientras falten la portada Word aprobada y evidencias
críticas. La nomenclatura institucional recibida es `Apellido_Nombre_EA1`;
confirmar con docente la discrepancia con esta actividad EA3 antes de nombrar el
archivo final.

## Identidad visual y revisión manual

Se conserva el estilo existente negro, violeta neón, rojo neón, grises,
tarjetas, ilustraciones automotrices y adaptación móvil. No se hizo un nuevo
rediseño. Para el cierre visual, Brayan e Isabella deben revisar en navegador:
desktop y móvil; rutas públicas y login; permisos por rol; foco/teclado;
contraste y estados no comunicados solo por color; overflow/responsive;
contactos configurados y contenido de catálogo ilustrativo. No se dispone de
capturas ni validación visual en navegador en este cierre.

## Estado del repositorio y publicación prevista

**Repositorio previsto; publicación pendiente de Brayan.** El estado esperado
es:

- Nombre: `Disenio-de-sistema-de-informacion-iteracion-tres`
- URL prevista: <https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres>
- Clonación prevista: <https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres.git>

Estas direcciones son propuestas, no una publicación comprobada. La raíz
actual no contiene `.git`; por tanto no hay rama, commits, remoto ni historial
que revisar. No se creó repositorio, commit, remoto o push, y no se declara
cubierto el criterio académico de GitHub. Revisar `.gitignore` y seguir la guía
manual antes de publicar; nunca subir archivos `.env` ni datos personales de
pruebas.
