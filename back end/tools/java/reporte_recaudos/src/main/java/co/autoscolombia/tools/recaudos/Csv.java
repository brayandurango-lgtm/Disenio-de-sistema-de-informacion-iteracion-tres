package co.autoscolombia.tools.recaudos;

import java.io.BufferedWriter;
import java.io.IOException;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/** Exportación CSV segura (UTF-8 con BOM, sin fórmulas). */
public final class Csv {

    public static final List<String> COLUMNAS = List.of(
            "fecha_corte", "pago_id", "comprobante", "obligacion_id", "periodo",
            "cliente_id", "cliente_nombre", "placa", "metodo_pago", "monto",
            "fecha_hora", "estado", "incluido_en_total");

    private Csv() {
    }

    public static void escribir(Path ruta, List<Pago> pagos, LocalDate corte) throws IOException {
        if (ruta.getParent() != null) {
            Files.createDirectories(ruta.getParent());
        }
        try (BufferedWriter out = Files.newBufferedWriter(ruta, StandardCharsets.UTF_8)) {
            out.write('\uFEFF');
            out.write(String.join(",", COLUMNAS));
            out.newLine();
            for (Pago pago : pagos) {
                out.write(linea(pago, corte));
                out.newLine();
            }
        }
    }

    public static String linea(Pago pago, LocalDate corte) {
        String monto = pago.monto()
                .setScale(Math.max(2, pago.monto().scale()), RoundingMode.UNNECESSARY)
                .toPlainString();
        List<String> valores = List.of(
                corte.toString(),
                Long.toString(pago.id()),
                pago.comprobante(),
                Long.toString(pago.obligacionId()),
                pago.periodo(),
                Long.toString(pago.clienteId()),
                pago.clienteNombre(),
                pago.placa(),
                pago.metodoPago(),
                monto,
                pago.fechaHora(),
                pago.estado(),
                pago.confirmado() ? "1" : "0");
        return valores.stream().map(Csv::campo).collect(Collectors.joining(","));
    }

    static String campo(String valor) {
        String texto = valor == null ? "" : valor;
        if (!texto.isEmpty() && "=+-@\t\r".indexOf(texto.charAt(0)) >= 0) {
            texto = "'" + texto;
        }
        if (texto.indexOf(',') >= 0 || texto.indexOf('"') >= 0
                || texto.indexOf('\n') >= 0 || texto.indexOf('\r') >= 0) {
            texto = '"' + texto.replace("\"", "\"\"") + '"';
        }
        return texto;
    }
}
