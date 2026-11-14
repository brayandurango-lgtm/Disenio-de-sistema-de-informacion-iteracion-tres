#!/usr/bin/env python3
"""Reporte de cartera de Autos Colombia.

Herramienta auxiliar de consola: consulta la API (JWT Bearer), pagina las
obligaciones de pago y exporta un CSV con los saldos por obligación.

No escribe en MySQL, no reimplementa reglas de negocio y no calcula estados:
usa el estado efectivo y el importe que devuelve la API.

Uso típico:
    export AUTOCOLOMBIA_USUARIO=operador.autoscolombia   # o AUTOCOLOMBIA_TOKEN
    python reporte_cartera.py --periodo-desde 2026-09 --periodo-hasta 2026-11

El token NUNCA se recibe como argumento de línea de comandos ni se imprime.
"""

from __future__ import annotations

import argparse
import csv
import getpass
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, Iterable, Iterator

BASE_URL_DEFECTO = "http://127.0.0.1:3000"
TAMANO_DEFECTO = 100
TAMANO_MAXIMO = 100
MAX_PAGINAS = 10_000

COLUMNAS = [
    "fecha_corte",
    "cliente_id",
    "cliente_nombre",
    "contrato_id",
    "vehiculo_id",
    "placa",
    "obligacion_id",
    "periodo",
    "fecha_vencimiento",
    "importe",
    "estado_registrado",
    "estado_efectivo",
]


class ErrorApi(RuntimeError):
    """Error de comunicación o de negocio devuelto por la API."""


# ---------------------------------------------------------------------------
# Utilidades puras (probadas sin red)
# ---------------------------------------------------------------------------

def hoy_bogota() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=-5)).date().isoformat()


def validar_periodo(valor: str | None, campo: str) -> str | None:
    if valor is None or valor == "":
        return None
    partes = valor.split("-")
    if len(partes) != 2 or len(partes[0]) != 4 or not 1 <= len(partes[1]) <= 2:
        raise ValueError(f"{campo} inválido: se espera 'AAAA-MM'")
    anio, mes = partes
    if not (anio.isdigit() and mes.isdigit()) or not 1 <= int(mes) <= 12:
        raise ValueError(f"{campo} inválido: se espera 'AAAA-MM' con mes 01-12")
    return f"{int(anio):04d}-{int(mes):02d}"


def meses_entre(desde: str, hasta: str) -> int:
    a1, m1 = (int(x) for x in desde.split("-"))
    a2, m2 = (int(x) for x in hasta.split("-"))
    return (a2 * 12 + m2) - (a1 * 12 + m1)


def validar_rango(desde: str | None, hasta: str | None) -> None:
    if desde and hasta:
        if hasta < desde:
            raise ValueError("periodo_hasta no puede ser anterior a periodo_desde")
        if meses_entre(desde, hasta) > 239:
            raise ValueError("el rango de periodos excede 240 meses")


def sanear_texto(valor: Any) -> str:
    """Evita inyección de fórmulas al abrir el CSV en una hoja de cálculo.

    Si el valor empieza por = + - @ (o tab/CR) se prefija con apóstrofo.
    """
    if valor is None:
        return ""
    texto = str(valor)
    if texto and texto[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + texto
    return texto


def importe_decimal(valor: Any, campo: str = "importe") -> Decimal:
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"{campo} no es un decimal válido: {valor!r}") from exc
    if numero < 0:
        raise ValueError(f"{campo} negativo: {valor!r}")
    return numero.quantize(Decimal("0.01"))


def construir_fila(obligacion: dict, corte: str) -> dict:
    """Proyección de una obligación del API a una fila del CSV."""
    return {
        "fecha_corte": corte,
        "cliente_id": sanear_texto(obligacion.get("cliente_id")),
        "cliente_nombre": sanear_texto(obligacion.get("cliente_nombre")),
        "contrato_id": sanear_texto(obligacion.get("contrato_id")),
        "vehiculo_id": sanear_texto(obligacion.get("vehiculo_id")),
        "placa": sanear_texto(obligacion.get("placa")),
        "obligacion_id": sanear_texto(obligacion.get("id")),
        "periodo": sanear_texto(obligacion.get("periodo")),
        "fecha_vencimiento": sanear_texto(obligacion.get("fecha_vencimiento")),
        "importe": str(importe_decimal(obligacion.get("importe"))),
        "estado_registrado": sanear_texto(obligacion.get("estado")),
        "estado_efectivo": sanear_texto(obligacion.get("estado_efectivo")),
    }


