# Autos Colombia — Frontend (Cyber Colombia)

Frontend modular para el parqueadero académico basado en el caso **Autos Colombia**, desarrollado bajo el concepto visual **Automóvil Cyber Colombia**.

Incluye vistas públicas y operativas que consumen módulos de la API Express. La iteración 3 se centra en **obligaciones y pagos**. La presencia de una vista no implica que todas sus operaciones hayan sido validadas visualmente o de extremo a extremo.

---

## 1. Pila Tecnológica y Arquitectura

- **Arquitectura:** Single Page Application (SPA) basada en módulos estándar de ECMAScript (`import`/`export`), HTML5 semántico y CSS moderno con variables (`custom properties`).
- **Herramienta de desarrollo y empaquetado:** [Vite](https://vite.dev/) (sin sobrecargar con frameworks pesados como React, Angular o Tailwind, preservando una base limpia y fácilmente extensible por Isabella).
- **Consumo de API:** Cliente centralizado en `src/services/api.js` para solicitudes y manejo de errores HTTP; las rutas operativas requieren autenticación según el backend.
- **Gestor de Idempotencia:** `src/services/idempotency.js` genera UUID v4 por intento lógico y permite reutilizarlo durante reintentos en memoria; no garantiza recuperación después de recargar la página.
- **Seguridad implementada:** Uso de `sessionStorage` para el JWT y utilidades de escape HTML en vistas. Esto no sustituye una auditoría de seguridad completa.

---

## 2. Estructura de Archivos

```text
front end/
  ├── index.html                     # Documento raíz con metadatos y tipografía
  ├── package.json                   # Scripts de ejecución, compilación y pruebas
  ├── vite.config.js                 # Puerto solicitado (5173) y proxy (/api); strictPort no está configurado
  ├── .env.example                   # Variables públicas de entorno de ejemplo
  ├── test/                          # Pruebas automatizadas (unitarias e integración)
  │     ├── formatters.test.js       # Pruebas de formateo COP, fechas y XSS
  │     ├── idempotency.test.js      # Pruebas de UUID v4 y retención de clave
  │     ├── catalogo-demo.test.js    # Pruebas de aislamiento del catálogo demo
  │     └── api-integration-flow.test.js # Flujo integrado completo contra MySQL _test
  └── src/
        ├── main.js                  # Enrutador por hash (#/...) y guardas de acceso
        ├── assets/
        │     ├── LICENSES.md        # Documentación de autoría y licencias CC0/MIT
        │     └── illustrations/     # 7 ilustraciones vectoriales originales (SVG)
        │           ├── automovil.svg
        │           ├── motocicleta.svg
        │           ├── camioneta.svg
        │           ├── bus.svg
        │           ├── camion.svg
        │           ├── hero-cyber-parking.svg
        │           └── logo.svg
        ├── data/
        │     ├── catalogo-demostrativo.js # Vehículos demo (alcance exclusivamente visual)
        │     └── config-sedes.js          # Sedes y contactos centralizados transparentes
        ├── services/
        │     ├── api.js             # Fetch centralizado, Bearer JWT y control de errores
        │     ├── auth.js            # Login, sesión, verificación de roles (admin/operador)
        │     └── idempotency.js     # Claves UUID v4 y control de estados inciertos
        ├── utils/
        │     ├── formatters.js      # Formateador de moneda COP, fechas Bogotá y XSS escape
        │     └── validators.js      # Validación de placas, periodos y UUIDs
        ├── components/
        │     ├── navbar.js          # Cabecera pública y topbar autenticado
        │     ├── sidebar.js         # Menú lateral con filtros por rol
        │     ├── toast.js           # Notificaciones accesibles flotantes
        │     └── modal.js           # Ventanas modales accesibles con trampa de teclado y ESC
        ├── styles/
        │     ├── variables.css      # Paleta cyber (#09090F, #161621, #A855F7, #FF4057)
        │     ├── base.css           # Accesibilidad, focus-visible y prefers-reduced-motion
        │     ├── components.css     # Botones, tarjetas, tablas, badges y comprobante
        │     ├── layout.css         # Grid responsive y layouts (público vs autenticado)
        │     └── theme.css          # Neón moderado, estados de celda y spinner
        └── views/
              ├── landing.js         # Portada, servicios, catálogo demo y sedes
              ├── login.js           # Login sin pre-llenado, con manejo de 401 y 429
              ├── dashboard.js       # Indicadores reales de celdas, estancias y contratos
              ├── celdas.js          # Cuadrícula de celdas, ocupación y control admin
              ├── estancias.js       # Entradas y salidas seguras contra doble clic
              ├── clientes.js        # Búsqueda, paginación, CRUD y resumen de deuda
              ├── vehiculos.js       # Placas normalizadas y novedades por vehículo
              ├── contratos.js       # Contratos y generación explícita de obligaciones
              ├── pagos.js           # Pagos con idempotencia, comprobante y anulación
              └── usuarios.js        # Administración de cuentas y roles (solo admin)
```

---

## 3. Instalación y Ejecución

### Requisitos Previos
- Node.js 20+
- Backend de Autos Colombia en ejecución en `http://127.0.0.1:3000`

### Comandos de Desarrollo
```bash
# 1. Instalar las dependencias fijadas por el lockfile
npm ci

# 2. Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# 3. Compilar para producción (genera carpeta dist/)
npm run build

# 4. Previsualizar la compilación de producción
npm run preview
```

### Ejecución de Pruebas
```bash
# Suite completa: incluye el flujo de integración contra MySQL _test cuando
# están configurados los archivos de entorno requeridos.
npm test

# Ejecutar únicamente pruebas unitarias en memoria (sin MySQL)
npm run test:unit
```

El flujo de integración valida que la conexión efectiva apunte a la base de
pruebas y limpia únicamente los datos identificados por su fixture de ejecución.
No lo ejecute si alguien más está usando esa base. La Etapa 3 registró dos
ejecuciones aprobadas del flujo; no se revisó la interfaz visual en navegador
en esa etapa.

---

## 4. Identidad Visual y Accesibilidad

- **Colores Principales:**
  - Fondo: `#09090F` (Negro obsidiana profundo)
  - Superficies: `#161621` y `#222230`
  - Acento Principal: `#A855F7` (Violeta Neón)
  - Acento de Alerta / Peligro: `#FF4057` (Rojo Neón)
  - Éxito / Confirmación: `#10B981` (Verde Esmeralda)
  - Textos: `#F4F4F5` y `#B8B8C8` como colores de texto de la paleta. No se afirma medición formal de contraste.
- **Elementos de accesibilidad presentes (sin certificación WCAG):**
  - Las vistas incluyen etiquetas de texto e iconos para varios estados; la cobertura de todas las rutas debe comprobarse manualmente.
  - Estilos de foco `:focus-visible` para apoyar navegación por teclado.
  - Respeto a la preferencia de usuario `@media (prefers-reduced-motion: reduce)`.
  - Hay formularios con etiquetas explícitas (`<label for="...">`); revisar asociaciones y mensajes por pantalla.

---

## 5. Diferenciación de Áreas y Alcance

1. **Área Pública (`#/inicio`, `#/servicios`, `#/catalogo-demo`, `#/contacto`):**
   - Presentación de los servicios de parqueadero por mensualidad.
   - Ilustración panorámica y tipos de vehículos admitidos (Automóvil, Motocicleta, Camioneta, Bus, Camión).
   - **Catálogo Demostrativo:** Vehículos ficticios con precios de muestra en COP rotulados como *Demostración Ilustrativa*, totalmente desacoplados de la base de datos y sin módulos de compraventa.
   - **Sedes y Contacto:** Configuración centralizada que informa con transparencia que los datos comerciales se encuentran pendientes de confirmación oficial, evitando inventar teléfonos o direcciones ficticias de terceros.

2. **Panel Operativo Autenticado (`#/panel`, `#/celdas`, `#/estancias`, `#/clientes`, `#/vehiculos`, `#/contratos`, `#/pagos`, `#/usuarios`):**
   - Acceso restringido por JWT Bearer.
  - Vistas operativas consultan módulos de la API; no se afirma validación independiente de todas las respuestas o endpoints.
   - Manejo de roles: acciones de anulación de pagos, creación de celdas y administración de cuentas reservadas para `administrador`.
   - Generación de comprobante interno consecutivo (`CMP-AAAA-NNNNNN`), especificando que no constituye factura electrónica.
