package co.autoscolombia.tools.recaudos;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CsvTest {

    private static Pago pago(String cliente, String monto, String estado) {
        return new Pago(6, "CMP-2026-000006", 2, "2026-11", 1, cliente,
                "ABC123", "efectivo", new BigDecimal(monto), "2026-11-13 10:30:00", estado);
    }

    @Test
    void sanitizaFormulasYComas() {
        assertEquals("'=1+1", Csv.campo("=1+1"));
        assertEquals("'+34", Csv.campo("+34"));
        assertEquals("\"Rojas, Camila\"", Csv.campo("Rojas, Camila"));
        assertEquals("\"dice \"\"hola\"\"\"", Csv.campo("dice \"hola\""));
    }

    @Test
    void neutralizaOtrosPrefijosDeFormula() {
        assertEquals("'-123", Csv.campo("-123"));
        assertEquals("'@SUM(A1:A2)", Csv.campo("@SUM(A1:A2)"));
        assertEquals("'\t=1+1", Csv.campo("\t=1+1"));
        assertEquals("\"'\r=1+1\"", Csv.campo("\r=1+1"));
    }

    @Test
    void lineaIncluyeEstadoYColumnas() {
        String linea = Csv.linea(pago("Rojas, Camila", "120000.00", "confirmado"), LocalDate.of(2026, 11, 13));
        assertTrue(linea.startsWith("2026-11-13,6,CMP-2026-000006,2,2026-11,1,\"Rojas, Camila\",ABC123"));
        assertTrue(linea.endsWith(",120000.00,2026-11-13 10:30:00,confirmado,1"));
        assertEquals(Csv.COLUMNAS.size(), linea.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)").length);
    }

    @Test
    void escribeCabeceraConBom(@TempDir Path directorio) throws Exception {
        Path archivo = directorio.resolve("recaudos.csv");
        Csv.escribir(archivo, List.of(pago("Camila", "120000.00", "confirmado")), LocalDate.of(2026, 11, 13));
        String contenido = Files.readString(archivo, StandardCharsets.UTF_8);
        assertTrue(contenido.startsWith("\uFEFFfecha_corte,pago_id,comprobante"));
        assertTrue(contenido.contains("\n2026-11-13,6,"));
    }
}
