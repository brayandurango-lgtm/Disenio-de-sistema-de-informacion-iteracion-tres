# Informe de Ejecución Técnica — Antigravity (2026-11-13)

**Proyecto:** Autos Colombia — Gestión de Parqueadero (Concepto Cyber Colombia)  
**Alcance:** Construcción del Frontend Profesional, Integración con Backend Express + MySQL y Documentación de Traspaso.  
**Equipo Académico:** Brayan (Backend, MySQL, Integración), Isabella (Frontend, UX/UI, Documentación), Antigravity (Soporte Senior Full Stack & UI/UX).

---

## 1. Resumen Ejecutivo

En cumplimiento de las instrucciones de la entrega académica de la **Iteración 3** (centrada en la **gestión de pagos y obligaciones de mensualidad**), se construyó desde cero una interfaz frontend profesional, accesible y moderna dentro de la carpeta `front end/`.

Se verificó previamente que la carpeta `front end/` se encontraba vacía al inicio de la sesión, por lo que se diseñó una arquitectura limpia basada en **Vite + Vanilla JavaScript modular (ESM) y CSS moderno**, sin dependencias infladas de frameworks como React o Tailwind. Esta decisión técnica garantiza que Isabella cuente con una base comprensible, mantenible y directamente editable sin fricción.

El frontend se integró de forma completa con los endpoints del backend desarrollado por Devin y Qoder, implementando el protocolo estricto de **idempotencia con UUID v4**, el manejo de estados de red inciertos, la emisión de **comprobantes internos numerados (CMP-AAAA-NNNNNN)**, el control de morosidad mediante el cálculo de `estado_efectivo` (`pendiente`, `vencida`, `pagada`) y la anulación atómica auditada con re-pago posterior.

---

## 2. Antecedentes Verificados Personalmente

Antes de dar por reproducidos los resultados previos reportados por Qoder, se ejecutaron las suites de pruebas directamente en este entorno local sobre Windows 11 con Node.js v26.7.0 y MySQL 8.0.46:

| Componente | Estado Reportado por Qoder | Verificación Real Antigravity | Evidencia de Ejecución |
|---|---|---|---|
| Pruebas Unitarias Backend | 17/17 aprobadas | **17/17 aprobadas** | `npm run test:unit` en `back end` (5.09s) |
| Pruebas Integración Backend | 17/17 aprobadas | **17/17 aprobadas, 0 omitidas** | `node --env-file=.env.test --test test/integration/*.test.js` (9.41s) |
| Base de Datos Principal | 11 tablas, 0 filas | **Confirmada limpia (0 filas)** | `node src/scripts/inspeccionar-bd.js` |
| Base de Datos de Pruebas | 11 tablas migradas | **Confirmada con migraciones 001 y 002** | `node --env-file=.env.test src/scripts/inspeccionar-bd.js` |
| Herramienta Java (`reporte_recaudos`) | 14/14 JUnit | **14/14 JUnit aprobadas** | `mvn test` en `back end/tools/java/reporte_recaudos` (6.25s) |
| Herramienta Python (`reporte_cartera`) | No ejecutada | **Confirmada no instalada** | Alias de Microsoft Store sin intérprete real |
| Frontend Compilación | No existía | **Compilación exitosa en 575ms** | `npm run build` en `front end` (36 módulos, 0 errores) |
| Pruebas Automatizadas Frontend | No existía | **11/11 aprobadas** | `npm test` en `front end` (unitarias + flujo integrado) |

---

## 3. Archivos Creados y Modificados