def en_rango(periodo: str, desde: str | None, hasta: str | None) -> bool:
    if desde and periodo < desde:
        return False
    if hasta and periodo > hasta:
        return False
    return True


def filtrar_y_ordenar(
    obligaciones: Iterable[dict],
    desde: str | None,
    hasta: str | None,
    incluir_pagadas: bool,
) -> list[dict]:
    filas = []
    for ob in obligaciones:
        if not en_rango(str(ob.get("periodo", "")), desde, hasta):
            continue
        if not incluir_pagadas and ob.get("estado_efectivo") == "pagada":
            continue
        filas.append(ob)
    filas.sort(key=lambda o: (
        str(o.get("cliente_nombre") or ""),
        str(o.get("periodo") or ""),
        int(o.get("id") or 0),
    ))
    return filas


def totalizar(obligaciones: Iterable[dict]) -> dict[str, Decimal]:
    totales = {"pendiente": Decimal("0.00"), "vencida": Decimal("0.00"), "pagada": Decimal("0.00")}
    for ob in obligaciones:
        estado = str(ob.get("estado_efectivo") or "pendiente")
        if estado not in totales:
            raise ValueError(f"estado_efectivo desconocido: {estado!r}")
        totales[estado] += importe_decimal(ob.get("importe"))
    totales["total"] = sum((totales[k] for k in ("pendiente", "vencida", "pagada")), Decimal("0.00"))
    totales["deuda"] = totales["pendiente"] + totales["vencida"]
    return {k: v.quantize(Decimal("0.01")) for k, v in totales.items()}


# ---------------------------------------------------------------------------
# Cliente HTTP mínimo (stdlib)
# ---------------------------------------------------------------------------

def _leer_json(respuesta) -> dict:
    crudo = respuesta.read().decode("utf-8")
    try:
        return json.loads(crudo) if crudo else {}
    except json.JSONDecodeError as exc:
        raise ErrorApi("La API devolvió una respuesta que no es JSON") from exc


def http_json(
    metodo: str,
    url: str,
    *,
    token: str | None = None,
    cuerpo: dict | None = None,
    timeout: float = 20.0,
) -> dict:
    datos = None
    cabeceras = {"Accept": "application/json", "User-Agent": "autos-colombia-reporte-cartera/1.0"}
    if cuerpo is not None:
        datos = json.dumps(cuerpo).encode("utf-8")
        cabeceras["Content-Type"] = "application/json"
    if token:
        cabeceras["Authorization"] = f"Bearer {token}"
    peticion = urllib.request.Request(url, data=datos, headers=cabeceras, method=metodo)
    try:
        with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
            return _leer_json(respuesta)
    except urllib.error.HTTPError as exc:
        try:
            detalle = _leer_json(exc)
        except Exception:  # noqa: BLE001 - mensaje genérico, sin cuerpo sensible
            detalle = {}
        codigo = (detalle.get("error") or {}).get("codigo", "SIN_CODIGO")
        raise ErrorApi(f"HTTP {exc.code} ({codigo}) al llamar a {url}") from exc
    except urllib.error.URLError as exc:
        raise ErrorApi(f"No se pudo conectar con la API en {url}: {exc.reason}") from exc


def obtener_token(base_url: str, http: Callable[..., dict] = http_json) -> str:
    token = os.environ.get("AUTOCOLOMBIA_TOKEN", "").strip()
    if token:
        return token
    usuario = os.environ.get("AUTOCOLOMBIA_USUARIO", "").strip()
    if not usuario:
        usuario = input("Usuario (no se registra): ").strip()
    password = os.environ.get("AUTOCOLOMBIA_PASSWORD")
    if not password:
        password = getpass.getpass("Contraseña: ")
    if not usuario or not password:
        raise ErrorApi("Credenciales vacías: defina AUTOCOLOMBIA_USUARIO/AUTOCOLOMBIA_PASSWORD o AUTOCOLOMBIA_TOKEN")
    respuesta = http(
        "POST",
        f"{base_url.rstrip('/')}/api/auth/login",
        cuerpo={"nombre_usuario": usuario, "password": password},
    )
    token = (respuesta or {}).get("token")
    if not token:
        raise ErrorApi("La API no devolvió token de acceso")
    return str(token)


