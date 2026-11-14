# Diagnóstico de VS Code — Etapa 1

**Proyecto:** S25 — Evidencia de Aprendizaje 3, Diseño Sistema de Información — Iteración 3  
**Identidad de presentación solicitada:** Parqueadero Cyber Automoviles Electronicos  
**Relación académica:** Proyecto académico basado en el caso del parqueadero Autos Colombia.  
**Fecha de inspección:** 2026-11-13 (hora local de Bogotá)  
**Alcance:** inspección de solo lectura; no se implementaron las etapas 2–5.

## 1. Estado observado

La raíz inspeccionada contiene las carpetas esperadas `back end/`, `front end/` y `full stack/`. No se creó una copia del proyecto. Se omite la ruta absoluta local.

La raíz no es un repositorio Git (git status respondió que no es un repositorio). Por ello no se pudo inspeccionar el estado de cambios, ramas o historial. No se hizo commit ni cambio de rama. Tampoco se encontró una URL GitHub en los documentos; README y pendientes señalan que sigue pendiente.

Los tres README y los documentos prioritarios de integración, transferencia, contrato, pruebas, trazabilidad, decisiones, riesgos e informes existen. También existe traspaso-antigravity.md; no faltó ninguno de los documentos enumerados en el mensaje 1.

## 2. Versiones y dependencias instaladas

| Herramienta | Observado |
|---|---|
| Node.js | v26.7.0 |
| npm | 11.19.0 |
| Java en PATH | 25.0.4.1 LTS |
| Maven | 3.9.16; Maven informa que ejecuta sobre Java 17.0.12 |
| Python | No se encontró intérprete; python.exe y python3.exe apuntan a WindowsApps (alias de Microsoft Store). No se ejecutó el alias. |

Dependencias raíz instaladas según npm list --depth=0:

- Backend: express@4.22.3, mysql2@3.24.6, jsonwebtoken@9.0.3, bcryptjs@3.0.3, dotenv@18.0.10, zod@4.6.7.
- Frontend: vite@6.4.6.
- Hay package-lock.json en ambos proyectos y node_modules instalado. Los scripts consultados no contienen hooks de instalación personalizados.

## 3. Arquitectura real

- **Backend:** API REST modular en JavaScript ESM sobre Node.js y Express 4; rutas en back end/src/routes/, conexión MySQL con mysql2, autenticación JWT y contraseñas con bcryptjs. Hay migraciones SQL, utilidades, scripts administrativos y pruebas unitarias e integración.
- **Frontend:** SPA modular de JavaScript/HTML/CSS con Vite, sin React. Las vistas están bajo front end/src/views/; la vista de pagos está en pagos.js. El cliente API, autenticación e idempotencia están separados en src/services/.
- **Integración compartida:** full stack/ contiene documentación; no es una tercera aplicación.
- **Auxiliares:** herramienta de recaudos Java y reporte de cartera Python consumen la API según sus documentos; no duplican el backend.
- **TypeScript:** búsqueda de archivos y referencias en el código (excluidos node_modules, dist y lockfiles) no encontró .ts, tsconfig ni integración existente. No hay cliente/herramienta TypeScript que preservar o extender en este estado.

## 4. Configuración y seguridad

Se revisó configuración solo con back end/src/scripts/verificar-env.js, que informa presencia/estado sin mostrar valores:

- back end/.env: existe; variables requeridas presentes; el nombre de base coincide con uno de los dos nombres autorizados; la longitud de JWT_SECRET supera el mínimo del verificador; CORS tiene un origen y no usa comodín; puerto local 3000 libre. El script reportó configuración completa para conectar.
- back end/.env.test: existe; DB_NAME, JWT_SECRET y la variable opcional de login aparecen definidas. DB_HOST, DB_PORT, DB_USER y DB_PASSWORD no aparecen en ese archivo leído aisladamente; el script reportó cuatro campos por resolver. El comando de pruebas frontend combina .env y .env.test; el helper de integración exige el nombre exacto de la base _test y TEST_MODE=1.
- back end/.env.example y front end/.env.example existen. No se leyeron ni copiaron valores secretos.
- La identidad efectiva de DB_USER y el administrador presente en la base principal no se revalidaron. Informes anteriores dicen que la cuenta configurada es root y que falta crear el administrador principal; siguen como pendientes de confirmar localmente por Brayan, no como hechos revalidados en esta inspección.

## 5. Scripts y aislamiento de pruebas

Backend: npm start, npm run dev, npm run create-admin, npm test, npm run test:unit y npm run test:integration. Frontend: npm run dev, npm run build, npm test y npm run test:unit.

La guarda de integración (back end/src/utils/testdb.js) solo permite el nombre exacto _test junto con TEST_MODE=1. La limpieza requiere además ALLOW_TEST_DB_RESET=1; el helper verifica SELECT DATABASE() antes de limpiar. La prueba integrada frontend crea registros de muestra y su archivo no muestra limpieza al terminar; por tanto, deja datos en _test. No se ejecutaron pruebas ni resets durante esta Etapa 1.

