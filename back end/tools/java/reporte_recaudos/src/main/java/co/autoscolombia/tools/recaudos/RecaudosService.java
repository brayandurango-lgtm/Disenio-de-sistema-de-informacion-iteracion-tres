package co.autoscolombia.tools.recaudos;

import java.util.ArrayList;
import java.util.List;

/** Descarga todas las páginas de pagos para un intervalo. */
public final class RecaudosService {

    public static final int MAX_PAGINAS = 10_000;

    @FunctionalInterface
    public interface PaginaFetcher {
        Pagina obtener(int pagina, int tamano) throws Exception;
    }

    private RecaudosService() {
    }

    public static List<Pago> descargar(PaginaFetcher fetcher, int tamano) throws Exception {
        List<Pago> todos = new ArrayList<>();
        int pagina = 1;
        int paginas = 1;
        while (pagina <= paginas) {
            if (pagina > MAX_PAGINAS) {
                throw new IllegalStateException(
                        "Se superó el límite de " + MAX_PAGINAS + " páginas; reduzca el intervalo");
            }
            Pagina actual = fetcher.obtener(pagina, tamano);
            if (actual == null) {
                break;
            }
            todos.addAll(actual.pagos());
            paginas = Math.max(1, actual.paginas());
            if (actual.pagos().isEmpty()) {
                break;
            }
            pagina++;
        }
        return todos;
    }
}
