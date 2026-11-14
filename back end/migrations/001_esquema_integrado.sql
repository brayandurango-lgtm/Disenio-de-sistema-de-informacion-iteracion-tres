-- ============================================================================
-- Autos Colombia - Esquema integrado de base de datos
-- Iteración 3 (reconstrucción de las iteraciones 1, 2 y 3)
-- Base de datos destino: Disenio_de_sistema_de_informacion_iteracion_tres
-- Motor: MySQL 8.0+ / InnoDB / utf8mb4
--
-- ADVERTENCIAS:
--   * Este script NO contiene instrucciones destructivas (sin DROP, TRUNCATE,
--     ALTER destructivo ni DELETE).
--   * NO usar "CREATE TABLE IF NOT EXISTS" como sustituto de verificación:
--     antes de aplicarlo, inspeccionar la base y confirmar que ninguna de las
--     tablas listadas existe previamente. Si existen tablas con esos nombres
--     y estructuras distintas, DETENERSE y revisar diferencias con el equipo.
--   * Este script NO ha sido ejecutado en esta etapa del proyecto.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '-05:00'; -- America/Bogota: UTC-5 fijo, Colombia no aplica horario de verano.

-- ----------------------------------------------------------------------------
-- I2: CLIENTES (persona natural/jurídica que registra vehículos; NO es la
-- cuenta de acceso al sistema)
-- ----------------------------------------------------------------------------
CREATE TABLE clientes (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres           VARCHAR(80)  NOT NULL,
    apellidos         VARCHAR(80)  NOT NULL,
    tipo_documento    ENUM('CC','CE','PA','NIT','TI') NOT NULL DEFAULT 'CC',
    numero_documento  VARCHAR(20)  NOT NULL,
    telefono          VARCHAR(30)  NULL,
    correo            VARCHAR(120) NULL,
    direccion         VARCHAR(160) NULL,
    creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clientes_documento (tipo_documento, numero_documento),
    KEY idx_clientes_nombre (apellidos, nombres)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I2: USUARIOS (cuentas de acceso al sistema; separadas del cliente)
-- password_hash se genera en un bloque posterior con un mecanismo seguro
-- (bcrypt/argon2). Nunca texto plano.
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id      BIGINT UNSIGNED NULL,          -- NULL si es staff del parqueadero
    nombre_usuario  VARCHAR(50)  NOT NULL,
    correo          VARCHAR(120) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    rol             ENUM('administrador','operador') NOT NULL DEFAULT 'operador',
    activo          TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_nombre (nombre_usuario),
    UNIQUE KEY uq_usuarios_correo (correo),
    CONSTRAINT fk_usuarios_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I1: VEHÍCULOS (un cliente puede tener varios)
-- ----------------------------------------------------------------------------
CREATE TABLE vehiculos (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id   BIGINT UNSIGNED NOT NULL,
    placa        VARCHAR(10)  NOT NULL,
    marca        VARCHAR(50)  NOT NULL,
    modelo       VARCHAR(50)  NOT NULL,
    anio         SMALLINT UNSIGNED NULL,
    color        VARCHAR(30)  NULL,
    creado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vehiculos_placa (placa),
    KEY idx_vehiculos_cliente (cliente_id),
    CONSTRAINT fk_vehiculos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I1: NOVEDADES DEL VEHÍCULO (registro sencillo: descripción, fecha,
-- responsable. No es un módulo de mantenimiento)
-- ----------------------------------------------------------------------------
CREATE TABLE novedades_vehiculo (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehiculo_id  BIGINT UNSIGNED NOT NULL,
    descripcion  VARCHAR(300) NOT NULL,
    fecha        DATE         NOT NULL,
    responsable  VARCHAR(120) NOT NULL,
    creado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_novedades_vehiculo (vehiculo_id, fecha),
    CONSTRAINT fk_novedades_vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I2: CELDAS (compartidas; estado operativo ≠ ocupación)
-- estado: habilitada | fuera_de_servicio
-- La ocupación NO se guarda aquí: se deriva de estancias abiertas.
-- ----------------------------------------------------------------------------
CREATE TABLE celdas (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo     VARCHAR(10) NOT NULL,
    tipo       ENUM('cubierta','techada') NOT NULL DEFAULT 'cubierta',
    estado     ENUM('habilitada','fuera_de_servicio') NOT NULL DEFAULT 'habilitada',
    creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_celdas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I1: ESTANCIAS (movimientos de entrada y salida)
-- Reglas:
--   * Una estancia abierta tiene fecha_hora_salida = NULL.
--   * Un vehículo no puede tener dos estancias abiertas.
--   * Una celda no puede tener dos estancias abiertas.
--   * Al cerrar la estancia se libera la ocupación.
-- Se implementa con columnas generadas + UNIQUE:
--   vehiculo_ocupado_id / celda_ocupada_id valen el id mientras la estancia
--   está abierta y NULL cuando está cerrada. MySQL permite múltiples NULL en
--   un índice UNIQUE, por lo que el índice solo colisiona entre estancias
--   abiertas del mismo vehículo/celda. Esto protege también ante concurrencia.
-- ----------------------------------------------------------------------------
CREATE TABLE estancias (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehiculo_id           BIGINT UNSIGNED NOT NULL,
    celda_id              BIGINT UNSIGNED NOT NULL,
    usuario_registro_id   BIGINT UNSIGNED NOT NULL,
    fecha_hora_entrada    DATETIME NOT NULL,
    fecha_hora_salida     DATETIME NULL,
    motivo_salida         VARCHAR(200) NULL,
    creado_en             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vehiculo_ocupado_id   BIGINT UNSIGNED GENERATED ALWAYS AS
        (IF(fecha_hora_salida IS NULL, vehiculo_id, NULL)) STORED,
    celda_ocupada_id      BIGINT UNSIGNED GENERATED ALWAYS AS
        (IF(fecha_hora_salida IS NULL, celda_id, NULL)) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_estancia_vehiculo_abierta (vehiculo_ocupado_id),
    UNIQUE KEY uq_estancia_celda_abierta    (celda_ocupada_id),
    KEY idx_estancias_vehiculo (vehiculo_id, fecha_hora_entrada),
    KEY idx_estancias_celda   (celda_id, fecha_hora_salida),
    CONSTRAINT fk_estancias_vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id),
    CONSTRAINT fk_estancias_celda
        FOREIGN KEY (celda_id) REFERENCES celdas (id),
    CONSTRAINT fk_estancias_usuario
        FOREIGN KEY (usuario_registro_id) REFERENCES usuarios (id),
    CONSTRAINT chk_estancia_fechas
        CHECK (fecha_hora_salida IS NULL OR fecha_hora_salida >= fecha_hora_entrada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I3: CONTRATOS DE MENSUALIDAD
-- Un contrato corresponde a UN vehículo y a UN cliente responsable.
-- La tarifa queda congelada en el contrato; las obligaciones generadas
-- conservan su propio importe aunque la tarifa cambie después.
-- Vigencia: fecha_inicio (inclusive) a fecha_fin (inclusive) o NULL = sin fin.
-- Regla de negocio (en servicio/transacción, no en DDL): no permitir dos
-- contratos con periodos superpuestos para el mismo vehículo.
-- ----------------------------------------------------------------------------
CREATE TABLE contratos_mensualidad (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehiculo_id      BIGINT UNSIGNED NOT NULL,
    cliente_id       BIGINT UNSIGNED NOT NULL,  -- cliente responsable del pago
    tarifa_mensual   DECIMAL(12,2) NOT NULL,
    fecha_inicio     DATE NOT NULL,             -- primer día del mes facturable
    fecha_fin        DATE NULL,                 -- NULL = vigente indefinidamente
    estado           ENUM('activo','finalizado','cancelado') NOT NULL DEFAULT 'activo',
    creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contratos_vehiculo (vehiculo_id, estado),
    KEY idx_contratos_cliente (cliente_id),
    CONSTRAINT fk_contratos_vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id),
    CONSTRAINT fk_contratos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT chk_contratos_tarifa CHECK (tarifa_mensual > 0),
    CONSTRAINT chk_contratos_fechas
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I3: OBLIGACIONES DE PAGO (lo que se debe; separado del pago)
-- periodo = mes calendario 'YYYY-MM'. fecha_vencimiento: día de corte acordado
-- (p. ej. día 5 del mes siguiente); se fija al generar la obligación.
-- UNIQUE(contrato_id, periodo) impide duplicar la obligación del mismo mes.
-- ----------------------------------------------------------------------------
CREATE TABLE obligaciones_pago (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    contrato_id         BIGINT UNSIGNED NOT NULL,
    periodo             CHAR(7)      NOT NULL,   -- 'YYYY-MM'
    importe             DECIMAL(12,2) NOT NULL,
    fecha_vencimiento   DATE         NOT NULL,
    estado              ENUM('pendiente','pagada') NOT NULL DEFAULT 'pendiente',
    creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_obligacion_periodo (contrato_id, periodo),
    KEY idx_obligaciones_estado_venc (estado, fecha_vencimiento),
    CONSTRAINT fk_obligaciones_contrato
        FOREIGN KEY (contrato_id) REFERENCES contratos_mensualidad (id),
    CONSTRAINT chk_obligacion_importe CHECK (importe > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- I3: PAGOS (registro manual del operador; NO confirma recepción bancaria)
--
-- Estrategia de integridad (ver docs/contrato-api-propuesto.md y pendientes):
--   * identificador: UUID público del pago (API).
--   * comprobante: consecutivo interno legible 'CMP-AAAA-NNNNNN'.
--   * clave_idempotencia: UUID generado por el cliente (frontend) por cada
--     intento de pago; UNIQUE impide registrar dos veces el mismo envío
--     (doble clic / reintento). Si llega duplicado, se devuelve el pago ya
--     registrado, no un error ambiguo.
--   * obligacion_valida_id: columna generada = obligacion_id solo cuando el
--     pago está 'confirmado' (NULL si está 'anulado'). UNIQUE garantiza a
--     nivel de BD que solo existe UN pago válido por obligación, incluso bajo
--     concurrencia. Permite un nuevo pago tras anular el anterior.
--   * La actualización pago + obligación corre en UNA transacción con
--     SELECT ... FOR UPDATE sobre la obligación.
-- ----------------------------------------------------------------------------
CREATE TABLE pagos (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    identificador         CHAR(36)     NOT NULL,           -- UUID público
    comprobante           VARCHAR(30)  NOT NULL,           -- CMP-AAAA-NNNNNN
    obligacion_id         BIGINT UNSIGNED NOT NULL,
    metodo_pago           ENUM('efectivo','transferencia') NOT NULL,
    monto                 DECIMAL(12,2) NOT NULL,
    moneda                CHAR(3)      NOT NULL DEFAULT 'COP',
    fecha_hora            DATETIME     NOT NULL,           -- hora local Bogotá
    usuario_registro_id   BIGINT UNSIGNED NOT NULL,
    clave_idempotencia    CHAR(36)     NOT NULL,           -- UUID del cliente
    estado                ENUM('confirmado','anulado') NOT NULL DEFAULT 'confirmado',
    motivo_anulacion      VARCHAR(300) NULL,
    anulado_por_id        BIGINT UNSIGNED NULL,
    anulado_en            DATETIME     NULL,
    creado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    obligacion_valida_id  BIGINT UNSIGNED GENERATED ALWAYS AS
        (IF(estado = 'confirmado', obligacion_id, NULL)) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pagos_identificador (identificador),
    UNIQUE KEY uq_pagos_comprobante (comprobante),
    UNIQUE KEY uq_pagos_idempotencia (clave_idempotencia),
    UNIQUE KEY uq_pagos_un_valido_por_obligacion (obligacion_valida_id),
    KEY idx_pagos_obligacion (obligacion_id),
    KEY idx_pagos_fecha (fecha_hora),
    CONSTRAINT fk_pagos_obligacion
        FOREIGN KEY (obligacion_id) REFERENCES obligaciones_pago (id),
    CONSTRAINT fk_pagos_usuario_registro
        FOREIGN KEY (usuario_registro_id) REFERENCES usuarios (id),
    CONSTRAINT fk_pagos_usuario_anula
        FOREIGN KEY (anulado_por_id) REFERENCES usuarios (id),
    CONSTRAINT chk_pagos_monto CHECK (monto > 0),
    CONSTRAINT chk_pagos_anulacion CHECK (
        (estado = 'confirmado' AND motivo_anulacion IS NULL)
        OR (estado = 'anulado'   AND motivo_anulacion IS NOT NULL
            AND anulado_por_id IS NOT NULL AND anulado_en IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TRAZABILIDAD: registro de operaciones relevantes (altas, cambios de estado,
-- anulaciones, generación de obligaciones). No sustituye a las tablas de
-- negocio; las complementa para auditoría.
-- ----------------------------------------------------------------------------
CREATE TABLE auditoria_operaciones (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    entidad     VARCHAR(50)  NOT NULL,   -- 'pago', 'obligacion', 'estancia', ...
    entidad_id  BIGINT UNSIGNED NOT NULL,
    accion      VARCHAR(50)  NOT NULL,   -- 'crear','pagar','anular','cerrar', ...
    usuario_id  BIGINT UNSIGNED NULL,
    detalle     JSON         NULL,
    creado_en   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_auditoria_entidad (entidad, entidad_id),
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
