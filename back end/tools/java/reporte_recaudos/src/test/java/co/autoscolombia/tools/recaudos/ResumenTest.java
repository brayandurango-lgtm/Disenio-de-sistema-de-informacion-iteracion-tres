package co.autoscolombia.tools.recaudos;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ResumenTest {

    private static Pago pago(String monto, String metodo, String estado) {
        return new Pago(1, "CMP-2026-000001", 10, "2026-11", 3, "Cliente",
                "ABC123", metodo, new BigDecimal(monto), "2026-11-13 10:00:00", estado);
    }

    @Test
    void separaConfirmadosYAnulados() {
        Resumen r = Resumen.calcular(List.of(
                pago("120000.00", "efectivo", "confirmado"),
                pago("150000.50", "transferencia", "confirmado"),
                pago("150000.00", "efectivo", "anulado")));

        assertEquals(2, r.confirmados());
        assertEquals(1, r.anulados());
        assertEquals(new BigDecimal("270000.50"), r.totalConfirmados());
        assertEquals(new BigDecimal("150000.00"), r.totalAnulados());
        assertEquals(new BigDecimal("420000.50"), r.totalRegistrado());
        assertEquals(new BigDecimal("120000.00"), r.confirmadosPorMetodo().get("efectivo"));
    }

    @Test
    void sumaDecimalesSinFloat() {
        Resumen r = Resumen.calcular(List.of(
                pago("0.10", "efectivo", "confirmado"),
                pago("0.20", "efectivo", "confirmado")));
        assertEquals(new BigDecimal("0.30"), r.totalConfirmados());
    }
}
