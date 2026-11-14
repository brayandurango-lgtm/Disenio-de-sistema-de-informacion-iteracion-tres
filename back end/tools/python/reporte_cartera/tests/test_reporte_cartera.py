import csv
import json
import os
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

import reporte_cartera as rc  # noqa: E402


def cargar_fixture():
    with open(RAIZ / "tests" / "fixtures" / "obligaciones_ficticias.json", encoding="utf-8") as f:
        return json.load(f)


class ValidacionTests(unittest.TestCase):
    def test_validar_periodo(self):
        self.assertEqual(rc.validar_periodo("2026-9", "p"), "2026-09")
        self.assertIsNone(rc.validar_periodo(None, "p"))
        for malo in ("2026-13", "26-11", "2026-1", "2026-11-01", "abcd"):
            with self.assertRaises(ValueError):
                rc.validar_periodo(malo, "p")

    def test_validar_rango(self):
        rc.validar_rango("2026-01", "2026-12")
        with self.assertRaises(ValueError):
            rc.validar_rango("2026-12", "2026-01")
        with self.assertRaises(ValueError):
            rc.validar_rango("2000-01", "2026-01")


class SanitizacionTests(unittest.TestCase):
    def test_sanear_texto_evita_formulas(self):
        self.assertEqual(rc.sanear_texto("=1+1"), "'=1+1")
        self.assertEqual(rc.sanear_texto("+34"), "'+34")
        self.assertEqual(rc.sanear_texto("-2"), "'-2")
        self.assertEqual(rc.sanear_texto("@cmd"), "'@cmd")
        self.assertEqual(rc.sanear_texto("Camila"), "Camila")
        self.assertEqual(rc.sanear_texto(None), "")

    def test_importe_decimal_exacto(self):
        self.assertEqual(rc.importe_decimal("120000.5"), Decimal("120000.50"))
        with self.assertRaises(ValueError):
            rc.importe_decimal("abc")
        with self.assertRaises(ValueError):
            rc.importe_decimal("-1")

    def test_construir_fila(self):
        fila = rc.construir_fila(cargar_fixture()[0], "2026-11-13")
        self.assertEqual(list(fila.keys()), rc.COLUMNAS)
        self.assertEqual(fila["fecha_corte"], "2026-11-13")
        self.assertEqual(fila["importe"], "180000.00")
        self.assertEqual(fila["estado_efectivo"], "vencida")


class FiltrosYtotalesTests(unittest.TestCase):
    def test_filtra_pagadas_y_rango(self):
        datos = cargar_fixture()
        deuda = rc.filtrar_y_ordenar(datos, None, None, incluir_pagadas=False)
        self.assertEqual([o["id"] for o in deuda], [2, 7])  # ordenado por cliente
        solo_octubre = rc.filtrar_y_ordenar(datos, "2026-10", "2026-10", incluir_pagadas=True)
        self.assertEqual([o["id"] for o in solo_octubre], [1])

    def test_totalizar(self):
        totales = rc.totalizar(cargar_fixture())
        self.assertEqual(totales["pendiente"], Decimal("120000.00"))
        self.assertEqual(totales["vencida"], Decimal("180000.00"))
        self.assertEqual(totales["pagada"], Decimal("120000.00"))
        self.assertEqual(totales["deuda"], Decimal("300000.00"))
        self.assertEqual(totales["total"], Decimal("420000.00"))


class DescargaTests(unittest.TestCase):
    def test_pagina_hasta_ultima(self):
        llamadas = []

        def falso_http(metodo, url, **kwargs):
            llamadas.append(url)
            if "pagina=1" in url:
                return {"datos": [{"id": 1}], "paginacion": {"pagina": 1, "paginas": 2}}
            return {"datos": [{"id": 2}], "paginacion": {"pagina": 2, "paginas": 2}}

        datos = list(rc.descargar_obligaciones(
            "http://api", "token", desde="2026-01", hasta="2026-12", tamano=50, http=falso_http))
        self.assertEqual([d["id"] for d in datos], [1, 2])
        self.assertEqual(len(llamadas), 2)
        self.assertIn("periodo_desde=2026-01", llamadas[0])
        self.assertIn("tamano=50", llamadas[0])

    def test_token_desde_entorno_no_se_imprime(self):
        with patch.dict(os.environ, {"AUTOCOLOMBIA_TOKEN": "token-ficticio"}, clear=False):
            self.assertEqual(rc.obtener_token("http://api"), "token-ficticio")


class CsvTests(unittest.TestCase):
    def test_escribe_csv_con_bom_y_columnas(self):
        filas = [rc.construir_fila(o, "2026-11-13") for o in cargar_fixture()]
        with tempfile.TemporaryDirectory() as tmp:
            ruta = os.path.join(tmp, "salida.csv")
            escritas = rc.escribir_csv(ruta, filas)
            self.assertEqual(escritas, 3)
            with open(ruta, encoding="utf-8-sig", newline="") as f:
                lector = list(csv.DictReader(f))
            self.assertEqual(list(lector[0].keys()), rc.COLUMNAS)
            self.assertEqual(lector[0]["fecha_corte"], "2026-11-13")


if __name__ == "__main__":
    unittest.main()
