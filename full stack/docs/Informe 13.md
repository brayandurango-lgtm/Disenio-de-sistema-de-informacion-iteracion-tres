# Guía de Traspaso y Puesta en Marcha en VS Code

**Proyecto:** Autos Colombia — Gestión de Parqueadero  
**Destinatarios:** Brayan (Backend) e Isabella (Frontend)  
**Entorno comprobado:** Windows 11, Node.js 20+, MySQL 8.0.46, VS Code

---

## 1. Apertura del Proyecto en VS Code

Para evitar discrepancias de rutas o duplicaciones de carpetas ("Diseno" vs "Disenio"):

1. Abra Visual Studio Code.
2. Vaya al menú **Archivo > Abrir carpeta...** (o `Ctrl + K, Ctrl + O`).
3. Seleccione la carpeta raíz del proyecto que descargó o clonó; no use una
   ruta absoluta de otro equipo.
4. Confirme que en el explorador lateral de VS Code aparezcan las tres carpetas principales:
   - `back end/`
   - `front end/`
   - `full stack/`

---

## 2. Puesta en Marcha en Dos Terminales

Se recomienda abrir dos terminales integradas en VS Code (`Ctrl + Ñ` o `Terminal > Nueva terminal`):

### Terminal 1: Backend (Express + MySQL)
```bash
cd "back end"

# 1. Instalar dependencias fijadas por el lockfile (solo en la preparación)
npm ci

# 2. Iniciar el servidor backend (puerto 3000)
npm start
```
*El servidor confirmará en consola:*
```text
{"ts":"...","nivel":"info","msg":"servidor escuchando en http://127.0.0.1:3000"}
```

Para comprobar la salud del backend desde otra pestaña:
```bash
curl http://127.0.0.1:3000/api/salud
curl http://127.0.0.1:3000/api/salud/db
```

### Terminal 2: Frontend (Vite)
```bash
cd "front end"

# 1. Instalar dependencias fijadas por el lockfile (solo en la preparación)
npm ci

# 2. Iniciar el servidor de desarrollo de Vite (puerto 5173)
npm run dev
```
*Vite indicará en consola:*
```text
  VITE v6.4.6  ready in 200 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abra la URL local que Vite muestre en el terminal. El puerto solicitado es
5173, pero `strictPort` no está configurado; si está ocupado puede cambiar.

---

## 3. Acceso Inicial al Sistema y Cuentas de Demostración

La base de pruebas puede tener cuentas semilla ficticias. Esta guía no publica
contraseñas; no use cuentas de prueba contra la base principal. Consulte el
procedimiento local autorizado para sembrar o crear usuarios de prueba.

| Rol | Capacidad general |
|---|---|
| Administrador | Puede gestionar acciones administrativas, incluyendo anulación auditada según permisos del sistema. |
| Operador | Operación diaria según permisos; no debe anular pagos ni realizar acciones reservadas al administrador. |

> **Nota:** el formulario de inicio de sesión (`#/login`) no debe precargar credenciales. Gestiona las credenciales de pruebas solo localmente.

---

## 4. Recorrido de Prueba Rápido (Paso a Paso)

1. **Portal Público (`#/inicio`):**
   - Explore la presentación del parqueadero por mensualidad y las 5 ilustraciones vectoriales de vehículos.
   - Navegue a la sección **Catálogo Demostrativo** para comprobar que las tarjetas de muestra de vehículos se presentan claramente aisladas de la base de datos con la etiqueta *Demostración Ilustrativa*.
   - Revise la sección **Sedes y Contacto** con el aviso transparente de datos comerciales pendientes.
2. **Iniciar Sesión (`#/login`):**
   - Usa una cuenta ficticia de la base `_test` creada localmente; no reutilices credenciales de prueba en la base principal.
3. **Dashboard (`#/panel`):**
   - Compruebe que los indicadores de celdas totales, celdas libres, estancias activas y contratos provienen directamente de la API en tiempo real.
4. **Celdas (`#/celdas`):**
   - Observe la cuadrícula de celdas con sus estados accesibles (`Libre`, `Ocupada`, `Fuera de servicio`).
5. **Entradas y Salidas (`#/estancias`):**
   - Haga clic en **Registrar Entrada**, seleccione un vehículo y una celda libre. Compruebe que la celda pasa inmediatamente a estar ocupada.
   - En la lista de vehículos en parqueadero, haga clic en **Registrar Salida** para liberar la celda.
6. **Obligaciones y Pagos (`#/pagos`):**
   - En la pestaña *Obligaciones de Pago*, seleccione una obligación pendiente o vencida y haga clic en **Pagar**.
   - Verifique que la ventana modal muestra el resumen de la obligación, permite seleccionar el medio de pago (`efectivo` o `transferencia`) y asigna una clave UUID v4 de idempotencia.
   - Al confirmar el pago, observe la emisión automática del **Comprobante Interno (CMP-AAAA-NNNNNN)** con formato imprimible.
7. **Prueba de Anulación (Cambio a Administrador):**
   - Cierre sesión desde la barra superior y acceda como `admin.autoscolombia`.
   - Vaya a *Obligaciones y Pagos > Historial de Pagos*, localice el pago confirmado y haga clic en **Anular**.
   - Ingrese el motivo obligatorio de anulación. Compruebe que el pago pasa a estado `anulado` y que la obligación regresa automáticamente al estado `pendiente` para admitir un nuevo pago.

---

## 5. Comandos de pruebas — consultar el estado actual

Este documento es un traspaso histórico; usa los READMEs actualizados de cada
componente antes de ejecutar pruebas. En particular, la suite completa de
integración backend tiene limpieza global de `_test` y no debe ejecutarse hasta
que el aislamiento sea seguro.

### Pruebas del Frontend
```bash
cd "front end"
npm run test:unit
node --env-file="../back end/.env" --env-file="../back end/.env.test" --test test/api-integration-flow.test.js
```

### Pruebas del Backend
```bash
cd "back end"
npm run test:unit
```

No ejecutes el comando de integración backend anterior en el estado actual:
su preparación llama a `resetDb()` y elimina datos de todas las tablas de
`_test`. El flujo integrado frontend es distinto: la Etapa 3 reportó dos
corridas con limpieza acotada al fixture. Revisa el README raíz para el comando
aislado y sus precondiciones.

### Pruebas de la Herramienta Java
```bash
cd "back end/tools/java/reporte_recaudos"
mvn test                                                       # 17 pruebas JUnit; JDK 25 requerido
```

---

## 6. Variables de Entorno y Configuración

Usa `.env.example` como referencia y crea los archivos `.env` localmente. No
copies ni publiques valores de credenciales en documentación.

---

## 7. Consejos de Trabajo para el Equipo

- **Para Isabella:**
  - Los archivos de estilos están desacoplados y organizados en `front end/src/styles/` (`variables.css`, `components.css`, etc.).
  - Las vistas se encuentran en `front end/src/views/`. Cada archivo exporta una función que retorna un elemento HTML estándar del DOM, facilitando agregar o retocar campos sin lidiar con JSX ni ciclos de vida complejos.
  - Para los mockups académicos de entrega, tome capturas reales de la interfaz en funcionamiento a resolución 1920x1080 y en vista móvil (375x667). Documente en la entrega la herramienta utilizada (por ejemplo, Figma o capturas de la aplicación en navegador).
- **Para Brayan:**
   - No ejecutes el reset global de `_test` desde esta guía; su aislamiento debe resolverse primero.
   - Para crear el administrador en la base de datos principal, ejecuta interactivamente desde `back end/`:
    ```bash
    cd "back end"
    npm run create-admin
    ```
