package co.autoscolombia.tools.recaudos;

import java.io.IOException;

/** Error HTTP de la API; solo expone estado y código de negocio. */
public final class ApiException extends IOException {

    private final int status;
    private final String codigo;

    public ApiException(int status, String codigo) {
        super("HTTP " + status + " (" + codigo + ")");
        this.status = status;
        this.codigo = codigo;
    }

    public int status() {
        return status;
    }

    public String codigo() {
        return codigo;
    }
}
