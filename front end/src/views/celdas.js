/**
 * Vista: Gestión y Monitoreo de Celdas de Parqueo
 * 
 * Requisitos:
 * - Vista de tarjetas en cuadrícula
 * - Diferenciación clara libre / ocupada / fuera de servicio
 * - Leyenda explicativa
 * - Estado no comunicado únicamente por color (iconos, etiquetas de texto, accesibilidad)
 * - Creación y cambio de estado para administradores
 */

import { api } from '../services/api.js';
import { esAdmin } from '../services/auth.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { escapeHTML } from '../utils/formatters.js';

export function renderCeldasView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  const admin = esAdmin();

  container.innerHTML = `
    <!-- Encabezado del Módulo -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Celdas de Parqueo y Ocupación
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Control de disponibilidad en tiempo real. La ocupación se deriva de estancias activas abiertas.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        ${admin ? `
          <button type="button" id="btn-crear-celda" class="btn btn-primary btn-sm">
            <span aria-hidden="true">➕</span> Nueva Celda
          </button>
        ` : ''}
        <button type="button" id="btn-refrescar-celdas" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Leyenda Accesible (No solo color) -->
    <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
      <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-xs);">
        Leyenda Operativa:
      </div>
      <div style="display: flex; gap: var(--space-xl); flex-wrap: wrap; font-size: 0.875rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge badge-success" aria-hidden="true">✔</span>
          <span><strong>Libre:</strong> Habilitada y sin vehículo asignado.</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge badge-danger" aria-hidden="true">🚗</span>
          <span><strong>Ocupada:</strong> Con estancia abierta en curso.</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge badge-warning" aria-hidden="true">⚠</span>
          <span><strong>Fuera de servicio:</strong> Deshabilitada por mantenimiento.</span>
        </div>
      </div>
    </div>

    <!-- Filtros de búsqueda -->
    <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-lg); flex-wrap: wrap; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label for="filtro-tipo" style="font-size: 0.85rem; color: var(--text-secondary);">Tipo:</label>
        <select id="filtro-tipo" class="form-control" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
          <option value="todos">Todos los tipos</option>
          <option value="cubierta">Cubierta</option>
          <option value="techada">Techada</option>
        </select>
      </div>

      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label for="filtro-estado" style="font-size: 0.85rem; color: var(--text-secondary);">Disponibilidad:</label>
        <select id="filtro-estado" class="form-control" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
          <option value="todos">Todas las celdas</option>
          <option value="libres">Solo Libres</option>
          <option value="ocupadas">Solo Ocupadas</option>
          <option value="fuera_servicio">Fuera de Servicio</option>
        </select>
      </div>
    </div>

    <!-- Contenedor Grid de Celdas -->
    <div id="grid-celdas" class="grid-cards">
      <div style="grid-column: 1 / -1; padding: var(--space-2xl); text-align: center; color: var(--text-muted);">
        Cargando celdas del parqueadero...
      </div>
    </div>
  `;

  let celdasCache = [];

  function renderGrid() {
    const grid = container.querySelector('#grid-celdas');
    const filtroTipo = container.querySelector('#filtro-tipo').value;
    const filtroEstado = container.querySelector('#filtro-estado').value;

    let filtradas = celdasCache.slice();

    if (filtroTipo !== 'todos') {
      filtradas = filtradas.filter((c) => c.tipo === filtroTipo);
    }

    if (filtroEstado === 'libres') {
      filtradas = filtradas.filter((c) => c.estado === 'habilitada' && !c.ocupada);
    } else if (filtroEstado === 'ocupadas') {
      filtradas = filtradas.filter((c) => c.ocupada);
    } else if (filtroEstado === 'fuera_servicio') {
      filtradas = filtradas.filter((c) => c.estado === 'fuera_de_servicio');
    }

    if (filtradas.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-title">No hay celdas que coincidan</div>
          <div class="empty-state-desc">Ajuste los filtros de tipo o disponibilidad para ver más celdas.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtradas.map((c) => {
      let estadoClase = 'libre';
      let badgeHtml = '<span class="badge badge-success"><span aria-hidden="true">✔</span> Libre</span>';

      if (c.estado === 'fuera_de_servicio') {
        estadoClase = 'fuera-servicio';
        badgeHtml = '<span class="badge badge-warning"><span aria-hidden="true">⚠</span> Fuera de servicio</span>';
      } else if (c.ocupada) {
        estadoClase = 'ocupada';
        badgeHtml = '<span class="badge badge-danger"><span aria-hidden="true">🚗</span> Ocupada</span>';
      }

      return `
        <div class="celda-card ${estadoClase}" data-id="${c.id}">
          <div class="celda-header">
            <div>
              <div class="celda-codigo">${escapeHTML(c.codigo)}</div>
              <div class="celda-tipo">Celda ${escapeHTML(c.tipo)}</div>
            </div>
            <div>${badgeHtml}</div>
          </div>

          <div style="margin: var(--space-md) 0;">
            ${c.ocupada ? `
              <div class="celda-vehiculo" title="Vehículo actualmente en celda">
                <span aria-hidden="true">🚘</span>
                <span>Vehículo ID #${c.estancia_actual?.vehiculo_id || 'Ocupado'}</span>
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                ${c.estado === 'habilitada' ? 'Disponible para ingreso' : 'En mantenimiento'}
              </div>
            `}
          </div>

          ${admin ? `
            <div style="display: flex; gap: var(--space-xs); border-top: 1px solid var(--border-subtle); padding-top: var(--space-sm); margin-top: auto;">
              <button type="button" class="btn btn-secondary btn-sm btn-cambiar-estado" data-id="${c.id}" data-estado="${c.estado}" data-ocupada="${c.ocupada}" style="width: 100%; font-size: 0.775rem;">
                ${c.estado === 'habilitada' ? 'Inhabilitar' : 'Habilitar'}
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Listeners de cambio de estado para administradores
    if (admin) {
      grid.querySelectorAll('.btn-cambiar-estado').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          const estadoActual = e.currentTarget.dataset.estado;
          const ocupada = e.currentTarget.dataset.ocupada === 'true';

          if (estadoActual === 'habilitada' && ocupada) {
            mostrarToast('No se puede inhabilitar una celda con un vehículo adentro. Registre primero la salida.', 'warning');
            return;
          }

          const nuevoEstado = estadoActual === 'habilitada' ? 'fuera_de_servicio' : 'habilitada';
          try {
            await api.patch(`/celdas/${id}`, { estado: nuevoEstado });
            mostrarToast(`Celda actualizada a ${nuevoEstado}`, 'success');
            cargarCeldas();
          } catch (err) {
            mostrarToast(err.mensaje || 'Error al actualizar celda', 'error');
          }
        });
      });
    }
  }

  async function cargarCeldas() {
    try {
      celdasCache = await api.get('/celdas');
      renderGrid();
    } catch (err) {
      container.querySelector('#grid-celdas').innerHTML = `
        <div style="grid-column: 1 / -1; color: #FF7582; text-align: center;">
          Error al cargar celdas: ${escapeHTML(err.mensaje)}
        </div>
      `;
    }
  }

  container.querySelector('#btn-refrescar-celdas').addEventListener('click', cargarCeldas);
  container.querySelector('#filtro-tipo').addEventListener('change', renderGrid);
  container.querySelector('#filtro-estado').addEventListener('change', renderGrid);

  // Modal para crear nueva celda (Solo Admin)
  if (admin) {
    container.querySelector('#btn-crear-celda').addEventListener('click', () => {
      const formHtml = `
        <form id="form-crear-celda">
          <div class="form-group">
            <label for="input-celda-codigo" class="form-label">Código de Celda <span class="required">*</span></label>
            <input type="text" id="input-celda-codigo" class="form-control" placeholder="ej. D-01" required />
            <span class="form-help">Identificador alfanumérico único.</span>
          </div>
          <div class="form-group">
            <label for="input-celda-tipo" class="form-label">Tipo de Celda <span class="required">*</span></label>
            <select id="input-celda-tipo" class="form-control">
              <option value="cubierta">Cubierta</option>
              <option value="techada">Techada</option>
            </select>
          </div>
          <div class="form-group">
            <label for="input-celda-estado" class="form-label">Estado Inicial <span class="required">*</span></label>
            <select id="input-celda-estado" class="form-control">
              <option value="habilitada">Habilitada</option>
              <option value="fuera_de_servicio">Fuera de Servicio</option>
            </select>
          </div>
        </form>
      `;

      crearModal({
        titulo: 'Nueva Celda de Parqueo',
        contenido: formHtml,
        botones: [
          { texto: 'Cancelar', clase: 'btn-secondary' },
          {
            texto: 'Crear Celda',
            clase: 'btn-primary',
            accion: async (cerrar) => {
              const codigo = document.getElementById('input-celda-codigo').value.trim();
              const tipo = document.getElementById('input-celda-tipo').value;
              const estado = document.getElementById('input-celda-estado').value;

              if (!codigo) {
                mostrarToast('El código de celda es obligatorio', 'warning');
                return;
              }

              try {
                await api.post('/celdas', { codigo, tipo, estado });
                mostrarToast(`Celda ${codigo} creada exitosamente`, 'success');
                cerrar();
                cargarCeldas();
              } catch (err) {
                mostrarToast(err.mensaje || 'Error al crear celda', 'error');
              }
            }
          }
        ]
      });
    });
  }

  cargarCeldas();
  return container;
}
