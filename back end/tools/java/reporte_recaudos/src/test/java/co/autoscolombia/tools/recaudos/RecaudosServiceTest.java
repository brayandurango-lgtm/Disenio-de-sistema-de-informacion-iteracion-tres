package co.autoscolombia.tools.recaudos;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RecaudosServiceTest {

    private static Pago pago(long id) {
        return new Pago(id, "CMP-2026-00000" + id, 1, "2026-11", 1, "Cliente",
                "ABC123", "efectivo", new BigDecimal("120000.00"), "2026-11-13 10:00:00", "confirmado");
    }

    @Test
    void recorreTodasLasPaginas() throws Exception {
        AtomicInteger llamadas = new AtomicInteger();
        List<Pago> resultado = RecaudosService.descargar((pagina, tamano) -> {
            llamadas.incrementAndGet();
            assertEquals(50, tamano);
            if (pagina == 1) {
                return new Pagina(List.of(pago(1), pago(2)), 1, 2);
            }
            return new Pagina(List.of(pago(3)), 2, 2);
        }, 50);

        assertEquals(List.of(1L, 2L, 3L), resultado.stream().map(Pago::id).toList());
        assertEquals(2, llamadas.get());
    }

    @Test
    void seDetieneConPaginaVacia() throws Exception {
        List<Integer> paginasPedidas = new ArrayList<>();
        List<Pago> resultado = RecaudosService.descargar((pagina, tamano) -> {
            paginasPedidas.add(pagina);
            return new Pagina(List.of(), 1, 99);
        }, 100);

        assertEquals(0, resultado.size());
        assertEquals(List.of(1), paginasPedidas);
    }

    @Test
    void conservaResultadosSiLaPaginaSiguienteEsNula() throws Exception {
        List<Integer> paginasPedidas = new ArrayList<>();
        List<Pago> resultado = RecaudosService.descargar((pagina, tamano) -> {
            paginasPedidas.add(pagina);
            return pagina == 1 ? new Pagina(List.of(pago(1)), 1, 2) : null;
        }, 50);

        assertEquals(List.of(1L), resultado.stream().map(Pago::id).toList());
        assertEquals(List.of(1, 2), paginasPedidas);
    }
}
