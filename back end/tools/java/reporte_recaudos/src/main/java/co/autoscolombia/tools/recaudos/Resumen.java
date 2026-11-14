package co.autoscolombia.tools.recaudos;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Resumen de recaudos: separa pagos confirmados y anulados.
 * No representa ingreso neto bancario ni contabilidad oficial.
 */
public record Resumen(
        int confirmados,
        BigDecimal totalConfirmados,
        int anulados,
        BigDecimal totalAnulados,
        Map<String, BigDecimal> confirmadosPorMetodo) {

    public static Resumen calcular(List<Pago> pagos) {
        int nConfirmados = 0;
        int nAnulados = 0;
        BigDecimal totalConfirmados = BigDecimal.ZERO;
        BigDecimal totalAnulados = BigDecimal.ZERO;
        Map<String, BigDecimal> porMetodo = new TreeMap<>();

        for (Pago pago : pagos) {
            if (pago.confirmado()) {
                nConfirmados++;
                totalConfirmados = totalConfirmados.add(pago.monto());
                porMetodo.merge(pago.metodoPago(), pago.monto(), BigDecimal::add);
            } else {
                nAnulados++;
                totalAnulados = totalAnulados.add(pago.monto());
            }
        }
        return new Resumen(
                nConfirmados,
                escala(totalConfirmados),
                nAnulados,
                escala(totalAnulados),
                Map.copyOf(new TreeMap<>(porMetodo)));
    }

    public BigDecimal totalRegistrado() {
        return totalConfirmados.add(totalAnulados);
    }

    private static BigDecimal escala(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.UNNECESSARY);
    }
}
