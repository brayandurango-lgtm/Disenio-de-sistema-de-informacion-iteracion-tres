package co.autoscolombia.tools.recaudos;

import java.util.List;

/** Una página de GET /api/pagos. */
public record Pagina(List<Pago> pagos, int pagina, int paginas) {
}
