# Diccionario de datos — Autos Colombia

Convenciones: `PK` clave primaria, `FK` clave foránea, `UQ` único,
`NN` no nulo. Montos en COP con `DECIMAL(12,2)`; se exponen como cadena.
Fechas `AAAA-MM-DD`; periodos `AAAA-MM`; instantes ISO 8601 con offset
`-05:00` (America/Bogota).

## clientes
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | autoincremental |
| nombres / apellidos | VARCHAR(80) NN | texto libre |
| tipo_documento | ENUM('CC','CE','PA','NIT','TI') NN | default 'CC' |
| numero_documento | VARCHAR(20) NN | UQ con tipo_documento |
| telefono / correo / direccion | VARCHAR NN opcional | correo con formato válido en servicio |
| creado_en | DATETIME NN | default CURRENT_TIMESTAMP |

## usuarios (cuentas de acceso)
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| cliente_id | BIGINT UNSIGNED FK→clientes NULL | NULL = staff del parqueadero |
| nombre_usuario | VARCHAR(50) UQ | login |
| correo | VARCHAR(120) UQ | |
| password_hash | VARCHAR(255) NN | hash seguro; nunca texto plano (bloque pendiente) |
| rol | ENUM('administrador','operador') NN | default 'operador' |
| activo | TINYINT(1) NN | default 1; desactivar ≠ borrar |
| creado_en | DATETIME NN | |

## vehiculos
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| cliente_id | BIGINT UNSIGNED FK→clientes NN | propietario |
| placa | VARCHAR(10) UQ | normalizada en servicio (mayúsculas, sin espacios) |
| marca / modelo / color | VARCHAR NN / opcional | |
| anio | SMALLINT UNSIGNED NULL | rango razonable en servicio |
| creado_en | DATETIME NN | |

## novedades_vehiculo
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| vehiculo_id | FK→vehiculos NN | |
| descripcion | VARCHAR(300) NN | |
| fecha | DATE NN | fecha del hecho, no de registro |
| responsable | VARCHAR(120) NN | quién atendió la novedad |
| creado_en | DATETIME NN | |

## celdas
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| codigo | VARCHAR(10) UQ | p. ej. 'A-01' |
| tipo | ENUM('cubierta','techada') NN | default 'cubierta' |
| estado | ENUM('habilitada','fuera_de_servicio') NN | operativo; ocupación se deriva de estancias |
| creado_en | DATETIME NN | |

## estancias
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| vehiculo_id | FK→vehiculos NN | |
| celda_id | FK→celdas NN | celda habilitada y libre al registrar |
| usuario_registro_id | FK→usuarios NN | operador que registró |
| fecha_hora_entrada | DATETIME NN | instante de entrada |
| fecha_hora_salida | DATETIME NULL | NULL = estancia abierta |
| motivo_salida | VARCHAR(200) NULL | opcional |
| creado_en | DATETIME NN | |
| vehiculo_ocupado_id / celda_ocupada_id | generadas STORED | UQ: una estancia abierta por vehículo/celda |

## contratos_mensualidad
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| vehiculo_id | FK→vehiculos NN | |
| cliente_id | FK→clientes NN | cliente responsable del pago |
| tarifa_mensual | DECIMAL(12,2) NN | CHECK > 0; congelada por contrato |
| fecha_inicio | DATE NN | debe ser día 1 de mes (servicio) |
| fecha_fin | DATE NULL | último día de mes o NULL = indefinido |
| estado | ENUM('activo','finalizado','cancelado') NN | |
| creado_en | DATETIME NN | |

## obligaciones_pago
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| contrato_id | FK→contratos_mensualidad NN | |
| periodo | CHAR(7) NN | 'YYYY-MM'; UQ con contrato_id |
| importe | DECIMAL(12,2) NN | CHECK > 0; copia de la tarifa al generar |
| fecha_vencimiento | DATE NN | p. ej. día 5 del mes siguiente |
| estado | ENUM('pendiente','pagada') NN | 'vencida' es derivada, no almacenada |
| creado_en | DATETIME NN | |

## pagos
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| identificador | CHAR(36) UQ | UUID público del pago |
| comprobante | VARCHAR(30) UQ | 'CMP-AAAA-NNNNNN', consecutivo interno (no factura) |
| obligacion_id | FK→obligaciones_pago NN | |
| metodo_pago | ENUM('efectivo','transferencia') NN | |
| monto | DECIMAL(12,2) NN | = importe de la obligación; lo fija el servidor |
| moneda | CHAR(3) NN | default 'COP' |
| fecha_hora | DATETIME NN | hora Bogotá del registro |
| usuario_registro_id | FK→usuarios NN | operador |
| clave_idempotencia | CHAR(36) UQ | UUID generado por el cliente por intento |
| estado | ENUM('confirmado','anulado') NN | default 'confirmado' |
| motivo_anulacion | VARCHAR(300) NULL | obligatorio si anulado (CHECK) |
| anulado_por_id | FK→usuarios NULL | obligatorio si anulado |
| anulado_en | DATETIME NULL | obligatorio si anulado |
| creado_en | DATETIME NN | |
| obligacion_valida_id | generada STORED | UQ: un solo pago confirmado por obligación |

## secuencias_comprobante (migración 002)
| Columna | Tipo | Regla |
|---|---|---|
| anio | SMALLINT UNSIGNED PK | año del pago (hora Bogotá) |
| ultimo | INT UNSIGNED NN | último consecutivo entregado; se incrementa con bloqueo de fila en la transacción del pago |

## auditoria_operaciones
| Columna | Tipo | Regla |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| entidad / entidad_id | VARCHAR(50) / BIGINT UNSIGNED NN | objeto auditado |
| accion | VARCHAR(50) NN | 'crear','pagar','anular','cerrar','generar_obligaciones', ... |
| usuario_id | FK→usuarios NULL | quien ejecutó |
| detalle | JSON NULL | contexto variable |
| creado_en | DATETIME(3) NN | orden preciso de eventos |
