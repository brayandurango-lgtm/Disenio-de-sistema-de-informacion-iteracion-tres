/**
 * Configuración Central de Sedes y Canales de Contacto
 * 
 * NOTA ACADÉMICA Y TÉCNICA:
 * No se han confirmado datos comerciales reales (direcciones, números telefónicos
 * o cuentas de mensajería). Para evitar la invención de datos que puedan
 * pertenecer a terceros o mapas falsos, esta configuración centralizada
 * expone el estado oficial de forma transparente.
 */

export const CONFIG_CONTACTO_Y_SEDES = {
  nombreComercial: 'Autos Colombia — Gestión de Parqueadero',
  conceptoVisual: 'Automóvil Cyber Colombia',
  estadoConfirmacion: 'Pendiente de confirmación por la administración',
  
  canales: {
    telefono: {
      estado: 'pendiente',
      mensaje: 'Línea de atención telefónica pendiente de asignación oficial'
    },
    correo: {
      estado: 'academico',
      valor: 'contacto@autoscolombia.example',
      nota: 'Buzón demostrativo académico'
    },
    horarioAtencion: {
      estado: 'operativo',
      valor: 'Lunes a Domingo — Servicio 24 Horas para abonados de mensualidad'
    }
  },

  sedes: [
    {
      id: 'sede-principal',
      nombre: 'Sede Principal (En proceso de habilitación)',
      ciudad: 'Bogotá D.C., Colombia',
      direccion: 'Ubicación física pendiente de confirmar por la administración',
      capacidadEstimada: '10 Celdas de parqueo (cubiertas y techadas)',
      estado: 'En preparación operativa'
    }
  ],

  politicas: {
    facturacion: 'Los comprobantes emitidos corresponden a recibos internos numerados de control de mensualidad (CMP-AAAA-NNNNNN), no a facturación electrónica tributaria.',
    mensualidades: 'La gestión de mensualidad cubre periodos calendario (YYYY-MM) con fechas de vencimiento parametrizadas.'
  }
};
