-- ============================================================================
-- Autos Colombia - Datos ficticios de prueba
-- Base de datos destino: Disenio_de_sistema_de_informacion_iteracion_tres_test
-- (SOLO base de pruebas; NO aplicar a la base principal).
--
-- ADVERTENCIAS:
--   * Todos los datos son FICTICIOS. No usar datos personales reales.
--   * Contraseñas de prueba documentadas (solo para la base _test):
--       admin.autoscolombia     → 'Prueba.Admin.2026'
--       operador.autoscolombia  → 'Prueba.Operador.2026'
--     Los hash son bcrypt válidos; NUNCA reutilizar estas credenciales fuera
--     del entorno de pruebas.
--   * Aplicar DESPUÉS de 001_esquema_integrado.sql y 002_secuencias_comprobante.sql.
--   * Alternativa controlada: node src/scripts/seed-test-users.js genera las
--     credenciales sin incrustar hashes en el SQL.
--   * Los IDs se fijan explícitamente para que las relaciones sean legibles;
--     los AUTO_INCREMENT continuarán desde el máximo usado.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '-05:00';

-- --------------------------------------------------------------------------
-- Usuarios de acceso (staff del parqueadero; sin cliente asociado)
-- password_hash = bcrypt de las credenciales de prueba documentadas arriba.
-- --------------------------------------------------------------------------
INSERT INTO usuarios (id, cliente_id, nombre_usuario, correo, password_hash, rol, activo) VALUES
    (1, NULL, 'admin.autoscolombia',  'admin@autoscolombia.example',  '$2b$12$iPc4WWjsqX3BR.P.RH32f.xKeQOPUBk9hLwU.nznCBps8tEXdhDPK', 'administrador', 1),
    (2, NULL, 'operador.autoscolombia','operador@autoscolombia.example','$2b$12$HtjCiO68W7X7F7xNsjXn2.aSW.nmZ6OVO5Nl7pRICWq8FdgL/TSce', 'operador',      1);

-- --------------------------------------------------------------------------
-- Clientes (ficticios)
-- --------------------------------------------------------------------------
INSERT INTO clientes (id, nombres, apellidos, tipo_documento, numero_documento, telefono, correo, direccion) VALUES
    (1, 'Camila',   'Rojas Peña',   'CC', '1000000001', '3000000001', 'camila.rojas@correo-ficticio.example',   'Calle 10 #20-30, Bogotá'),
    (2, 'Andrés',   'Moreno Gil',   'CC', '1000000002', '3000000002', 'andres.moreno@correo-ficticio.example',   'Carrera 5 #15-40, Bogotá'),
    (3, 'Lucía',    'Cárdenas Soto','CE', '1000000003', '3000000003', 'lucia.cardenas@correo-ficticio.example',  'Diagonal 30 #10-05, Bogotá');

-- --------------------------------------------------------------------------
-- Vehículos (ficticios)
-- --------------------------------------------------------------------------
INSERT INTO vehiculos (id, cliente_id, placa, marca, modelo, anio, color) VALUES
    (1, 1, 'ABC123',  'Renault',  'Sandero',   2021, 'Blanco'),
    (2, 1, 'DEF456',  'Chevrolet','Spark GT', 2019, 'Rojo'),
    (3, 2, 'GHI789',  'Kia',      'Picanto',   2022, 'Gris'),
    (4, 3, 'JKL012',  'Mazda',    'Mazda 3',   2020, 'Azul'),
    (5, 2, 'MNO345',  'Suzuki',   'Swift',     2018, 'Negro');

-- --------------------------------------------------------------------------
-- Celdas (estado operativo; la ocupación se deriva de estancias abiertas)
-- --------------------------------------------------------------------------
INSERT INTO celdas (id, codigo, tipo, estado) VALUES
    (1,  'A-01', 'cubierta', 'habilitada'),
    (2,  'A-02', 'cubierta', 'habilitada'),
    (3,  'A-03', 'cubierta', 'habilitada'),
    (4,  'A-04', 'cubierta', 'habilitada'),
    (5,  'A-05', 'cubierta', 'fuera_de_servicio'),
    (6,  'B-01', 'techada',  'habilitada'),
    (7,  'B-02', 'techada',  'habilitada'),
    (8,  'B-03', 'techada',  'habilitada'),
    (9,  'C-01', 'techada',  'habilitada'),
    (10, 'C-02', 'techada',  'habilitada');

-- --------------------------------------------------------------------------
-- Contratos de mensualidad (importes ficticios en COP)
-- Contrato 1: vigente indefinido, inicio 2026-01-01.
-- Contrato 2: periodo cerrado 2026-01-01 a 2026-06-30.
-- Contrato 3: inicia 2026-03-01 (permite obligaciones pendientes/vencidas).
-- --------------------------------------------------------------------------
INSERT INTO contratos_mensualidad (id, vehiculo_id, cliente_id, tarifa_mensual, fecha_inicio, fecha_fin, estado) VALUES
    (1, 1, 1, 120000.00, '2026-01-01', NULL,         'activo'),
    (2, 3, 2, 150000.00, '2026-01-01', '2026-06-30', 'finalizado'),
    (3, 4, 3, 180000.00, '2026-03-01', NULL,         'activo');

