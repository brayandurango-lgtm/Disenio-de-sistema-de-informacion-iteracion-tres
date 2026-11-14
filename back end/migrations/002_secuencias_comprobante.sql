-- ============================================================================
-- Autos Colombia - Migración 002: secuencia de comprobantes de pago
-- Base de datos destino: Disenio_de_sistema_de_informacion_iteracion_tres
-- Motor: MySQL 8.0+ / InnoDB
--
-- Propósito: consecutivo interno 'CMP-AAAA-NNNNNN' por año, generado dentro
-- de la transacción del pago con INSERT ... ON DUPLICATE KEY UPDATE +
-- SELECT ... FOR UPDATE sobre la fila del año. Evita MAX(numero)+1, que no es
-- seguro bajo concurrencia.
--
-- ADVERTENCIAS:
--   * No destructiva (CREATE TABLE nuevo).
--   * Verificar antes que la tabla no exista con otra estructura.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE secuencias_comprobante (
    anio    SMALLINT UNSIGNED NOT NULL,
    ultimo  INT UNSIGNED       NOT NULL DEFAULT 0,
    PRIMARY KEY (anio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
