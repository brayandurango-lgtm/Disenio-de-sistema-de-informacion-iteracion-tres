/**
 * Vista: Dashboard / Resumen Operativo
 * 
 * Regla de Oro:
 * NO mostrar estadísticas inventadas. Todos los indicadores provienen de llamadas
 * reales a los endpoints de la API (/celdas, /estancias, /contratos, /pagos).
 */

import { api } from '../services/api.js';
import { getUsuario, esAdmin } from '../services/auth.js';
import { formatearMonedaCOP, formatearFechaBogota, escapeHTML } from '../utils/formatters.js';

export function renderDashboardView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  const usuario = getUsuario();

  container.innerHTML = `
    <!-- Encabezado del Dashboard -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Panel de Control Operativo
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Bienvenido, <strong style="color: var(--text-primary);">${escapeHTML(usuario?.nombre_usuario)}</strong>. 
          Monitoreo en tiempo real de celdas, estancias vehiculares y recaudos de mensualidad.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-refrescar-dash" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar Datos
        </button>
      </div>
    </div>

    <!-- Indicadores Verificables (Cargados desde la API) -->
    <div class="grid-4" id="kpi-container" style="margin-bottom: var(--space-xl);">
      <div class="card" style="border-left: 4px solid var(--accent-violet);">
        <div style="font-size: 0.775rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Celdas Totales</div>
        <div id="kpi-celdas-total" style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin: 0.35rem 0;">—</div>
        <div id="kpi-celdas-sub" style="font-size: 0.8rem; color: var(--text-secondary);">Consultando API...</div>
      </div>

      <div class="card" style="border-left: 4px solid var(--color-success);">
        <div style="font-size: 0.775rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Celdas Disponibles</div>
        <div id="kpi-celdas-libres" style="font-size: 2rem; font-weight: 800; color: #10B981; margin: 0.35rem 0;">—</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">Habilitadas para ingreso</div>
      </div>

      <div class="card" style="border-left: 4px solid var(--accent-red);">
        <div style="font-size: 0.775rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Estancias Activas</div>
        <div id="kpi-estancias-abiertas" style="font-size: 2rem; font-weight: 800; color: var(--accent-red); margin: 0.35rem 0;">—</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">Vehículos actualmente en celda</div>
      </div>

      <div class="card" style="border-left: 4px solid var(--color-info);">
        <div style="font-size: 0.775rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Contratos Activos</div>
        <div id="kpi-contratos-activos" style="font-size: 2rem; font-weight: 800; color: #38BDF8; margin: 0.35rem 0;">—</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">Abonados con mensualidad</div>
      </div>
    </div>

    <!-- Acciones Rápidas Operativas (Tarjetas Grandes) -->
    <h2 style="font-size: 1.35rem; margin-bottom: var(--space-md); color: var(--text-primary);">
      Acciones Rápidas
    </h2>
    <div class="grid-4" style="margin-bottom: var(--space-2xl);">
      <a href="#/estancias" class="card card-interactive" style="display: flex; flex-direction: column; align-items: flex-start; text-decoration: none;">
        <span style="font-size: 2rem; margin-bottom: var(--space-sm);" aria-hidden="true">🚗</span>
        <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;">Registrar Entrada</h3>
        <p style="font-size: 0.825rem; color: var(--text-secondary);">Ingreso de vehículo con validación de celda libre y contrato.</p>
      </a>

      <a href="#/estancias" class="card card-interactive" style="display: flex; flex-direction: column; align-items: flex-start; text-decoration: none;">
        <span style="font-size: 2rem; margin-bottom: var(--space-sm);" aria-hidden="true">🏁</span>
        <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;">Registrar Salida</h3>
        <p style="font-size: 0.825rem; color: var(--text-secondary);">Cierre de estancia y liberación inmediata de la celda.</p>
      </a>

      <a href="#/pagos" class="card card-interactive" style="display: flex; flex-direction: column; align-items: flex-start; text-decoration: none; border-color: rgba(168, 85, 247, 0.4);">
        <span style="font-size: 2rem; margin-bottom: var(--space-sm);" aria-hidden="true">💳</span>
        <h3 style="font-size: 1.1rem; color: var(--accent-violet-light); margin-bottom: 0.25rem;">Registrar Pago</h3>
        <p style="font-size: 0.825rem; color: var(--text-secondary);">Cobro de mensualidad con clave de idempotencia y comprobante.</p>
      </a>

      <a href="#/contratos" class="card card-interactive" style="display: flex; flex-direction: column; align-items: flex-start; text-decoration: none;">
        <span style="font-size: 2rem; margin-bottom: var(--space-sm);" aria-hidden="true">📝</span>
        <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;">Nuevo Contrato</h3>
        <p style="font-size: 0.825rem; color: var(--text-secondary);">Vinculación de cliente y vehículo para mensualidad.</p>
      </a>
    </div>

    <!-- Tablas de Actividad Reciente Verificable -->
    <div class="grid-2">
      <!-- Pagos Recientes -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>💳</span> Últimos Pagos Registrados
          </div>
          <a href="#/pagos" class="btn btn-secondary btn-sm">Ver Todos</a>
        </div>
        <div id="tabla-pagos-recientes" class="table-responsive">
          <div style="padding: var(--space-md); text-align: center; color: var(--text-muted);">
            Cargando registros...
          </div>
        </div>
      </div>

      <!-- Celdas y Ocupación Resumen -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🅿</span> Estado Actual de Celdas
          </div>
          <a href="#/celdas" class="btn btn-secondary btn-sm">Gestionar Celdas</a>
        </div>
        <div id="resumen-celdas-rapido" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div style="padding: var(--space-md); text-align: center; color: var(--text-muted);">
            Cargando estado de celdas...
          </div>
        </div>
      </div>
    </div>
  `;

  // Carga asíncrona de datos reales
  async function cargarDatos() {
    const kpiTotal = container.querySelector('#kpi-celdas-total');
    const kpiLibres = container.querySelector('#kpi-celdas-libres');
    const kpiEstancias = container.querySelector('#kpi-estancias-abiertas');
    const kpiContratos = container.querySelector('#kpi-contratos-activos');
    const kpiSub = container.querySelector('#kpi-celdas-sub');
    const tablaPagos = container.querySelector('#tabla-pagos-recientes');
    const resumenCeldas = container.querySelector('#resumen-celdas-rapido');

    try {
      // 1. Celdas y ocupación derivada
      const celdas = await api.get('/celdas');
      const totalCeldas = celdas.length;
      const libres = celdas.filter((c) => c.estado === 'habilitada' && !c.ocupada).length;
      const ocupadas = celdas.filter((c) => c.ocupada).length;
      const fueraServicio = celdas.filter((c) => c.estado === 'fuera_de_servicio').length;

      kpiTotal.textContent = totalCeldas;
      kpiLibres.textContent = libres;
      kpiSub.textContent = `${ocupadas} ocupadas • ${fueraServicio} fuera de servicio`;

      // Render resumen celdas rápido
      resumenCeldas.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: var(--space-xs);">
          ${celdas.map((c) => `
            <div style="padding: 0.5rem; text-align: center; border-radius: var(--radius-sm); border: 1px solid ${c.ocupada ? 'rgba(255,64,87,0.5)' : c.estado === 'fuera_de_servicio' ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}; background: ${c.ocupada ? 'rgba(255,64,87,0.08)' : c.estado === 'fuera_de_servicio' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'}; font-family: var(--font-mono); font-size: 0.8rem;">
              <div style="font-weight: 700;">${escapeHTML(c.codigo)}</div>
              <div style="font-size: 0.65rem; color: ${c.ocupada ? '#FF7582' : c.estado === 'fuera_de_servicio' ? '#FBBF24' : '#34D399'};">
                ${c.ocupada ? 'Ocupada' : c.estado === 'fuera_de_servicio' ? 'F.S.' : 'Libre'}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // 2. Estancias abiertas
      const estanciasRes = await api.get('/estancias?estado=abierta&tamano=50');
      const estanciasAbiertas = estanciasRes?.datos?.length || 0;
      kpiEstancias.textContent = estanciasAbiertas;

      // 3. Contratos activos
      const contratosRes = await api.get('/contratos?estado=activo&tamano=50');
      const contratosActivos = contratosRes?.datos?.length || 0;
      kpiContratos.textContent = contratosActivos;

      // 4. Últimos pagos
      const pagosRes = await api.get('/pagos?tamano=5');
      const pagos = pagosRes?.datos || [];

      if (pagos.length === 0) {
        tablaPagos.innerHTML = `
          <div style="padding: var(--space-md); text-align: center; color: var(--text-muted);">
            No hay pagos registrados aún en el sistema.
          </div>
        `;
      } else {
        tablaPagos.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${pagos.map((p) => `
                <tr>
                  <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-violet-light);">
                    ${escapeHTML(p.comprobante)}
                  </td>
                  <td style="font-size: 0.8rem;">${formatearFechaBogota(p.fecha_hora)}</td>
                  <td style="font-weight: 700; font-family: var(--font-mono);">${formatearMonedaCOP(p.monto)}</td>
                  <td><span class="badge badge-info">${escapeHTML(p.metodo_pago)}</span></td>
                  <td>
                    <span class="badge ${p.estado === 'confirmado' ? 'badge-success' : 'badge-danger'}">
                      ${escapeHTML(p.estado)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (err) {
      kpiSub.textContent = 'Error al consultar la API';
      tablaPagos.innerHTML = `<div style="padding: var(--space-md); color: #FF7582;">Error: ${escapeHTML(err.message)}</div>`;
    }
  }

  container.querySelector('#btn-refrescar-dash').addEventListener('click', cargarDatos);
  cargarDatos();

  return container;
}
