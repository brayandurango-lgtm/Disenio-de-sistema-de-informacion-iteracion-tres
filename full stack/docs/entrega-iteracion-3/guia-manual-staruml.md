# Guía práctica para construir los diagramas en StarUML

Las fuentes PlantUML sirven como plano de trabajo para recrear los modelos en StarUML. No son un proyecto `.mdj`. En este equipo no se detectaron StarUML ni PlantUML, así que el archivo nativo, las exportaciones y la revisión visual siguen pendientes.

## Crear el proyecto

1. Abre StarUML y crea un proyecto UML nuevo.
2. Guárdalo como `autos-colombia-iteracion-3.mdj` dentro de `diagramas/staruml/`.
3. Crea paquetes llamados `Casos de uso`, `Secuencias` y `Componentes`.
4. Dentro de ellos crea un diagrama de casos de uso, dos diagramas de secuencia y un diagrama de componentes. Guarda el archivo después de cada vista.
5. Usa fondo blanco, texto oscuro, violetas discretos y títulos breves. Deja espacio entre participantes y mensajes; procura que las etiquetas no crucen flechas.

## 1. Casos de uso de pagos

- **Límite:** `Sistema de gestión del parqueadero`.
- **Actores:** `Operador` y `Administrador`. Conecta Administrador con Operador mediante generalización para expresar que el administrador puede realizar las tareas operativas.
- **Casos dentro del límite:** consultar obligaciones y mensualidades; generar obligaciones del contrato; registrar pago completo; consultar historial; consultar detalle y comprobante interno; consultar resumen de deuda; anular pago con motivo.
- **Asociaciones:** conecta Operador con todos los casos salvo anular. Conecta Administrador con anular. La autenticación se explica como precondición en una nota.
- No agregues al cliente como actor ni a un banco: los usuarios del sistema son cuentas autenticadas y los pagos se registran manualmente. El comprobante es interno, no una factura electrónica.
- No agregues relaciones `include` o `extend`: los casos descritos no requieren esa dependencia para explicarse.
- **Distribución:** actores a la izquierda, casos en dos columnas dentro del límite a la derecha. Pon la nota de autenticación debajo de los actores y la nota sobre transferencia/comprobante cerca de registrar pago.

## 2. Secuencia de pago e idempotencia

De izquierda a derecha: `Operador o administrador`, `Vista de pagos`, `Cliente API (fetch)`, `Ruta Express de pagos`, `Autenticación y rol`, `Pool mysql2`, `MySQL`.

1. El usuario revisa la obligación y confirma el medio. La vista crea una clave UUID para ese intento y envía `POST /api/pagos` con Bearer.
2. La ruta pide autenticación. El middleware consulta el usuario activo en MySQL y devuelve la identidad/rol; luego la ruta valida los datos.
3. La ruta abre la transacción. Primero bloquea la obligación con `SELECT ... FOR UPDATE`; después busca la clave de idempotencia.
4. Dibuja un fragmento `alt` con cuatro salidas: clave existente equivalente (recupera el pago y responde 200); clave usada con obligación o método distinto (409); obligación ya pagada (409); obligación pendiente válida (importe tomado del servidor, consecutivo, pago, estado y auditoría, lectura del detalle y commit, luego 201). Añade una rama de error que revierte la transacción.
5. Dibuja las respuestas hacia atrás por la ruta y el cliente API. El actor solo recibe una confirmación después de que la transacción termina.
6. Añade una nota: un reintento equivalente no crea un segundo pago; si se pierde la respuesta, el resultado queda incierto; la vista debe reutilizar la clave del mismo intento. La clave permanece en memoria, por lo que recargar la página no garantiza recuperarla.

El código también maneja una carrera de clave duplicada al insertar. Si el diagrama permite espacio, agrega una nota lateral que explique que devuelve el pago equivalente cuando lo encuentra y responde conflicto cuando los datos no coinciden.

## 3. Secuencia integrada de las tres iteraciones

De izquierda a derecha: `Operador`, `Pantallas web`, `Cliente API`, `API Express (rutas del dominio)`, `Pool mysql2`, `MySQL`. Usa tres separadores de interacción para que la lectura no se vuelva una sola línea larga.

- **Iteraciones 1 y 2, preparación:** registrar cliente y vehículo; crear contrato mensual. En una nota previa, indicar que debe existir una celda habilitada.
- **Iteración 1, estancia:** registrar entrada y validar vehículo registrado y celda habilitada y libre; confirmar apertura y ocupación. El código de entrada no consulta el contrato, así que no representes esa validación como implementada. Registrar salida; cerrar estancia y liberar la celda.
- **Iteración 3, mensualidad:** solicitar explícitamente generación de obligaciones; consultar la obligación; confirmar el pago completo usando el flujo detallado en el diagrama 2; consultar historial o comprobante.
- Devuelve cada respuesta de MySQL al pool, de ahí a Express, al cliente API y a la interfaz. No dibujes una conexión de la base de datos al navegador.
- Añade una nota: la secuencia es un ejemplo de recorrido, no obliga a generar la mensualidad después de la salida. El pago cubre un periodo mensual, no horas de estancia. La deuda es informativa y no bloquea entradas/salidas.
- Si falta espacio, deja los mensajes de persistencia resumidos y remite el detalle de idempotencia al diagrama 2.

## 4. Componentes de las tres iteraciones

Distingue contenedores de ejecución de sus componentes lógicos:

- **Nodo navegador:** aplicación web HTML/CSS/JavaScript con Vite, vistas/navegación, cliente API `fetch` con Bearer, sesión en `sessionStorage` y catálogo local demostrativo.
- **Proceso servidor:** API Node.js/Express, autenticación JWT y permisos por rol, componentes lógicos de clientes/usuarios, vehículos/novedades, celdas/estancias, contratos, obligaciones/pagos y persistencia con pool/transacciones.
- **Base de datos:** MySQL como nodo separado. La única conexión a ella sale de persistencia del servidor y se etiqueta `SQL mediante mysql2`.
- **Procesos auxiliares:** herramienta Java de recaudos y herramienta Python de cartera. Ambas consultan la API por HTTP/JSON autenticado. Etiqueta Python como ejecución pendiente de verificación.
- Etiqueta la conexión navegador/API como `HTTP/JSON` y `Authorization: Bearer`. No conectes navegador y MySQL. No dibujes microservicios: los módulos son piezas internas de la misma API Express.
- Deja el catálogo ilustrativo dentro del navegador y aclara que no se persiste ni representa comercio electrónico.

## Revisión y exportación

1. Contrasta nombres y operaciones con `back end/src/app.js` y los routers; revisa permisos en `back end/src/middleware/auth.js`.
2. Verifica que cada respuesta siga el camino de regreso y que las flechas no sugieran integraciones bancarias ni acceso del navegador a MySQL.
3. Guarda el `.mdj`, ciérralo y vuelve a abrirlo en StarUML. Esta apertura comprueba el proyecto; aún revisa manualmente que elementos, flechas y textos queden legibles.
4. Exporta cada diagrama a SVG (y PNG de alta resolución si hace falta). Abre los archivos exportados y comprueba márgenes y etiquetas cortadas.
5. Actualiza `diagramas/README.md` con los nombres reales de archivos y la herramienta usada. No marques renderizado, revisión visual ni validación StarUML antes de completar cada paso.
