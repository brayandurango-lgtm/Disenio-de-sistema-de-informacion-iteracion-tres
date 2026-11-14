package co.autoscolombia.tools.recaudos;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ApiClientTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void interpretaUnPagoDelApi() throws Exception {
        JsonNode nodo = json.readTree("""
                {
                  "id": 6,
                  "identificador": "9f1b2c3d-1111-4111-8111-111111111111",
                  "comprobante": "CMP-2026-000006",
                  "obligacion_id": 2,
                  "metodo_pago": "efectivo",
                  "monto": "120000.00",
                  "moneda": "COP",
                  "fecha_hora": "2026-11-13 10:30:00",
                  "estado": "confirmado",
                  "obligacion": { "periodo": "2026-11" },
                  "contrato_id": 1,
                  "vehiculo_id": 1,
                  "placa": "ABC123",
                  "cliente_id": 1,
                  "cliente_nombre": "Camila Rojas"
                }
                """);

        Pago pago = ApiClient.parsearPago(nodo);

        assertEquals(6, pago.id());
        assertEquals("CMP-2026-000006", pago.comprobante());
        assertEquals("2026-11", pago.periodo());
        assertEquals("Camila Rojas", pago.clienteNombre());
        assertEquals("ABC123", pago.placa());
        assertEquals(new BigDecimal("120000.00"), pago.monto());
        assertEquals(true, pago.confirmado());
    }

    @Test
    void interpretaLaPaginacion() throws Exception {
        JsonNode nodo = json.readTree("""
                { "datos": [], "paginacion": { "pagina": 3, "tamano": 50, "total": 120, "paginas": 3 } }
                """);
        Pagina pagina = ApiClient.parsearPagina(nodo);
        assertEquals(3, pagina.pagina());
        assertEquals(3, pagina.paginas());
        assertEquals(0, pagina.pagos().size());
    }

    @Test
    void rechazaMontoNoDecimal() throws Exception {
        JsonNode nodo = json.readTree("""
                { "id": 1, "monto": "abc", "obligacion": {} }
                """);
        assertThrows(IllegalStateException.class, () -> ApiClient.parsearPago(nodo));
    }

    @Test
    void convierteErrorHttpEnErrorSanitizado() throws Exception {
        HttpServer servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/api/auth/login", intercambio -> {
            byte[] cuerpo = """
                    {"error":{"codigo":"CREDENCIALES_INVALIDAS","mensaje":"Detalle sensible"}}
                    """.getBytes(StandardCharsets.UTF_8);
            intercambio.getResponseHeaders().set("Content-Type", "application/json");
            intercambio.sendResponseHeaders(401, cuerpo.length);
            try (var salida = intercambio.getResponseBody()) {
                salida.write(cuerpo);
            }
        });
        servidor.start();

        try {
            ApiClient api = new ApiClient(
                    "http://127.0.0.1:" + servidor.getAddress().getPort(), Duration.ofSeconds(2));

            ApiException error = assertThrows(
                    ApiException.class, () -> api.login("usuario", "secreto"));

            assertEquals(401, error.status());
            assertEquals("CREDENCIALES_INVALIDAS", error.codigo());
            assertEquals("HTTP 401 (CREDENCIALES_INVALIDAS)", error.getMessage());
            assertFalse(error.getMessage().contains("Detalle sensible"));
        } finally {
            servidor.stop(0);
        }
    }
}
