# Reporte de cartera (Python) — Autos Colombia

Herramienta de consola **auxiliar**. Consulta la API del backend, pagina las
obligaciones y exporta un CSV de cartera. No escribe en MySQL, no reimplementa
reglas de negocio y no calcula estados: usa `importe` y `estado_efectivo` tal
como los devuelve `GET /api/obligaciones`.

## Requisitos

- Python 3.10 o superior (solo biblioteca estándar; sin `pip install`).
- Backend en ejecución y accesible por HTTP.

## Uso

```bash
cd "back end/tools/python/reporte_cartera"

# Opción A: token ya emitido (no se pasa como argumento visible)
export AUTOCOLOMBIA_TOKEN="<jwt>"
python reporte_cartera.py --periodo-desde 2026-09 --periodo-hasta 2026-11

# Opción B: usuario y contraseña por entorno (se hace login contra /api/auth/login)
export AUTOCOLOMBIA_USUARIO=operador.autoscolombia
export AUTOCOLOMBIA_PASSWORD='<contraseña>'
python reporte_cartera.py --periodo-desde 2026-09 --periodo-hasta 2026-11

# Opción C: sin variables, pide usuario y contraseña por consola (getpass)
python reporte_cartera.py --salida cartera.csv
```

| Opción | Descripción |
|---|---|
| `--base-url` | URL de la API (defecto `AUTOCOLOMBIA_API_URL` o `http://127.0.0.1:3000`) |
| `--periodo-desde` / `--periodo-hasta` | Rango `AAAA-MM` inclusivo; se valida y se envía a la API |
| `--salida` | Archivo CSV (defecto `reporte_cartera_AAAAMMDD.csv`) |
| `--tamano` | Tamaño de página 1-100 (defecto 100) |
| `--incluir-pagadas` | Incluye obligaciones pagadas (por defecto solo deuda) |

## Qué produce

CSV UTF-8 con BOM (compatible con Excel) y las columnas:
`fecha_corte, cliente_id, cliente_nombre, contrato_id, vehiculo_id, placa,
obligacion_id, periodo, fecha_vencimiento, importe, estado_registrado,
estado_efectivo`.

- `fecha_corte`: fecha de generación en `America/Bogota` (UTC-5 fijo).
- `importe`: decimal con dos posiciones, tomado del API; las sumas se hacen con
  `Decimal` y nunca con `float`.
- La deuda total (`pendiente + vencida`) se informa por `stderr`; no se agrega
  como fila al CSV para no falsear el detalle.
- Los campos de texto se sanean: si empiezan por `=`, `+`, `-` o `@` se
  prefijan con apóstrofo para evitar fórmulas al abrir el archivo.

## Permisos y seguridad

- Respeta los permisos de la API: el token debe corresponder a una cuenta con
  acceso a obligaciones.
- El token no se acepta como argumento de línea de comandos ni se imprime.
- No se registran contraseñas ni tokens; los errores solo muestran estado HTTP
  y código de negocio.

## Pruebas

```bash
cd "back end/tools/python/reporte_cartera"
python -m unittest discover -s tests -v
```

Las pruebas no usan red: el cliente HTTP se inyecta y las páginas se simulan.
El archivo `tests/fixtures/obligaciones_ficticias.json` contiene datos ficticios.

## Limitaciones

- El reporte refleja lo que la API tiene registrado; **no** es conciliación
  bancaria ni contabilidad oficial.
- Si el backend no está en ejecución o faltan credenciales, la herramienta
  termina con código 2 y un mensaje, sin inventar datos.
- El estado del entorno en que se creó esta herramienta no tenía Python
  instalado; consulte `full stack/docs/informe-qoder.md`.
