/**
 * Vista: Entradas y Salidas de Vehículos (Estancias)
 * 
 * Requisitos:
 * - Selección y búsqueda de vehículos con validación de contrato
 * - Selección exclusiva de celdas habilitadas y libres
 * - Prevención estricta de doble envío (anti double-click)
 * - Manejo robusto de concurrencia (celda ocupada en simultáneo o vehículo con estancia abierta)
 * - Registro de salida con motivo y liberación de celda
 */

import { api } from '../services/api.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { formatearFechaBogota, escapeHTML } from '../utils/formatters.js';

export function renderEstanciasView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  container.innerHTML = `
    <!-- Encabezado del Módulo -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Control de Entradas y Salidas
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Registro de movimientos vehiculares en bahía y liberación de celdas de parqueo.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-registrar-entrada" class="btn btn-primary btn-sm">
          <span aria-hidden="true">🚗</span> Registrar Entrada
        </button>
        <button type="button" id="btn-refrescar-estancias" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Pestañas: Estancias Abiertas vs Historial Cerradas -->
    <div style="display: flex; gap: var(--space-sm); border-bottom: 1px solid var(--border-subtle); margin-bottom: var(--space-lg);">
      <button type="button" id="tab-abiertas" class="btn btn-outline btn-sm active" style="border-bottom: 2px solid var(--accent-violet); border-radius: var(--radius-md) var(--radius-md) 0 0;">
        Vehículos en Parqueadero (<span id="badge-conteo-abiertas">0</span>)
      </button>
      <button type="button" id="tab-cerradas" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-md) var(--radius-md) 0 0;">
        Historial de Salidas
      </button>
    </div>

    <!-- Contenedor de Tabla -->
    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" id="tabla-estancias">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehículo / Placa</th>
              <th>Celda</th>
              <th>Fecha y Hora Entrada</th>
              <th id="th-salida" style="display: none;">Fecha y Hora Salida</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-estancias">
            <tr>
              <td colspan="6" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                Cargando movimientos...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  let modoActual = 'abiertas'; // 'abiertas' | 'cerradas'

  async function cargarEstancias() {
    const tbody = container.querySelector('#tbody-estancias');
    const badgeConteo = container.querySelector('#badge-conteo-abiertas');
    const thSalida = container.querySelector('#th-salida');

    try {
      const ruta = modoActual === 'abiertas' 
        ? '/estancias?estado=abierta&tamano=50' 
        : '/estancias?estado=cerrada&tamano=50';
      
      const res = await api.get(ruta);
      const estancias = res?.datos || [];

      if (modoActual === 'abiertas') {
        badgeConteo.textContent = estancias.length;
        thSalida.style.display = 'none';
      } else {
        thSalida.style.display = 'table-cell';
      }

      if (estancias.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No hay estancias ${modoActual === 'abiertas' ? 'activas en este momento' : 'registradas en el historial'}.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = estancias.map((est) => `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${est.id}</td>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; font-size: 1rem; color: var(--accent-violet-light);">
              ${escapeHTML(est.vehiculo_placa || `ID #${est.vehiculo_id}`)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              ${escapeHTML(est.vehiculo_marca || '')} ${escapeHTML(est.vehiculo_modelo || '')}
            </div>
          </td>
          <td>
            <span class="badge badge-info" style="font-family: var(--font-mono); font-size: 0.825rem;">
              Celda ${escapeHTML(est.celda_codigo || `#${est.celda_id}`)}
            </span>
          </td>
          <td style="font-size: 0.85rem;">${formatearFechaBogota(est.fecha_hora_entrada)}</td>
          ${modoActual === 'cerradas' ? `
            <td style="font-size: 0.85rem;">
              ${formatearFechaBogota(est.fecha_hora_salida)}
              ${est.motivo_salida ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(est.motivo_salida)}</div>` : ''}
            </td>
          ` : ''}
          <td>
            <span class="badge ${est.estado === 'abierta' ? 'badge-danger' : 'badge-success'}">
              ${est.estado === 'abierta' ? '🚗 En Bahía' : '✔ Cerrada'}
            </span>
          </td>
          <td>
            ${est.estado === 'abierta' ? `
              <button type="button" class="btn btn-danger btn-sm btn-salida" data-id="${est.id}" data-placa="${escapeHTML(est.vehiculo_placa || '')}" data-celda="${escapeHTML(est.celda_codigo || '')}">
                Registrar Salida
              </button>
            ` : '—'}
          </td>
        </tr>
      `).join('');

      // Listener para registrar salida
      tbody.querySelectorAll('.btn-salida').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          const placa = e.currentTarget.dataset.placa;
          const celda = e.currentTarget.dataset.celda;
          abrirModalSalida(id, placa, celda);
        });
      });

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar estancias: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // Modal para Registrar Entrada
  async function abrirModalEntrada() {
    let vehiculos = [];
    let celdasLibres = [];

    try {
      const [vRes, cRes] = await Promise.all([
        api.get('/vehiculos?tamano=100'),
        api.get('/celdas')
      ]);
      vehiculos = vRes?.datos || [];
      celdasLibres = (cRes || []).filter((c) => c.estado === 'habilitada' && !c.ocupada);
    } catch (err) {
      mostrarToast('Error al cargar vehículos o celdas para entrada', 'error');
      return;
    }

    if (celdasLibres.length === 0) {
      mostrarToast('No hay celdas libres disponibles en este momento.', 'warning');
      return;
    }

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="form-entrada" novalidate>
        <div class="form-group">
          <label for="select-vehiculo" class="form-label">
            Vehículo <span class="required">*</span>
          </label>
          <select id="select-vehiculo" class="form-control" required>
            <option value="">-- Seleccione el vehículo que ingresa --</option>
            ${vehiculos.map((v) => `
              <option value="${v.id}">
                ${escapeHTML(v.placa)} — ${escapeHTML(v.marca)} ${escapeHTML(v.modelo)} (Cliente ID #${v.cliente_id})
              </option>
            `).join('')}
          </select>
          <span class="form-help">Si el vehículo no está registrado, ingréselo primero en el módulo de Vehículos.</span>
        </div>

        <div class="form-group">
          <label for="select-celda" class="form-label">
            Celda Libre a Asignar <span class="required">*</span>
          </label>
          <select id="select-celda" class="form-control" required>
            <option value="">-- Seleccione una celda disponible --</option>
            ${celdasLibres.map((c) => `
              <option value="${c.id}">
                Celda ${escapeHTML(c.codigo)} (${escapeHTML(c.tipo)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="input-fecha-entrada" class="form-label">
            Fecha y Hora de Ingreso
          </label>
          <input type="text" id="input-fecha-entrada" class="form-control" value="Ahora (Hora oficial Bogotá)" disabled style="opacity: 0.8;" />
          <span class="form-help">El sistema registra el instante de entrada con zona horaria Colombia UTC-5.</span>
        </div>
      </form>
    `;

    crearModal({
      titulo: 'Registrar Entrada de Vehículo',
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Confirmar Entrada',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const vehiculoId = modalContent.querySelector('#select-vehiculo').value;
            const celdaId = modalContent.querySelector('#select-celda').value;

            if (!vehiculoId || !celdaId) {
              mostrarToast('Debe seleccionar un vehículo y una celda libre.', 'warning');
              return;
            }

            // Anti-doble envío
            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Procesando...';

            try {
              await api.post('/estancias', {
                vehiculo_id: Number(vehiculoId),
                celda_id: Number(celdaId)
              });
              mostrarToast('Entrada registrada exitosamente. Celda ocupada.', 'success');
              cerrar();
              cargarEstancias();
            } catch (err) {
              btnConfirm.disabled = false;
              btnConfirm.textContent = 'Confirmar Entrada';
              if (err.codigo === 'CELDA_NO_DISPONIBLE') {
                mostrarToast('Conflicto: La celda seleccionada acaba de ser ocupada o inhabilitada.', 'error');
              } else if (err.codigo === 'ESTADO_INVALIDO') {
                mostrarToast('Conflicto: Este vehículo ya tiene una estancia abierta activa.', 'error');
              } else {
                mostrarToast(err.mensaje || 'Error al registrar entrada', 'error');
              }
            }
          }
        }
      ]
    });
  }

  // Modal para Registrar Salida
  function abrirModalSalida(estanciaId, placa, celda) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <p style="margin-bottom: var(--space-md); font-size: 0.95rem;">
        ¿Desea registrar la salida del vehículo con placa 
        <strong style="color: var(--accent-violet-light); font-family: var(--font-mono); font-size: 1.1rem;">${escapeHTML(placa)}</strong> 
        de la <strong style="color: var(--text-primary);">Celda ${escapeHTML(celda)}</strong>?
      </p>
      <div class="form-group">
        <label for="input-motivo-salida" class="form-label">Motivo o Novedad de Salida (Opcional)</label>
        <input type="text" id="input-motivo-salida" class="form-control" placeholder="ej. Fin de jornada / Salida de abonado" maxlength="200" />
      </div>
    `;

    crearModal({
      titulo: 'Confirmar Salida de Vehículo',
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Registrar Salida y Liberar Celda',
          clase: 'btn-danger',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const motivo = modalContent.querySelector('#input-motivo-salida').value.trim();

            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Liberando celda...';

            try {
              await api.post(`/estancias/${estanciaId}/salida`, {
                motivo_salida: motivo || 'Fin de estancia mensual'
              });
              mostrarToast(`Salida registrada. Celda ${celda} liberada.`, 'success');
              cerrar();
              cargarEstancias();
            } catch (err) {
              btnConfirm.disabled = false;
              btnConfirm.textContent = 'Registrar Salida';
              mostrarToast(err.mensaje || 'Error al registrar salida', 'error');
            }
          }
        }
      ]
    });
  }

  // Event Listeners
  container.querySelector('#tab-abiertas').addEventListener('click', (e) => {
    modoActual = 'abiertas';
    e.target.className = 'btn btn-outline btn-sm active';
    container.querySelector('#tab-cerradas').className = 'btn btn-secondary btn-sm';
    cargarEstancias();
  });

  container.querySelector('#tab-cerradas').addEventListener('click', (e) => {
    modoActual = 'cerradas';
    e.target.className = 'btn btn-outline btn-sm active';
    container.querySelector('#tab-abiertas').className = 'btn btn-secondary btn-sm';
    cargarEstancias();
  });

  container.querySelector('#btn-registrar-entrada').addEventListener('click', abrirModalEntrada);
  container.querySelector('#btn-refrescar-estancias').addEventListener('click', cargarEstancias);

  cargarEstancias();
  return container;
}
