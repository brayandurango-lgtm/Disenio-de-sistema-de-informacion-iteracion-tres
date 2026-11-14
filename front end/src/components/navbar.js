/**
 * Componentes de Cabecera: Pública y Autenticada
 */

import logoSvg from '../assets/illustrations/logo.svg';
import { getUsuario, logout } from '../services/auth.js';
import { api } from '../services/api.js';

export function renderPublicHeader(rutaActual = 'inicio') {
  const header = document.createElement('header');
  header.className = 'public-header';

  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: var(--space-md);">
      <button type="button" id="btn-toggle-public-menu" class="btn btn-secondary btn-sm mobile-menu-btn" aria-label="Abrir menú de navegación" aria-expanded="false">
        <span aria-hidden="true">☰</span>
      </button>

      <a href="#/inicio" class="brand-wrapper" aria-label="Ir a inicio de Autos Colombia">
        <img src="${logoSvg}" alt="Emblema Autos Colombia" class="brand-logo" width="38" height="38" />
        <div>
          <div class="brand-title">
            Autos Colombia
            <span class="brand-tag">Cyber</span>
          </div>
        </div>
      </a>
    </div>

    <nav class="public-nav" id="public-navbar-menu" aria-label="Navegación principal">
      <a href="#/inicio" class="public-nav-link ${rutaActual === 'inicio' ? 'active' : ''}">Inicio</a>
      <a href="#/servicios" class="public-nav-link ${rutaActual === 'servicios' ? 'active' : ''}">Servicios</a>
      <a href="#/catalogo-demo" class="public-nav-link ${rutaActual === 'catalogo-demo' ? 'active' : ''}">Catálogo Demo</a>
      <a href="#/contacto" class="public-nav-link ${rutaActual === 'contacto' ? 'active' : ''}">Sedes y Contacto</a>
    </nav>

    <div class="public-actions">
      <a href="#/login" class="btn btn-primary btn-sm">
        <span aria-hidden="true">🔐</span> Acceso al Sistema
      </a>
    </div>
  `;

  // Toggle para navegación móvil
  const btnToggle = header.querySelector('#btn-toggle-public-menu');
  const navMenu = header.querySelector('#public-navbar-menu');
  if (btnToggle && navMenu) {
    btnToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      btnToggle.setAttribute('aria-expanded', String(isOpen));
      btnToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    });

    // Cerrar menú al hacer clic en un enlace
    navMenu.querySelectorAll('.public-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        btnToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  return header;
}

export function renderAuthTopbar(tituloModulo = 'Panel Principal') {
  const topbar = document.createElement('header');
  topbar.className = 'auth-topbar';

  const usuario = getUsuario();
  const rol = usuario?.rol || 'operador';

  topbar.innerHTML = `
    <div class="topbar-left">
      <button type="button" id="btn-toggle-sidebar" class="btn btn-secondary btn-sm mobile-menu-btn" aria-label="Alternar menú lateral" aria-expanded="false" style="display: none;">
        <span aria-hidden="true">☰</span>
      </button>
      <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">${tituloModulo}</h2>
    </div>

    <div class="topbar-right">
      <div id="indicador-servidor" class="status-pill" title="Estado de la conexión con el backend">
        <span class="status-dot" id="dot-servidor"></span>
        <span id="texto-servidor" style="font-size: 0.775rem;">Verificando...</span>
      </div>

      <div class="user-badge">
        <span aria-hidden="true" style="font-size: 0.9rem;">👤</span>
        <span class="user-name">${usuario?.nombre_usuario || 'Usuario'}</span>
        <span class="badge ${rol === 'administrador' ? 'badge-violet' : 'badge-info'}" style="font-size: 0.675rem;">
          ${rol}
        </span>
      </div>

      <button type="button" id="btn-logout" class="btn btn-secondary btn-sm" title="Cerrar sesión actual">
        <span aria-hidden="true">🚪</span> Salir
      </button>
    </div>
  `;

  // Listener para cerrar sesión
  topbar.querySelector('#btn-logout').addEventListener('click', () => {
    logout();
    window.location.hash = '#/login';
  });

  // Verificación asíncrona de salud del backend
  const dot = topbar.querySelector('#dot-servidor');
  const txt = topbar.querySelector('#texto-servidor');
  api.saludDb()
    .then((res) => {
      if (res && res.db === 'conectada') {
        dot.className = 'status-dot online';
        txt.textContent = 'En línea (MySQL)';
      } else {
        dot.className = 'status-dot offline';
        txt.textContent = 'BD no disponible';
      }
    })
    .catch(() => {
      dot.className = 'status-dot offline';
      txt.textContent = 'Sin conexión';
    });

  return topbar;
}
