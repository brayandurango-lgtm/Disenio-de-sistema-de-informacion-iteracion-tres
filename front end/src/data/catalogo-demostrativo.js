/**
 * Catálogo Demostrativo de Vehículos — Alcance Exclusivamente Visual
 * 
 * NOTA ACADÉMICA Y TÉCNICA:
 * Este catálogo responde a la solicitud visual de demostración.
 * Los datos son estrictamente locales y ficticios. No forman parte
 * del modelo operativo del parqueadero ni constituyen una oferta comercial real.
 * No interactúa con la base de datos MySQL ni con el módulo de pagos de mensualidad.
 */

const automovilSvg = new URL('../assets/illustrations/automovil.svg', import.meta.url).href;
const motocicletaSvg = new URL('../assets/illustrations/motocicleta.svg', import.meta.url).href;
const camionetaSvg = new URL('../assets/illustrations/camioneta.svg', import.meta.url).href;
const busSvg = new URL('../assets/illustrations/bus.svg', import.meta.url).href;
const camionSvg = new URL('../assets/illustrations/camion.svg', import.meta.url).href;

export const VEHICULOS_DEMO = [
  {
    id: 'demo-auto-01',
    nombre: 'Cyber Sedán Aero 2026',
    tipo: 'Automóvil',
    ilustracion: automovilSvg,
    especificaciones: [
      'Motorización eléctrica dual',
      'Autonomía estimada 520 km',
      'Asistente de parqueo autónomo',
      'Frenos regenerativos ABS'
    ],
    precioIlustrativoCOP: 145000000,
    precioFormateado: '$145.000.00 COP',
    etiqueta: 'Demostración Ilustrativa',
    descripcion: 'Diseño aerodinámico conceptual para transporte urbano de alta eficiencia energética.'
  },
  {
    id: 'demo-moto-02',
    nombre: 'Cyber Volt Urban Bike',
    tipo: 'Motocicleta',
    ilustracion: motocicletaSvg,
    especificaciones: [
      'Batería ion-litio extraíble',
      'Chasis tubular ultraligero',
      'Iluminación LED full neon',
      'Conectividad telemetry HUD'
    ],
    precioIlustrativoCOP: 28500000,
    precioFormateado: '$28.500.00 COP',
    etiqueta: 'Demostración Ilustrativa',
    descripcion: 'Agilidad y respuesta instantánea para la movilidad urbana rápida y sostenible.'
  },
  {
    id: 'demo-suv-03',
    nombre: 'Cyber Titan SUV 4x4',
    tipo: 'Camioneta',
    ilustracion: camionetaSvg,
    especificaciones: [
      'Tracción total inteligente AWD',
      'Capacidad para 7 pasajeros',
      'Suspensión neumática adaptativa',
      'Blindaje de carrocería nivel urbano'
    ],
    precioIlustrativoCOP: 235000000,
    precioFormateado: '$235.000.00 COP',
    etiqueta: 'Demostración Ilustrativa',
    descripcion: 'Espacio, robustez y máxima seguridad para trayectos familiares y fuera de carretera.'
  },
  {
    id: 'demo-bus-04',
    nombre: 'Cyber Transit Coach 45',
    tipo: 'Bus',
    ilustracion: busSvg,
    especificaciones: [
      'Capacidad 45 pasajeros sentados',
      'Plataforma baja accesible',
      'Climatización bioclimática',
      'Puertas dobles automáticas'
    ],
    precioIlustrativoCOP: 480000000,
    precioFormateado: '$480.000.00 COP',
    etiqueta: 'Demostración Ilustrativa',
    descripcion: 'Unidad de transporte de pasajeros diseñada para corredores masivos interurbanos.'
  },
  {
    id: 'demo-truck-05',
    nombre: 'Cyber Hauler Prime 30T',
    tipo: 'Camión',
    ilustracion: camionSvg,
    especificaciones: [
      'Capacidad de carga útil 30 Toneladas',
      'Tren motriz híbrido de alto torque',
      'Cabina con litera ergonómica',
      'Monitoreo satelital de flotas'
    ],
    precioIlustrativoCOP: 620000000,
    precioFormateado: '$620.000.00 COP',
    etiqueta: 'Demostración Ilustrativa',
    descripcion: 'Transporte de carga pesada con máxima capacidad de arrastre para logística nacional.'
  }
];