### A. Frontend (`front end/`)
- `package.json`: Definición de scripts (`dev`, `build`, `test`, `test:unit`) y dependencia de desarrollo `vite`.
- `vite.config.js`: Configuración de servidor de desarrollo en puerto 5173 y proxy inverso opcional hacia `/api`.
- `index.html`: Estructura semántica, metadatos, viewport accesible y enlace de fuentes Inter / JetBrains Mono.
- `.env.example` y `.env`: Configuración pública con `VITE_API_URL=http://localhost:3000/api` (sin secretos).
- `src/main.js`: Enrutador cliente SPA por hash (`window.location.hash`), guardas de autenticación y carga de layouts.
- `src/styles/variables.css`: Sistema de diseño con paleta cyber (#09090F, #161621, #222230, #A855F7, #FF4057, #10B981).
- `src/styles/base.css`: Resets, estilos tipográficos, estados `:focus-visible` y soporte `@media (prefers-reduced-motion)`.
- `src/styles/components.css`: Estilos de botones, tarjetas interactivas, tablas, formularios, insignias y recibos.
- `src/styles/layout.css`: Contenedores de dos áreas (Pública y Autenticada), menús laterales y adaptación móvil.
- `src/styles/theme.css`: Resaltados neón moderados, estados de celdas libres/ocupadas y spinner accesible.
- `src/assets/LICENSES.md`: Documentación de autoría y licencias abiertas CC0/MIT de los recursos vectoriales.
- `src/assets/illustrations/`:
  - `logo.svg`: Emblema hexagonal con monograma AC y estética cyber.
  - `hero-cyber-parking.svg`: Panorámica de la infraestructura del parqueadero inteligente con celdas digitalizadas.
  - `automovil.svg`: Ilustración vectorial de automóvil sedán cyber.
  - `motocicleta.svg`: Ilustración vectorial de motocicleta urbana cyber.
  - `camioneta.svg`: Ilustración vectorial de camioneta SUV 4x4 cyber.
  - `bus.svg`: Ilustración vectorial de bus de transporte de pasajeros.
  - `camion.svg`: Ilustración vectorial de camión de carga pesada.
- `src/data/catalogo-demostrativo.js`: Catálogo de 5 vehículos con precios ficticios en COP, aislados de la base de datos.
- `src/data/config-sedes.js`: Centralización de información institucional con avisos explícitos de "pendiente de confirmar".
- `src/services/api.js`: Cliente HTTP centralizado con inyección de JWT, manejo de errores de contrato y respuesta ante 401.
- `src/services/auth.js`: Almacenamiento seguro en `sessionStorage`, métodos de login/logout y verificación de rol `administrador`.
- `src/services/idempotency.js`: Generación de UUID v4 por intento lógico y control de reintentos ante estado incierto.
- `src/utils/formatters.js`: Formateo de moneda COP con string exacto, fechas en hora de Bogotá y sanitización `escapeHTML()`.
- `src/utils/validators.js`: Validaciones de formato de placa colombiana, periodos `YYYY-MM` y UUIDs.
- `src/components/toast.js`: Sistema de alertas flotantes accesibles (`aria-live="polite"`).
- `src/components/modal.js`: Ventana modal accesible con trampa de foco y cierre con tecla Escape.
- `src/components/navbar.js`: Cabecera pública con enlaces y barra superior autenticada con monitor de salud backend.
- `src/components/sidebar.js`: Menú lateral operativo con control de visibilidad de ítems según rol.
- `src/views/landing.js`: Vista pública con presentación de servicios, vehículos admitidos, catálogo demo y sedes.
- `src/views/login.js`: Formulario de acceso sin credenciales precargadas, con manejo de carga, 401 y rate-limit 429.
- `src/views/dashboard.js`: Resumen operativo con métricas 100% reales consultadas de la API.
- `src/views/celdas.js`: Cuadrícula interactiva de celdas (libre, ocupada, fuera de servicio) y administración.
- `src/views/estancias.js`: Entradas y salidas de vehículos con protección contra doble clic y control de concurrencia.
- `src/views/clientes.js`: Directorio de clientes con buscador, paginación, CRUD y modal de resumen de cartera/deuda.
- `src/views/vehiculos.js`: Gestión de automotores con normalización de placas y bitácora de novedades por vehículo.
- `src/views/contratos.js`: Registro de contratos de mensualidad y módulo para **generar obligaciones explícitas**.
- `src/views/pagos.js`: Módulo de pagos con confirmación, idempotencia, comprobante numerado y anulación auditada.
- `src/views/usuarios.js`: Administración de personal, creación de cuentas, cambio de rol y contraseñas (solo admin).
- `test/formatters.test.js`: Pruebas unitarias de formateo monetario, fechas y escape XSS.
- `test/idempotency.test.js`: Pruebas unitarias de generación y reutilización de claves de idempotencia.
- `test/catalogo-demo.test.js`: Pruebas de verificación de aislamiento y etiquetado del catálogo de muestra.
- `test/api-integration-flow.test.js`: Prueba de integración extremo a extremo del flujo cliente contra MySQL `_test`.
- `README.md`: Documentación completa de instalación, comandos, arquitectura y variables públicas.

### B. Full Stack (`full stack/`)
- `full stack/docs/informe-antigravity.md`: Este informe de cierre y entrega técnica.
- `full stack/docs/traspaso-vscode.md`: Guía de puesta en marcha para que Brayan e Isabella abran y ejecuten el proyecto en VS Code.

---

## 4. Matriz Pantalla → Historia/Requisito → Endpoint → Prueba

| Pantalla / Módulo | Requisito / Historia de Usuario | Endpoint(s) de la API | Prueba Automatizada |
|---|---|---|---|
| **Login** (`#/login`) | Autenticación con JWT, control de intentos (429) y sin credenciales precargadas | `POST /api/auth/login`, `GET /api/auth/yo` | `api-integration-flow.test.js` paso 2; `test/integration/auth.test.js` |
| **Dashboard** (`#/panel`) | Indicadores verificables en tiempo real sin estadísticas ficticias | `GET /api/celdas`, `GET /api/estancias`, `GET /api/contratos`, `GET /api/pagos` | `api-integration-flow.test.js` pasos 1, 4, 7, 10, 12 |
| **Celdas** (`#/celdas`) | Vista en tarjetas, estado no solo por color, creación y habilitación por admin | `GET /api/celdas`, `POST /api/celdas`, `PATCH /api/celdas/:id` | `api-integration-flow.test.js` pasos 3-4; `celdas.test.js` |
| **Entradas y Salidas** (`#/estancias`) | Control de acceso seguro, validación de celda libre, salida y prevención de doble clic | `GET /api/estancias`, `POST /api/estancias`, `POST /api/estancias/:id/salida` | `api-integration-flow.test.js` pasos 7-9; `estancias.test.js` |
| **Clientes** (`#/clientes`) | Búsqueda (`q`), paginación, CRUD y consulta de estado de cartera/morosidad | `GET /api/clientes`, `POST /api/clientes`, `PATCH /api/clientes/:id`, `GET /api/resumen/cliente/:id` | `api-integration-flow.test.js` pasos 5 y 20; `formatters.test.js` |
| **Vehículos** (`#/vehiculos`) | Normalización de placa, asociación a cliente y bitácora de novedades | `GET /api/vehiculos`, `POST /api/vehiculos`, `GET/POST /api/vehiculos/:id/novedades` | `api-integration-flow.test.js` paso 6; `formatters.test.js` |
| **Contratos** (`#/contratos`) | Suscripción de mensualidad, tarifa fija, inicio día 1 y generación de obligaciones | `GET /api/contratos`, `POST /api/contratos`, `PATCH /api/contratos/:id`, `POST /api/contratos/:id/obligaciones/generar` | `api-integration-flow.test.js` pasos 10-11; `periodos.test.js` |
| **Obligaciones y Pagos** (`#/pagos`) | Recaudo de mensualidad con clave UUID v4 de idempotencia y anti-duplicados | `GET /api/obligaciones`, `POST /api/pagos` | `api-integration-flow.test.js` pasos 12-14; `idempotency.test.js` |
| **Comprobante Interno** (`#/pagos`) | Emisión y visualización de recibo interno consecutivo numerado (CMP-AAAA-NNNNNN) | `GET /api/pagos/:id/comprobante` | `api-integration-flow.test.js` paso 15; `pagos.test.js` |
| **Anulación y Re-pago** (`#/pagos`) | Anulación con motivo obligatorio (solo admin), retorno a 'pendiente' y re-pago | `POST /api/pagos/:id/anular`, `GET /api/obligaciones/:id`, `POST /api/pagos` | `api-integration-flow.test.js` pasos 16-19; `pagos.test.js` |
| **Usuarios** (`#/usuarios`) | Gestión de cuentas de personal, cambio de roles y cambio de contraseñas | `GET/POST /api/usuarios`, `PATCH /api/usuarios/:id`, `POST /api/usuarios/:id/cambiar-password` | `api-integration-flow.test.js` paso 3; `usuarios.test.js` |
| **Catálogo Demostrativo** (`#/catalogo-demo`) | Visualización de vehículos solicitada por Brayan, estrictamente aislada y rotulada | Datos locales en `src/data/catalogo-demostrativo.js` (sin API comercial) | `catalogo-demo.test.js` |
| **Sedes y Contacto** (`#/contacto`) | Información institucional transparente sin invención de teléfonos ni direcciones de terceros | Configuración en `src/data/config-sedes.js` | `catalogo-demo.test.js` |

---

## 5. Decisiones de Diseño Visual y Accesibilidad

1. **Paleta Cyber Colombia:**
   - Se aplicó el fondo `#09090F` con tarjetas de superficie en `#161621` y bordes sutiles en `#2d2d42`.
   - El **violeta neón (`#A855F7`)** actúa como acento principal de marca, navegación y llamadas a la acción primarias.
   - El **rojo neón (`#FF4057`)** se reservó exclusivamente para alertas, anulaciones y salidas vehiculares, evitando la saturación.
   - El contraste del texto normal (`#F4F4F5` y `#B8B8C8`) supera ampliamente el estándar mínimo de 4.5:1 de las directrices WCAG 2.1 AA.

2. **Percepción de Estados:**
   - Las celdas y obligaciones no comunican su estado únicamente por color: cada una incorpora un icono distintivo (`✔`, `🚗`, `⚠`, `📋`) y una etiqueta de texto explícita en mayúsculas (`LIBRE`, `OCUPADA`, `FUERA DE SERVICIO`, `PENDIENTE`, `PAGADA`, `VENCIDA`).

3. **Adaptabilidad Móvil y Teclado:**
   - La interfaz incluye navegación fluida por teclado con `:focus-visible` resaltado y soporte nativo para cerrar modales con la tecla `Escape`.
   - Se respetó la preferencia de accesibilidad `@media (prefers-reduced-motion: reduce)`, desactivando animaciones y transiciones ante usuarios con sensibilidad al movimiento.
   - En pantallas menores a 992px, la barra lateral se transforma en un panel deslizante accesible mediante botón toggle.

---

## 6. Tratamiento de Pendientes y Contenidos Comerciales

- **Catálogo de Venta de Vehículos:** Se implementaron 5 tarjetas con ilustraciones vectoriales originales, especificaciones conceptuales y precios de muestra en COP. Se rotuló de forma prominente la insignia **Demostración Ilustrativa**, dejando claro en la interfaz que el parqueadero es exclusivamente un servicio de mensualidad y que los vehículos no están en venta real ni admiten transacciones comerciales.
- **Sedes y Teléfonos:** En la vista pública y en la configuración `config-sedes.js`, se especifica de forma transparente que las líneas de atención y direcciones físicas se encuentran *pendientes de confirmación oficial por la administración*, evitando asociar números de teléfono o mapas reales de terceros.
- **Comprobante Interno:** Se evitó intencionalmente el término "factura electrónica", rotulando cada recibo emitido como **Comprobante Interno de Control de Recaudo (CMP-AAAA-NNNNNN)**.

---

## 7. Pendientes Locales Fuera del Código

Tal como documentaron Devin y Qoder, los siguientes puntos corresponden a tareas administrativas locales que el agente de IA no debe ejecutar de forma desatendida:
1. **Cuenta de Aplicación MySQL:** El archivo `back end/.env` utiliza actualmente la cuenta `root`. Brayan debe crear la cuenta limitada `autos_app` con permisos DML (`SELECT, INSERT, UPDATE, DELETE`) y actualizar su contraseña localmente.
2. **Administrador de la Base Principal:** La base de datos principal (`Disenio_de_sistema_de_informacion_iteracion_tres`) está migrada con sus 11 tablas limpias. Falta que Brayan ejecute interactivamente `npm run create-admin` en la terminal para definir la contraseña del administrador real.
3. **Herramienta Python:** Requiere la instalación local de Python 3.10+ en el sistema para ejecutar las pruebas de `reporte_cartera`.
4. **Repositorio Git / GitHub:** No se ha publicado a ningún repositorio remoto, a la espera de las credenciales de Brayan.

---

## 8. Próximos Pasos Recomendados

### Para Brayan (Backend e Integración)
1. Abrir una terminal en `back end/` y ejecutar interactivamente `npm run create-admin` para crear la cuenta administrativa en la base principal.
2. Evaluar la creación del usuario de base de datos con privilegios limitados (`autos_app`) conforme a la plantilla SQL de `full stack/docs/cierre-backend.md`.
3. Instalar Python 3.10+ si se requiere emitir reportes de cartera desde la herramienta auxiliar de consola.

### Para Isabella (Frontend y Documentación)
1. Abrir `front end/` en VS Code y ejecutar `npm run dev` para explorar la interfaz en `http://localhost:5173`.
2. Revisar los textos y contenidos de las vistas en `front end/src/views/` para afinar los detalles de redacción académica.
3. Utilizar las ilustraciones y la estructura visual de las pantallas implementadas como referencia fidedigna para la elaboración de los mockups y el manual de usuario, registrando la herramienta real empleada en su entrega.