-- --------------------------------------------------------------------------
-- Estancias de ejemplo
-- Estancia 1: cerrada (entrada y salida registradas).
-- Estancia 2: ABIERTA (vehículo 2 en celda B-02) — fecha_hora_salida NULL.
-- --------------------------------------------------------------------------
INSERT INTO estancias (id, vehiculo_id, celda_id, usuario_registro_id,
                       fecha_hora_entrada, fecha_hora_salida, motivo_salida) VALUES
    (1, 5, 3, 2, '2026-10-20 08:15:00', '2026-10-20 18:40:00', 'Fin de visita'),
    (2, 2, 7, 2, '2026-11-10 09:05:00', NULL,                  NULL);

-- --------------------------------------------------------------------------
-- Novedades de vehículo (registro sencillo)
-- --------------------------------------------------------------------------
INSERT INTO novedades_vehiculo (id, vehiculo_id, descripcion, fecha, responsable) VALUES
    (1, 1, 'Revisión de niveles de aceite y presión de llantas', '2026-09-15', 'Taller aliado El Roble'),
    (2, 3, 'Cambio de bombillos delanteros',                     '2026-10-02', 'Carlos Mendoza (propietario)');

-- --------------------------------------------------------------------------
-- Obligaciones de pago
-- Contrato 1 (tarifa 120000):
--   oct-2026 pagada, nov-2026 pendiente, dic-2026 pendiente.
-- Contrato 2 (tarifa 150000, fin 2026-06-30): todos los periodos pagados.
-- Contrato 3 (tarifa 180000, inicio 2026-03-01):
--   sep-2026 vencida y pendiente (alerta de mora), oct-2026 pendiente,
--   nov-2026 pendiente (periodo futuro ya facturable).
-- --------------------------------------------------------------------------
INSERT INTO obligaciones_pago (id, contrato_id, periodo, importe, fecha_vencimiento, estado) VALUES
    (1,  1, '2026-10', 120000.00, '2026-11-05', 'pagada'),
    (2,  1, '2026-11', 120000.00, '2026-12-05', 'pendiente'),
    (3,  1, '2026-12', 120000.00, '2027-01-05', 'pendiente'),
    (4,  2, '2026-04', 150000.00, '2026-05-05', 'pagada'),
    (5,  2, '2026-05', 150000.00, '2026-06-05', 'pagada'),
    (6,  2, '2026-06', 150000.00, '2026-07-05', 'pagada'),
    (7,  3, '2026-09', 180000.00, '2026-10-05', 'pendiente'), -- vencida: genera alerta
    (8,  3, '2026-10', 180000.00, '2026-11-05', 'pendiente'),
    (9,  3, '2026-11', 180000.00, '2026-12-05', 'pendiente');

-- --------------------------------------------------------------------------
-- Pagos (coherentes con las obligaciones 'pagada')
-- Pago 1: obligación 1, efectivo, confirmado.
-- Pago 2: obligación 4, transferencia, confirmado.
-- Pago 3: obligación 5, efectivo, ANULADO (ejemplo de corrección:
--         la obligación 5 sigue 'pagada' porque el pago 4 la cubre).
-- Pago 4: obligación 5, transferencia, confirmado (nuevo pago tras anulación).
-- Pago 5: obligación 6, efectivo, confirmado.
-- --------------------------------------------------------------------------
INSERT INTO pagos (id, identificador, comprobante, obligacion_id, metodo_pago,
                   monto, moneda, fecha_hora, usuario_registro_id,
                   clave_idempotencia, estado,
                   motivo_anulacion, anulado_por_id, anulado_en) VALUES
    (1, '11111111-1111-4111-8111-111111111111', 'CMP-2026-000001', 1, 'efectivo',
        120000.00, 'COP', '2026-10-28 10:30:00', 2,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'confirmado',
        NULL, NULL, NULL),
    (2, '22222222-2222-4222-8222-222222222222', 'CMP-2026-000002', 4, 'transferencia',
        150000.00, 'COP', '2026-05-02 15:10:00', 2,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'confirmado',
        NULL, NULL, NULL),
    (3, '33333333-3333-4333-8333-333333333333', 'CMP-2026-000003', 5, 'efectivo',
        150000.00, 'COP', '2026-06-01 09:00:00', 2,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'anulado',
        'Monto registrado con billete equivocado; se re-registra', 1, '2026-06-02 11:00:00'),
    (4, '44444444-4444-4444-8444-444444444444', 'CMP-2026-000004', 5, 'transferencia',
        150000.00, 'COP', '2026-06-02 11:05:00', 2,
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'confirmado',
        NULL, NULL, NULL),
    (5, '55555555-5555-4555-8555-555555555555', 'CMP-2026-000005', 6, 'efectivo',
        150000.00, 'COP', '2026-06-30 16:45:00', 2,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'confirmado',
        NULL, NULL, NULL);

-- --------------------------------------------------------------------------
-- Auditoría de ejemplo (opcional, coherente con los pagos)
-- --------------------------------------------------------------------------
INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle) VALUES
    ('pago', 3, 'anular', 1, JSON_OBJECT('motivo', 'Monto registrado con billete equivocado; se re-registra', 'pago_sustituto', 4));
