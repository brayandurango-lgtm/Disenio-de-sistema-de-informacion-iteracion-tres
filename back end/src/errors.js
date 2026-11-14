// Errores de aplicación con código de negocio estable para el frontend.
export class AppError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export const errores = {
  validacion: (mensaje, detalles) => new AppError(400, 'VALIDACION', mensaje, detalles),
  noEncontrado: (mensaje = 'Recurso no encontrado') => new AppError(404, 'NO_ENCONTRADO', mensaje),
  duplicado: (mensaje = 'Ya existe un registro con esos datos', detalles) =>
    new AppError(409, 'DUPLICADO', mensaje, detalles),
  estadoInvalido: (mensaje, detalles) => new AppError(409, 'ESTADO_INVALIDO', mensaje, detalles),
  permisoDenegado: (mensaje = 'No tiene permisos para esta operación') =>
    new AppError(403, 'PERMISO_DENEGADO', mensaje),
  noAutenticado: (mensaje = 'Autenticación requerida') => new AppError(401, 'NO_AUTENTICADO', mensaje),
  pagoYaPagada: (mensaje, detalles) => new AppError(409, 'OBLIGACION_YA_PAGADA', mensaje, detalles),
  pagoYaRegistrado: (mensaje, detalles) => new AppError(200, 'PAGO_YA_REGISTRADO', mensaje, detalles),
  idempotenciaConflicto: (mensaje, detalles) =>
    new AppError(409, 'IDEMPOTENCIA_CONFLICTO', mensaje, detalles),
  celdaNoDisponible: (mensaje, detalles) => new AppError(409, 'CELDA_NO_DISPONIBLE', mensaje, detalles),
  conflictoConcurrencia: (mensaje = 'Conflicto de concurrencia; reintente la operación') =>
    new AppError(409, 'CONFLICTO_CONCURRENCIA', mensaje),
  demasiadosIntentos: (mensaje = 'Demasiados intentos; espere y reintente') =>
    new AppError(429, 'DEMASIADOS_INTENTOS', mensaje),
};

const MYSQL_DUPLICADO = new Set(['ER_DUP_ENTRY']);
const MYSQL_FK = new Set(['ER_NO_REFERENCED_ROW', 'ER_NO_REFERENCED_ROW_2']);

export function traducirErrorMySQL(err) {
  if (!err || typeof err.code !== 'string') return null;
  if (MYSQL_DUPLICADO.has(err.code)) {
    return errores.duplicado('Violación de unicidad', { detalle: err.sqlMessage });
  }
  if (MYSQL_FK.has(err.code)) {
    return errores.validacion('Referencia a un registro inexistente', { detalle: err.sqlMessage });
  }
  return null;
}
