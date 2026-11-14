package co.autoscolombia.tools.recaudos;

import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/** Argumentos y variables de entorno de la herramienta. */
public record Config(
        String baseUrl,
        LocalDate desde,
        LocalDate hasta,
        Path salida,
        int tamano,
        long timeoutSegundos) {

    public static final ZoneOffset BOGOTA = ZoneOffset.ofHours(-5);
    public static final int TAMANO_MAXIMO = 100;
    public static final long DIAS_MAXIMOS = 366L * 5;

    private static final String AYUDA = """
            Reporte de recaudos de Autos Colombia (herramienta auxiliar).

            Uso:
              java -jar reporte-recaudos.jar --desde AAAA-MM-DD --hasta AAAA-MM-DD [opciones]

            Opciones:
              --desde FECHA        Día inicial (inclusive, hora Bogotá)
              --hasta FECHA        Día final (inclusive, hora Bogotá)
              --base-url URL       API (defecto: AUTOCOLOMBIA_API_URL o http://127.0.0.1:3000)
              --salida ARCHIVO.csv (defecto: recaudos_AAAAMMDD.csv)
              --tamano N           Tamaño de página 1-100 (defecto 100)
              --timeout SEGUNDOS   Tiempo máximo por petición (defecto 20)
              --help               Muestra esta ayuda

            Autenticación (nunca por argumento de línea de comandos):
              AUTOCOLOMBIA_TOKEN                JWT ya emitido
              AUTOCOLOMBIA_USUARIO / AUTOCOLOMBIA_PASSWORD   login contra /api/auth/login
              Si no hay variables, se piden por consola (System.console).
            """;

    public static String ayuda() {
        return AYUDA;
    }

    public static Config parse(String[] args, Map<String, String> env) {
        Set<String> permitidas = Set.of(
                "--desde", "--hasta", "--base-url", "--salida", "--tamano", "--timeout");
        Map<String, String> opciones = new HashMap<>();
        for (int i = 0; i < args.length; i++) {
            String arg = args[i];
            if (!arg.startsWith("--") || !permitidas.contains(arg)) {
                throw new IllegalArgumentException("Argumento no reconocido: " + arg);
            }
            if (i + 1 >= args.length) {
                throw new IllegalArgumentException("Falta el valor de " + arg);
            }
            opciones.put(arg, args[++i]);
        }

        String baseUrl = opciones.getOrDefault("--base-url",
                env.getOrDefault("AUTOCOLOMBIA_API_URL", "http://127.0.0.1:3000").trim());
        if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
            throw new IllegalArgumentException("--base-url debe iniciar con http:// o https://");
        }

        LocalDate desde = fecha(opciones.get("--desde"), "--desde");
        LocalDate hasta = fecha(opciones.get("--hasta"), "--hasta");
        if (hasta.isBefore(desde)) {
            throw new IllegalArgumentException("--hasta no puede ser anterior a --desde");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) > DIAS_MAXIMOS) {
            throw new IllegalArgumentException("El intervalo excede " + DIAS_MAXIMOS + " días");
        }

        int tamano = entero(opciones.getOrDefault("--tamano", "100"), "--tamano");
        if (tamano < 1 || tamano > TAMANO_MAXIMO) {
            throw new IllegalArgumentException("--tamano debe estar entre 1 y " + TAMANO_MAXIMO);
        }
        long timeout = entero(opciones.getOrDefault("--timeout", "20"), "--timeout");
        if (timeout < 1 || timeout > 300) {
            throw new IllegalArgumentException("--timeout debe estar entre 1 y 300 segundos");
        }

        String salida = opciones.getOrDefault("--salida",
                "recaudos_" + LocalDate.now(BOGOTA).toString().replace("-", "") + ".csv");
        if (salida.isBlank()) {
            throw new IllegalArgumentException("--salida no puede estar vacío");
        }

        return new Config(baseUrl, desde, hasta, Path.of(salida), tamano, timeout);
    }

    private static LocalDate fecha(String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException("Falta " + campo + " (formato AAAA-MM-DD)");
        }
        try {
            return LocalDate.parse(valor);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(campo + " inválido: se espera AAAA-MM-DD");
        }
    }

    private static int entero(String valor, String campo) {
        try {
            return Integer.parseInt(valor);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(campo + " debe ser un entero");
        }
    }
}
