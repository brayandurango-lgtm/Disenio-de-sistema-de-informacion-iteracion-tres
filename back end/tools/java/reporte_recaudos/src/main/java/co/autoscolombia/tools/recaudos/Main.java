package co.autoscolombia.tools.recaudos;

import java.io.Console;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Punto de entrada de la herramienta auxiliar de recaudos. */
public final class Main {

    private Main() {
    }

    public static void main(String[] args) {
        if (Arrays.asList(args).contains("--help") || Arrays.asList(args).contains("-h")) {
            System.out.println(Config.ayuda());
            return;
        }
        try {
            Config config = Config.parse(args, System.getenv());
            ApiClient api = new ApiClient(config.baseUrl(), Duration.ofSeconds(config.timeoutSegundos()));
            String token = obtenerToken(api, System.getenv(), System.console());

            List<Pago> pagos = RecaudosService.descargar(
                    (pagina, tamano) -> api.listarPagos(
                            token, config.desde(), config.hasta(), pagina, tamano),
                    config.tamano());

            LocalDate corte = LocalDate.now(Config.BOGOTA);
            Csv.escribir(config.salida(), pagos, corte);
            imprimirResumen(Resumen.calcular(pagos), config, corte);
        } catch (IllegalArgumentException e) {
            System.err.println("Error: " + e.getMessage());
            System.err.println("Use --help para ver las opciones.");
            System.exit(2);
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }

    static String obtenerToken(ApiClient api, Map<String, String> env, Console consola) throws Exception {
        String token = env.getOrDefault("AUTOCOLOMBIA_TOKEN", "").trim();
        if (!token.isEmpty()) {
            return token;
        }
        String usuario = env.getOrDefault("AUTOCOLOMBIA_USUARIO", "").trim();
        if (usuario.isEmpty()) {
            if (consola == null) {
                throw new IllegalStateException(
                        "Defina AUTOCOLOMBIA_TOKEN o AUTOCOLOMBIA_USUARIO/AUTOCOLOMBIA_PASSWORD");
            }
            usuario = consola.readLine("Usuario: ").trim();
        }
        String password = env.get("AUTOCOLOMBIA_PASSWORD");
        if (password == null || password.isEmpty()) {
            if (consola == null) {
                throw new IllegalStateException(
                        "Defina AUTOCOLOMBIA_PASSWORD o ejecute en una consola interactiva");
            }
            char[] leida = consola.readPassword("Contraseña: ");
            password = new String(leida);
            Arrays.fill(leida, '\0');
        }
        if (usuario.isEmpty() || password.isEmpty()) {
            throw new IllegalStateException("Credenciales vacías");
        }
        return api.login(usuario, password);
    }

    private static void imprimirResumen(Resumen resumen, Config config, LocalDate corte) {
        System.out.println("Fecha de corte: " + corte + " (America/Bogota, UTC-5)");
        System.out.println("Intervalo consultado: " + config.desde() + " a " + config.hasta());
        System.out.println("Pagos descargados: "
                + (resumen.confirmados() + resumen.anulados())
                + " (confirmados: " + resumen.confirmados()
                + ", anulados: " + resumen.anulados() + ")");
        System.out.println("Total confirmados: " + resumen.totalConfirmados().toPlainString() + " COP");
        System.out.println("Total anulados: " + resumen.totalAnulados().toPlainString() + " COP");
        if (!resumen.confirmadosPorMetodo().isEmpty()) {
            StringBuilder detalle = new StringBuilder("Confirmados por método:");
            resumen.confirmadosPorMetodo().forEach(
                    (metodo, total) -> detalle.append(' ').append(metodo)
                            .append('=').append(total.toPlainString()));
            System.out.println(detalle);
        }
        System.out.println("CSV: " + config.salida().toAbsolutePath());
        System.out.println("Aviso: registros internos de pagos; no es conciliación "
                + "bancaria ni contabilidad oficial.");
    }
}
