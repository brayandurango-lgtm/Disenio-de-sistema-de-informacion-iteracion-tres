/**
 * Vista: Contratos de Mensualidad
 * 
 * Requisitos:
 * - Listado de contratos con cliente, vehículo, vigencia, tarifa y estado
 * - Creación de contratos con validaciones de fechas (día 1 para inicio, fin de mes o indefinido)
 * - Edición de tarifa / estado (finalizar o cancelar)
 * - Acción para Generar Obligaciones explícitas de mensualidad (/api/contratos/:id/obligaciones/generar)
 */

import { api } from '../services/api.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { formatearMonedaCOP, formatearFechaBogota, escapeHTML } from '../utils/formatters.js';

export function renderContratosView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  container.innerHTML = `
    <!-- Encabezado -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Contratos de Mensualidad
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Acuerdos de suscripción mensual por vehículo con tarifa fija y generación de obligaciones.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-crear-contrato" class="btn btn-primary btn-sm">
          <span aria-hidden="true">➕</span> Nuevo Contrato
        </button>
        <button type="button" id="btn-refrescar-contratos" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Filtro de Estado -->
    <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
      <div style="display: flex; gap: var(--space-md); align-items: center; flex-wrap: wrap;">
        <label for="filtro-estado-contrato" style="font-size: 0.85rem; color: var(--text-secondary);">Estado:</label>
        <select id="filtro-estado-contrato" class="form-control" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
          <option value="todos">Todos los estados</option>
          <option value="activo" selected>Activos</option>
          <option value="finalizado">Finalizados</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>
    </div>

    <!-- Tabla de Contratos -->
    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" id="tabla-contratos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehículo</th>
              <th>Cliente Responsable</th>
              <th>Tarifa Mensual</th>
              <th>Vigencia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-contratos">
            <tr>
              <td colspan="7" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                Cargando contratos...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  async function cargarContratos() {
    const tbody = container.querySelector('#tbody-contratos');
    const filtroEstado = container.querySelector('#filtro-estado-contrato').value;

    try {
      let ruta = '/contratos?tamano=50';
      if (filtroEstado !== 'todos') {
        ruta += `&estado=${filtroEstado}`;
      }

      const res = await api.get(ruta);
      const contratos = res?.datos || [];

      if (contratos.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No se encontraron contratos registrados.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = contratos.map((c) => {
        let badgeEstado = 'badge-success';
        if (c.estado === 'finalizado') badgeEstado = 'badge-info';
        if (c.estado === 'cancelado') badgeEstado = 'badge-danger';

        const vigenciaTexto = c.fecha_fin 
          ? `${c.fecha_inicio} al ${c.fecha_fin}`
          : `Desde ${c.fecha_inicio} (Indefinido)`;

        return `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${c.id}</td>
            <td>
              <span class="badge badge-violet" style="font-family: var(--font-mono); font-size: 0.9rem;">
                🚗 ${escapeHTML(c.vehiculo_placa || `Vehículo #${c.vehiculo_id}`)}
              </span>
            </td>
            <td>
              <div style="font-weight: 600;">${escapeHTML(c.cliente_nombre || `Cliente #${c.cliente_id}`)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">ID #${c.cliente_id}</div>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: #10B981;">
              ${formatearMonedaCOP(c.tarifa_mensual)}
            </td>
            <td style="font-size: 0.85rem;">${vigenciaTexto}</td>
            <td>
              <span class="badge ${badgeEstado}">
                ${escapeHTML(c.estado)}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
                ${c.estado === 'activo' ? `
                  <button type="button" class="btn btn-primary btn-sm btn-generar-obl" data-id="${c.id}" data-tarifa="${c.tarifa_mensual}" data-inicio="${c.fecha_inicio}" data-fin="${c.fecha_fin || ''}" title="Generar obligaciones de mensualidad">
                    <span>⚡</span> Obligaciones
                  </button>
                ` : ''}
                <button type="button" class="btn btn-secondary btn-sm btn-editar-contrato" data-id="${c.id}" data-tarifa="${c.tarifa_mensual}" data-estado="${c.estado}">
                  <span>✏</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Listeners
      tbody.querySelectorAll('.btn-generar-obl').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const ds = e.currentTarget.dataset;
          abrirModalGenerarObligaciones(ds.id, ds.tarifa, ds.inicio, ds.fin);
        });
      });

      tbody.querySelectorAll('.btn-editar-contrato').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const ds = e.currentTarget.dataset;
          abrirModalEditarContrato(ds.id, ds.tarifa, ds.estado);
        });
      });

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar contratos: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // Modal para Generar Obligaciones Explícitas (POST /api/contratos/:id/obligaciones/generar)
  function abrirModalGenerarObligaciones(contratoId, tarifa, fechaInicio, fechaFin) {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActualNum = String(hoy.getMonth() + 1).padStart(2, '0');
    const periodoPorDefecto = `${anioActual}-${mesActualNum}`;

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <p style="margin-bottom: var(--space-md); font-size: 0.9rem; color: var(--text-secondary);">
        Generación de recibos de mensualidad para el <strong>Contrato #${contratoId}</strong>.
        Tarifa actual: <strong style="color: #10B981; font-family: var(--font-mono);">${formatearMonedaCOP(tarifa)}</strong>.
      </p>

      <form id="form-generar-obl" novalidate>
        <div class="form-group">
          <label for="input-periodos" class="form-label">
            Periodos a Facturar (Separados por coma) <span class="required">*</span>
          </label>
          <input 
            type="text" 
            id="input-periodos" 
            class="form-control" 
            value="${periodoPorDefecto}" 
            placeholder="ej. 2026-11, 2026-12" 
            required 
          />
          <span class="form-help">Formato YYYY-MM. Puede indicar varios separados por coma. Deben estar dentro de la vigencia del contrato (${fechaInicio} a ${fechaFin || 'indefinido'}).</span>
        </div>

        <div class="form-group">
          <label for="input-dia-vencimiento" class="form-label">
            Día Límite de Vencimiento del Mes Siguiente <span class="required">*</span>
          </label>
          <input 
            type="number" 
            id="input-dia-vencimiento" 
            class="form-control" 
            value="5" 
            min="1" 
            max="28" 
            required 
          />
          <span class="form-help">Día del mes siguiente al periodo (1 a 28). Ejemplo: si el periodo es 2026-11 y el día es 5, vence el 2026-12-05.</span>
        </div>
      </form>
    `;

    crearModal({
      titulo: `Generar Obligaciones — Contrato #${contratoId}`,
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Generar Mensualidades',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const periodosStr = modalContent.querySelector('#input-periodos').value.trim();
            const diaVencimiento = Number(modalContent.querySelector('#input-dia-vencimiento').value);

            const periodos = periodosStr
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            if (periodos.length === 0 || !diaVencimiento) {
              mostrarToast('Debe ingresar al menos un periodo y un día de vencimiento válido.', 'warning');
              return;
            }

            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Generando...';

            try {
              const res = await api.post(`/contratos/${contratoId}/obligaciones/generar`, {
                periodos,
                dia_vencimiento: diaVencimiento
              });
              mostrarToast(`Obligaciones generadas: ${res.generadas} (Omitidas por existir previamente: ${res.omitidas})`, 'success');
              cerrar();
            } catch (err) {
              btnConfirm.disabled = false;
              btnConfirm.textContent = 'Generar Mensualidades';
              mostrarToast(err.mensaje || 'Error al generar obligaciones', 'error');
            }
          }
        }
      ]
    });
  }

  // Modal para Editar Contrato
  function abrirModalEditarContrato(contratoId, tarifaActual, estadoActual) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="form-editar-contrato" novalidate>
        <div class="form-group">
          <label for="edit-tarifa" class="form-label">Tarifa Mensual (COP)</label>
          <input type="text" id="edit-tarifa" class="form-control" value="${tarifaActual}" placeholder="ej. 150000.00" />
          <span class="form-help">Cambiar la tarifa aplica para futuras obligaciones; no altera las ya generadas.</span>
        </div>

        <div class="form-group">
          <label for="edit-estado" class="form-label">Estado del Contrato</label>
          <select id="edit-estado" class="form-control">
            <option value="activo" ${estadoActual === 'activo' ? 'selected' : ''}>Activo</option>
            <option value="finalizado" ${estadoActual === 'finalizado' ? 'selected' : ''}>Finalizado</option>
            <option value="cancelado" ${estadoActual === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </form>
    `;

    crearModal({
      titulo: `Modificar Contrato #${contratoId}`,
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Guardar Cambios',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const tarifa = modalContent.querySelector('#edit-tarifa').value.trim();
            const estado = modalContent.querySelector('#edit-estado').value;

            btnConfirm.disabled = true;

            try {
              await api.patch(`/contratos/${contratoId}`, {
                tarifa_mensual: tarifa,
                estado
              });
              mostrarToast('Contrato actualizado exitosamente', 'success');
              cerrar();
              cargarContratos();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al actualizar contrato', 'error');
            }
          }
        }
      ]
    });
  }

  // Modal para Crear Nuevo Contrato
  async function abrirModalCrearContrato() {
    let clientes = [];
    let vehiculos = [];

    try {
      const [cRes, vRes] = await Promise.all([
        api.get('/clientes?tamano=100'),
        api.get('/vehiculos?tamano=100')
      ]);
      clientes = cRes?.datos || [];
      vehiculos = vRes?.datos || [];
    } catch {
      mostrarToast('Error al cargar datos auxiliares', 'error');
      return;
    }

    if (clientes.length === 0 || vehiculos.length === 0) {
      mostrarToast('Debe tener al menos un cliente y un vehículo registrados para crear un contrato.', 'warning');
      return;
    }

    const hoy = new Date();
    const fechaInicioPorDefecto = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="form-nuevo-contrato" novalidate>
        <div class="form-group">
          <label for="nuevo-cliente" class="form-label">Cliente Responsable <span class="required">*</span></label>
          <select id="nuevo-cliente" class="form-control" required>
            <option value="">-- Seleccione el cliente --</option>
            ${clientes.map((c) => `
              <option value="${c.id}">${escapeHTML(c.nombres)} ${escapeHTML(c.apellidos)} (${escapeHTML(c.numero_documento)})</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="nuevo-vehiculo" class="form-label">Vehículo Vinculado <span class="required">*</span></label>
          <select id="nuevo-vehiculo" class="form-control" required>
            <option value="">-- Seleccione el vehículo --</option>
            ${vehiculos.map((v) => `
              <option value="${v.id}">${escapeHTML(v.placa)} — ${escapeHTML(v.marca)} ${escapeHTML(v.modelo)} (Cliente ID #${v.cliente_id})</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="nuevo-tarifa" class="form-label">Tarifa Mensual (COP) <span class="required">*</span></label>
          <input type="text" id="nuevo-tarifa" class="form-control" placeholder="ej. 120000.00" value="120000.00" required />
          <span class="form-help">Monto fijo en pesos colombianos.</span>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="nuevo-inicio" class="form-label">Fecha de Inicio <span class="required">*</span></label>
            <input type="date" id="nuevo-inicio" class="form-control" value="${fechaInicioPorDefecto}" required />
            <span class="form-help">Debe ser el día 1 del mes.</span>
          </div>

          <div class="form-group">
            <label for="nuevo-fin" class="form-label">Fecha de Fin (Opcional)</label>
            <input type="date" id="nuevo-fin" class="form-control" />
            <span class="form-help">Debe ser el último día del mes, o vacío para indefinido.</span>
          </div>
        </div>
      </form>
    `;

    crearModal({
      titulo: 'Crear Contrato de Mensualidad',
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Registrar Contrato',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const cliente_id = modalContent.querySelector('#nuevo-cliente').value;
            const vehiculo_id = modalContent.querySelector('#nuevo-vehiculo').value;
            const tarifa_mensual = modalContent.querySelector('#nuevo-tarifa').value.trim();
            const fecha_inicio = modalContent.querySelector('#nuevo-inicio').value;
            const fecha_fin = modalContent.querySelector('#nuevo-fin').value || null;

            if (!cliente_id || !vehiculo_id || !tarifa_mensual || !fecha_inicio) {
              mostrarToast('Cliente, vehículo, tarifa y fecha de inicio son requeridos.', 'warning');
              return;
            }

            btnConfirm.disabled = true;

            try {
              await api.post('/contratos', {
                cliente_id: Number(cliente_id),
                vehiculo_id: Number(vehiculo_id),
                tarifa_mensual,
                fecha_inicio,
                fecha_fin
              });
              mostrarToast('Contrato creado exitosamente', 'success');
              cerrar();
              cargarContratos();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al crear contrato', 'error');
            }
          }
        }
      ]
    });
  }

  container.querySelector('#filtro-estado-contrato').addEventListener('change', cargarContratos);
  container.querySelector('#btn-refrescar-contratos').addEventListener('click', cargarContratos);
  container.querySelector('#btn-crear-contrato').addEventListener('click', abrirModalCrearContrato);

  cargarContratos();
  return container;
}