def descargar_obligaciones(
    base_url: str,
    token: str,
    *,
    desde: str | None,
    hasta: str | None,
    tamano: int = TAMANO_DEFECTO,
    http: Callable[..., dict] = http_json,
) -> Iterator[dict]:
    pagina = 1
    while pagina <= MAX_PAGINAS:
        parametros = {"pagina": pagina, "tamano": tamano}
        if desde:
            parametros["periodo_desde"] = desde
        if hasta:
            parametros["periodo_hasta"] = hasta
        url = f"{base_url.rstrip('/')}/api/obligaciones?{urllib.parse.urlencode(parametros)}"
        respuesta = http("GET", url, token=token)
        datos = respuesta.get("datos") or []
        for ob in datos:
            yield ob
        paginacion = respuesta.get("paginacion") or {}
        paginas = int(paginacion.get("paginas") or 1)
        if not datos or pagina >= paginas:
            return
        pagina += 1
    raise ErrorApi(f"Se superó el límite de {MAX_PAGINAS} páginas; refine los filtros")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def escribir_csv(ruta: str, filas: Iterable[dict]) -> int:
    contador = 0
    with open(ruta, "w", encoding="utf-8-sig", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS)
        escritor.writeheader()
        for fila in filas:
            escritor.writerow(fila)
            contador += 1
    return contador


def parsear_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Exporta la cartera (obligaciones pendientes/vencidas) a CSV usando la API.",
    )
    parser.add_argument("--base-url", default=os.environ.get("AUTOCOLOMBIA_API_URL", BASE_URL_DEFECTO))
    parser.add_argument("--periodo-desde", help="Periodo inicial 'AAAA-MM' (inclusive)")
    parser.add_argument("--periodo-hasta", help="Periodo final 'AAAA-MM' (inclusive)")
    parser.add_argument(
        "--salida",
        default="reporte_cartera_"
        + (datetime.now(timezone.utc) + timedelta(hours=-5)).strftime("%Y%m%d")
        + ".csv",
    )
    parser.add_argument("--tamano", type=int, default=TAMANO_DEFECTO)
    parser.add_argument("--incluir-pagadas", action="store_true",
                        help="Incluye obligaciones ya pagadas (por defecto solo deuda)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parsear_args(argv)
    try:
        desde = validar_periodo(args.periodo_desde, "periodo_desde")
        hasta = validar_periodo(args.periodo_hasta, "periodo_hasta")
        validar_rango(desde, hasta)
        if not 1 <= args.tamano <= TAMANO_MAXIMO:
            raise ValueError(f"tamano debe estar entre 1 y {TAMANO_MAXIMO}")

        token = obtener_token(args.base_url)
        obligaciones = list(filtrar_y_ordenar(
            descargar_obligaciones(args.base_url, token, desde=desde, hasta=hasta, tamano=args.tamano),
            desde, hasta, args.incluir_pagadas,
        ))
        corte = hoy_bogota()
        filas = (construir_fila(ob, corte) for ob in obligaciones)
        escritas = escribir_csv(args.salida, filas)
        totales = totalizar(obligaciones)

        print(f"Fecha de corte: {corte} (America/Bogota, UTC-5)", file=sys.stderr)
        print(f"Filas exportadas: {escritas} → {args.salida}", file=sys.stderr)
        print(f"Deuda (pendiente + vencida): {totales['deuda']} COP", file=sys.stderr)
        print(f"  pendiente: {totales['pendiente']}  vencida: {totales['vencida']}", file=sys.stderr)
        if args.incluir_pagadas:
            print(f"  pagada: {totales['pagada']}", file=sys.stderr)
        return 0
    except (ValueError, ErrorApi) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
