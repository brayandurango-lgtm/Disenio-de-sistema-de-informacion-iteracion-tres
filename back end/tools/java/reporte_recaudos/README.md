# Reporte de recaudos (Java) — Autos Colombia

Herramienta de consola **auxiliar**. Consulta `GET /api/pagos` con autenticación
JWT, recorre todas las páginas de un intervalo y genera un CSV con el detalle y
un resumen de pagos **confirmados** y **anulados**.

No sustituye la conciliación bancaria ni la contabilidad oficial: solo resume
los registros internos de pagos que la API tiene almacenados.

## Requisitos

- JDK 25 (compilación y ejecución).
- Maven 3.9+.
- Backend en ejecución.

## Compilación y pruebas

```bash
cd "back end/tools/java/reporte_recaudos"
mvn -q test               # 17 pruebas JUnit (sin API real)
mvn -q -DskipTests package
java -jar target/reporte-recaudos.jar --help
```

## Uso

```bash
# Opción A: token ya emitido (no se pasa como argumento)
export AUTOCOLOMBIA_TOKEN="<jwt>"
java -jar target/reporte-recaudos.jar --desde 2026-11-01 --hasta 2026-11-30

# Opción B: usuario y contraseña por entorno
export AUTOCOLOMBIA_USUARIO=operador.autoscolombia
export AUTOCOLOMBIA_PASSWORD='<contraseña>'
java -jar target/reporte-recaudos.jar --desde 2026-11-01 --hasta 2026-11-30

# Opción C: sin variables, los pide la consola (System.console/readPassword)
java -jar target/reporte-recaudos.jar --desde 2026-11-01 --hasta 2026-11-30
```

| Opción | Descripción |
|---|---|
| `--desde`, `--hasta` | Días inclusive (`AAAA-MM-DD`), en hora Bogotá (UTC-5) |
| `--base-url` | Defecto `AUTOCOLOMBIA_API_URL` o `http://127.0.0.1:3000` |
| `--salida` | Defecto `recaudos_AAAAMMDD.csv` |
| `--tamano` | Página 1-100 (defecto 100) |
| `--timeout` | Segundos por petición (defecto 20) |

El intervalo se envía al API como `desde T00:00:00-05:00` y
`hasta T23:59:59-05:00`, de modo que ambos días quedan incluidos.

## CSV generado

UTF-8 con BOM y columnas:
`fecha_corte, pago_id, comprobante, obligacion_id, periodo, cliente_id,
cliente_nombre, placa, metodo_pago, monto, fecha_hora, estado, incluido_en_total`.

- `monto` usa `BigDecimal`, sin `double`/`float`.
- `incluido_en_total` = `1` solo para pagos `confirmado`; los `anulado` quedan
  con `0` y no suman en el total de recaudos.
- Los campos de texto se sanean (prefijo `'` si empiezan por `= + - @`) para
  evitar fórmulas al abrir el archivo en una hoja de cálculo.
- La fecha de corte se informa en el CSV y en el resumen de consola.

## Seguridad

- Token solo por variable de entorno o consola; nunca por argumento visible.
- No se imprimen tokens, contraseñas ni cuerpos de error con datos personales;
  los errores muestran estado HTTP y código de negocio.
- El resumen es agregado (método y totales), no un listado de datos sensibles.

## Ejemplos ficticios

- `examples/pagos_ficticios.json`: tres pagos ficticios (dos confirmados y uno
  anulado) coherentes con `back end/seeds/001_datos_ficticios.sql`.
- `src/test/java/.../*Test.java`: 17 pruebas con datos ficticios; el cliente HTTP
  usa un servidor local de prueba y no consulta la API real.

## Limitaciones

- En consolas de Windows con página de códigos heredada (p. ej. cp850) los
  acentos de `--help` pueden verse mal; ejecute `chcp 65001` o use Windows
  Terminal. El CSV siempre se escribe en UTF-8.
- Si el API no está disponible o las credenciales fallan, la herramienta
  termina con código distinto de 0 y un mensaje; no inventa datos.
- El reporte no constituye ingreso neto bancario.
