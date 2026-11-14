package co.autoscolombia.tools.recaudos;

import java.math.BigDecimal;

/** Pago tal como lo devuelve GET /api/pagos. */
public record Pago(
        long id,
        String comprobante,
        long obligacionId,
        String periodo,
        long clienteId,
        String clienteNombre,
        String placa,
        String metodoPago,
        BigDecimal monto,
        String fechaHora,
        String estado) {

    public boolean confirmado() {
        return "confirmado".equals(estado);
    }
}
