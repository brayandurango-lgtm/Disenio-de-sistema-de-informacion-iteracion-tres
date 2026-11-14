package co.autoscolombia.tools.recaudos;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Cliente HTTP mínimo para la API del parqueadero. Nunca registra el token. */
public final class ApiClient {

    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();
    private final String baseUrl;
    private final Duration timeout;

    public ApiClient(String baseUrl, Duration timeout) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.timeout = timeout;
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    public String login(String usuario, String password) throws IOException, InterruptedException {
        String cuerpo = json.writeValueAsString(
                Map.of("nombre_usuario", usuario, "password", password));
        JsonNode respuesta = enviar("POST", "/api/auth/login", null, cuerpo);
        String token = respuesta.path("token").asText("");
        if (token.isBlank()) {
            throw new IllegalStateException("La API no devolvió token de acceso");
        }
        return token;
    }

    public Pagina listarPagos(String token, LocalDate desde, LocalDate hasta, int pagina, int tamano)
            throws IOException, InterruptedException {
        // El intervalo es inclusivo en días completos, hora Bogotá (UTC-5).
        String consulta = "?desde=" + enc(desde + "T00:00:00-05:00")
                + "&hasta=" + enc(hasta + "T23:59:59-05:00")
                + "&pagina=" + pagina
                + "&tamano=" + tamano;
        JsonNode respuesta = enviar("GET", "/api/pagos" + consulta, token, null);
        return parsearPagina(respuesta);
    }

    static Pagina parsearPagina(JsonNode respuesta) {
        List<Pago> pagos = new ArrayList<>();
        for (JsonNode nodo : respuesta.path("datos")) {
            pagos.add(parsearPago(nodo));
        }
        JsonNode paginacion = respuesta.path("paginacion");
        return new Pagina(
                pagos,
                paginacion.path("pagina").asInt(1),
                Math.max(1, paginacion.path("paginas").asInt(1)));
    }

    static Pago parsearPago(JsonNode nodo) {
        BigDecimal monto;
        try {
            monto = new BigDecimal(nodo.path("monto").asText("0"));
        } catch (NumberFormatException e) {
            throw new IllegalStateException("La API devolvió un monto no decimal en el pago "
                    + nodo.path("id").asLong());
        }
        return new Pago(
                nodo.path("id").asLong(),
                nodo.path("comprobante").asText(""),
                nodo.path("obligacion_id").asLong(),
                nodo.path("obligacion").path("periodo").asText(""),
                nodo.path("cliente_id").asLong(),
                nodo.path("cliente_nombre").asText(""),
                nodo.path("placa").asText(""),
                nodo.path("metodo_pago").asText(""),
                monto,
                nodo.path("fecha_hora").asText(""),
                nodo.path("estado").asText(""));
    }

    private JsonNode enviar(String metodo, String ruta, String token, String cuerpo)
            throws IOException, InterruptedException {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + ruta))
                .timeout(timeout)
                .header("Accept", "application/json")
                .header("User-Agent", "autos-colombia-reporte-recaudos/1.0");
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        if (cuerpo == null) {
            builder.method(metodo, HttpRequest.BodyPublishers.noBody());
        } else {
            builder.header("Content-Type", "application/json")
                    .method(metodo, HttpRequest.BodyPublishers.ofString(cuerpo, StandardCharsets.UTF_8));
        }

        HttpResponse<String> respuesta = http.send(
                builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        JsonNode cuerpoJson = respuesta.body().isBlank()
                ? json.createObjectNode()
                : json.readTree(respuesta.body());
        if (respuesta.statusCode() / 100 != 2) {
            String codigo = cuerpoJson.path("error").path("codigo").asText("SIN_CODIGO");
            throw new ApiException(respuesta.statusCode(), codigo);
        }
        return cuerpoJson;
    }

    private static String enc(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }
}
