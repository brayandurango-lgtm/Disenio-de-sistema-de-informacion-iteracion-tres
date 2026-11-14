package co.autoscolombia.tools.recaudos;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConfigTest {

    private static final Map<String, String> SIN_ENV = Map.of();

    @Test
    void parseaOpcionesValidas() {
        Config config = Config.parse(new String[]{
                "--desde", "2026-11-01", "--hasta", "2026-11-30",
                "--salida", "salida.csv", "--tamano", "50", "--base-url", "http://localhost:3000"
        }, SIN_ENV);

        assertEquals(LocalDate.of(2026, 11, 1), config.desde());
        assertEquals(LocalDate.of(2026, 11, 30), config.hasta());
        assertEquals(50, config.tamano());
        assertEquals("http://localhost:3000", config.baseUrl());
        assertEquals("salida.csv", config.salida().toString());
    }

    @Test
    void usaVariablesDeEntorno() {
        Config config = Config.parse(new String[]{"--desde", "2026-01-01", "--hasta", "2026-01-31"},
                Map.of("AUTOCOLOMBIA_API_URL", "https://api.ejemplo.example"));
        assertEquals("https://api.ejemplo.example", config.baseUrl());
        assertTrue(config.salida().toString().startsWith("recaudos_"));
    }

    @Test
    void rechazaRangoInvertido() {
        assertThrows(IllegalArgumentException.class, () -> Config.parse(new String[]{
                "--desde", "2026-12-01", "--hasta", "2026-11-01"}, SIN_ENV));
    }

    @Test
    void rechazaFechasYArgumentosInvalidos() {
        assertThrows(IllegalArgumentException.class, () -> Config.parse(
                new String[]{"--hasta", "2026-11-30"}, SIN_ENV));
        assertThrows(IllegalArgumentException.class, () -> Config.parse(
                new String[]{"--desde", "2026-13-01", "--hasta", "2026-11-30"}, SIN_ENV));
        assertThrows(IllegalArgumentException.class, () -> Config.parse(
                new String[]{"--desde", "2026-11-01", "--hasta", "2026-11-30", "--otro", "x"}, SIN_ENV));
        assertThrows(IllegalArgumentException.class, () -> Config.parse(
                new String[]{"--desde", "2026-11-01", "--hasta", "2026-11-30", "--tamano", "0"}, SIN_ENV));
    }
}