**Ejecución anterior a esta etapa, en la interacción inmediatamente previa:** se ejecutaron npm run build (correcto) y npm test frontend (11/11, incluye un flujo integrado); ese flujo registró operaciones en _test. No se ejecutó contra la base principal. No repetirlo hasta decidir cómo aislar o limpiar los datos de prueba.

## 6. Discrepancias y riesgos

- Los informes anteriores mezclan resultados de diferentes fechas y autores. Las cifras comunicadas (17 unitarias backend, 17 de integración backend, 14 Java y 11 frontend) suman 59 casos reportados; no son 45. No se debe presentar ese subtotal como verificación de esta etapa. Un flujo integrado contiene varios pasos HTTP, que no equivalen a casos de prueba independientes.
- README y reportes llaman “verificada” a configuración, migraciones y ejecución histórica. Esta inspección no consultó MySQL, no comprobó tablas ni migraciones y no vuelve a validar esas afirmaciones.
- .env.test depende aparentemente de valores que están en .env; verificar el comando real y la precedencia de variables será necesario antes de una etapa con pruebas.
- La prueba integrada frontend persiste registros de prueba. Aunque apunta a _test, no es una suite de solo lectura.
- No hay Git local en la raíz, lo que impide identificar cambios ajenos y recuperar versiones con Git. No se modificó ningún archivo de código.
- Node y npm cumplen el mínimo declarado, aunque son más recientes que los entornos de referencia históricos. Maven corre con JDK 17 pese a que el ejecutable java encontrado primero informa JDK 25.

## 7. Mapa preliminar de evidencia académica

| Criterio | Evidencia encontrada | Faltante / estado | Responsable sugerido |
|---|---|---|---|
| Requisitos funcionales y no funcionales (15) | alcance-y-decisiones.md, contrato API, matriz de trazabilidad y código de las iteraciones 1–3 | No se identificó documento separado de requisitos priorizados con criterios de aceptación; revisar rúbrica y formalizar | Brayan + Isabella |
| Historias de usuario (10) | Requisitos y roles aparecen descritos en decisiones/matriz | No se encontró artefacto identificable de historias de usuario con formato y aceptación | Equipo |
| Mockups (10) | Frontend funcional con vistas en código | No se encontró archivo de mockup/prototipo editable; capturas no lo sustituyen | Isabella |
| Plan de pruebas (15) | plan-pruebas.md, suites backend/frontend/Java y guardas _test | Resultados son históricos salvo las ejecuciones explícitas de la sesión; incluir evidencia fechada y separar suites | Brayan |
| Casos de uso (10) | Flujos y matriz documentan comportamiento | No se encontraron diagramas StarUML .mdj ni otro archivo de casos de uso editable | Equipo |
| Secuencia integrada de tres iteraciones (15) | Contrato API, modelo de datos, matriz y código de módulos | No se encontró diagrama de secuencia editable que muestre integración de las tres iteraciones | Brayan |
| Componentes de tres iteraciones (10) | Arquitectura separada en API, frontend y herramientas; rutas, servicios y vistas | No se encontró diagrama de componentes editable | Brayan |
| GitHub coherente con historias (15) | README y pendientes reconocen que falta URL | No existe .git en la raíz ni URL encontrada; evidencia pendiente, sin publicar en esta etapa | Brayan |

No se encontraron archivos *.mdj, *.asta, *.drawio ni nombres que indiquen mockups, historias, requisitos o casos de uso. Esto es una búsqueda por archivos, no una afirmación de que no haya material externo al workspace.

## 8. Pendientes locales de Brayan

1. Confirmar localmente la cuenta MySQL efectiva y reemplazar root por una cuenta limitada cuando corresponda; esta inspección no cambia usuarios ni privilegios.
2. Crear interactivamente el administrador de la base principal cuando el equipo lo autorice; no se ejecutó el script.
3. Instalar/configurar Python localmente si se requiere ejecutar la herramienta; aquí solo se observó el alias de Microsoft Store.
4. Decidir y preparar el repositorio Git/GitHub fuera de esta etapa; no hay repositorio local detectable ni URL.
5. Antes de reutilizar la integración frontend, diseñar aislamiento o limpieza segura para los registros que crea en _test.

## 9. Propuesta concreta para la Etapa 2

Hacer una revisión técnica acotada del backend de pagos frente a contrato-api-propuesto.md y a las historias/requisitos disponibles: obligaciones y su estado efectivo, importes DECIMAL, idempotencia y concurrencia, permisos de anulación, auditoría, comprobante interno y re-pago. Trazar cada criterio al handler, SQL y prueba existente; ejecutar solo pruebas unitarias y añadir/corregir pruebas únicamente si el mensaje 2 lo autoriza. No cambiar esquema ni ejecutar pruebas que limpien o siembren datos sin comprobar primero el aislamiento. Si la siguiente etapa incorpora TypeScript, justificar primero una herramienta concreta y evitar duplicar la API.

