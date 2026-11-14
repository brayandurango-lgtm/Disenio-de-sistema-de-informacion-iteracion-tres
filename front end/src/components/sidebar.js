/**
 * Menú Lateral de Navegación Autenticada (Sidebar)
 */

import logoSvg from '../assets/illustrations/logo.svg';
import { esAdmin } from '../services/auth.js';

export function renderSidebar(moduloActual = 'panel') {
  const sidebar = document.createElement('aside');
  sidebar.className = 'auth-sidebar';
  sidebar.setAttribute('aria-label', 'Menú de navegación operativa');

  const admin = esAdmin();

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <img src="${logoSvg}" alt="Emblema Autos Colombia" width="32" height="32" />
      <div>
        <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); line-height: 1.1;">
          Autos Colombia
        </div>
        <div style="font-size: 0.7rem; color: var(--accent-violet-light); font-weight: 600;">
          Gestión de Parqueadero
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <a href="#/panel" class="sidebar-link ${moduloActual === 'panel' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">📊</span>
        <span>Dashboard</span>
      </a>

      <a href="#/celdas" class="sidebar-link ${moduloActual === 'celdas' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">🅿</span>
        <span>Celdas y Ocupación</span>
      </a>

      <a href="#/estancias" class="sidebar-link ${moduloActual === 'estancias' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">🔄</span>
        <span>Entradas y Salidas</span>
      </a>

      <a href="#/clientes" class="sidebar-link ${moduloActual === 'clientes' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">👥</span>
        <span>Clientes</span>
      </a>

      <a href="#/vehiculos" class="sidebar-link ${moduloActual === 'vehiculos' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">🚗</span>
        <span>Vehículos y Novedades</span>
      </a>

      <a href="#/contratos" class="sidebar-link ${moduloActual === 'contratos' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">📄</span>
        <span>Contratos</span>
      </a>

      <a href="#/pagos" class="sidebar-link ${moduloActual === 'pagos' ? 'active' : ''}" style="border: 1px solid rgba(168, 85, 247, 0.25);">
        <span class="sidebar-icon" aria-hidden="true">💳</span>
        <span style="font-weight: 700;">Obligaciones y Pagos</span>
      </a>

      ${admin ? `
      <div style="margin-top: var(--space-md); padding: 0.5rem var(--space-md); font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">
        Administración
      </div>
      <a href="#/usuarios" class="sidebar-link ${moduloActual === 'usuarios' ? 'active' : ''}">
        <span class="sidebar-icon" aria-hidden="true">⚙</span>
        <span>Usuarios del Sistema</span>
      </a>
      ` : ''}
    </nav>

    <div class="sidebar-footer">
      <a href="#/inicio" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;">
        <span aria-hidden="true">🌐</span> Portal Público
      </a>
    </div>
  `;

  return sidebar;
}
