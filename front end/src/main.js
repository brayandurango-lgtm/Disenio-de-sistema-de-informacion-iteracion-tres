/**
 * Entry Point y Enrutador SPA — Autos Colombia
 */

import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/theme.css';

import { isAuthenticated, esAdmin, getUsuario } from './services/auth.js';
import { renderPublicHeader, renderAuthTopbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { mostrarToast } from './components/toast.js';

// Vistas
import { renderLandingView } from './views/landing.js';
import { renderLoginView } from './views/login.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderCeldasView } from './views/celdas.js';
import { renderEstanciasView } from './views/estancias.js';
import { renderClientesView } from './views/clientes.js';
import { renderVehiculosView } from './views/vehiculos.js';
import { renderContratosView } from './views/contratos.js';
import { renderPagosView } from './views/pagos.js';
import { renderUsuariosView } from './views/usuarios.js';

const appRoot = document.getElementById('app');

const TITULOS_RUTAS = {
  inicio: 'Autos Colombia — Parqueadero de Mensualidad',
  servicios: 'Servicios — Autos Colombia',
  'catalogo-demo': 'Catálogo Demostrativo — Autos Colombia',
  contacto: 'Sedes y Contacto — Autos Colombia',
  login: 'Inicio de Sesión — Autos Colombia',
  panel: 'Dashboard — Autos Colombia',
  celdas: 'Celdas y Ocupación — Autos Colombia',
  estancias: 'Entradas y Salidas — Autos Colombia',
  clientes: 'Clientes — Autos Colombia',
  vehiculos: 'Vehículos y Novedades — Autos Colombia',
  contratos: 'Contratos — Autos Colombia',
  pagos: 'Obligaciones y Pagos — Autos Colombia',
  usuarios: 'Administración de Usuarios — Autos Colombia'
};

const TITULOS_TOPBAR = {
  panel: 'Panel de Control Operativo',
  celdas: 'Celdas y Ocupación en Tiempo Real',
  estancias: 'Control de Entradas y Salidas',
  clientes: 'Gestión Integral de Clientes',
  vehiculos: 'Vehículos y Bitácora de Novedades',
  contratos: 'Contratos de Mensualidad',
  pagos: 'Gestión de Obligaciones y Recaudos',
  usuarios: 'Usuarios del Sistema y Permisos'
};

function obtenerRutaActual() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const partes = hash.split('/');
  return partes[0] || 'inicio';
}

function enrutar() {
  let ruta = obtenerRutaActual();

  // Rutas públicas
  const esRutaPublica = ['inicio', 'servicios', 'catalogo-demo', 'contacto', 'login'].includes(ruta);

  // Guardia de Autenticación
  if (!esRutaPublica && !isAuthenticated()) {
    mostrarToast('Debe iniciar sesión para acceder al área operativa.', 'warning');
    window.location.hash = '#/login';
    return;
  }

  // Si ya está autenticado e intenta ir a login, redirigir al panel
  if (ruta === 'login' && isAuthenticated()) {
    window.location.hash = '#/panel';
    return;
  }

  // Título de la página
  document.title = TITULOS_RUTAS[ruta] || 'Autos Colombia';

  // Renderizado según contexto
  appRoot.innerHTML = '';

  if (esRutaPublica) {
    // LAYOUT PÚBLICO
    const header = renderPublicHeader(ruta);
    appRoot.appendChild(header);

    let vistaNode;
    if (ruta === 'login') {
      vistaNode = renderLoginView();
    } else {
      vistaNode = renderLandingView();
    }
    appRoot.appendChild(vistaNode);

    // Scroll suave si la ruta pública apunta a una sección interna
    if (ruta === 'servicios' || ruta === 'catalogo-demo' || ruta === 'contacto') {
      setTimeout(() => {
        const sec = document.getElementById(ruta);
        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }

  } else {
    // LAYOUT AUTENTICADO (Dashboard y módulos operativos)
    const layout = document.createElement('div');
    layout.className = 'auth-layout';

    const sidebar = renderSidebar(ruta);
    const content = document.createElement('div');
    content.className = 'auth-content';

    const topbar = renderAuthTopbar(TITULOS_TOPBAR[ruta] || 'Panel Operativo');
    content.appendChild(topbar);

    let vistaNode;
    switch (ruta) {
      case 'panel':
        vistaNode = renderDashboardView();
        break;
      case 'celdas':
        vistaNode = renderCeldasView();
        break;
      case 'estancias':
        vistaNode = renderEstanciasView();
        break;
      case 'clientes':
        vistaNode = renderClientesView();
        break;
      case 'vehiculos':
        vistaNode = renderVehiculosView();
        break;
      case 'contratos':
        vistaNode = renderContratosView();
        break;
      case 'pagos':
        vistaNode = renderPagosView();
        break;
      case 'usuarios':
        vistaNode = renderUsuariosView();
        break;
      default:
        vistaNode = renderDashboardView();
    }

    content.appendChild(vistaNode);
    layout.appendChild(sidebar);
    layout.appendChild(content);
    appRoot.appendChild(layout);

    // Toggle móvil para la barra lateral
    const btnToggle = topbar.querySelector('#btn-toggle-sidebar');
    if (btnToggle && window.innerWidth <= 992) {
      btnToggle.style.display = 'inline-flex';
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }
}

// Event Listeners Globales
window.addEventListener('hashchange', enrutar);
window.addEventListener('load', enrutar);

window.addEventListener('auth:sesion_expirada', (e) => {
  mostrarToast(e.detail?.mensaje || 'Sesión vencida', 'warning');
  window.location.hash = '#/login';
});

window.addEventListener('auth:cambio', () => {
  enrutar();
});

// Inicialización
enrutar();
