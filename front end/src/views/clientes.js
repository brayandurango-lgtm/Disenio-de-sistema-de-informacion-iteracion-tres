/**
 * Vista: Gestión de Clientes y Resumen de Deuda
 * 
 * Requisitos:
 * - Búsqueda por texto (parámetro 'q')
 * - Paginación según API (pagina, tamano, total)
 * - Alta y edición con validación de campos
 * - Detalle del cliente y consulta del resumen de deuda (/api/resumen/cliente/:id)
 */

import { api } from '../services/api.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { formatearMonedaCOP, formatearFechaBogota, escapeHTML } from '../utils/formatters.js';

export function renderClientesView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  container.innerHTML = `
    <!-- Encabezado -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Gestión de Clientes
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Registro de abonados, datos de contacto y consulta integral de cartera.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-crear-cliente" class="btn btn-primary btn-sm">
          <span aria-hidden="true">➕</span> Nuevo Cliente
        </button>
        <button type="button" id="btn-refrescar-clientes" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Barra de Búsqueda -->
    <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
      <form id="form-buscar-cliente" style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px;">
          <input 
            type="search" 
            id="input-buscar-q" 
            class="form-control" 
            placeholder="Buscar por nombre, apellido o número de documento..." 
          />
        </div>
        <button type="submit" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔍</span> Buscar
        </button>
        <button type="button" id="btn-limpiar-busqueda" class="btn btn-secondary btn-sm">
          Limpiar
        </button>
      </form>
    </div>

    <!-- Tabla de Clientes -->
    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" id="tabla-clientes">
          <thead>
            <tr>
              <th>ID</th>
              <th>Documento</th>
              <th>Nombre Completo</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-clientes">
            <tr>
              <td colspan="6" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                Cargando clientes...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Controles de Paginación -->
      <div class="pagination" style="padding: var(--space-md) var(--space-lg);" id="paginacion-clientes">
        <div class="pagination-info" id="info-paginacion">Mostrando página 1</div>
        <div class="pagination-controls">
          <button type="button" id="btn-pag-ant" class="btn btn-secondary btn-sm" disabled>Anterior</button>
          <button type="button" id="btn-pag-sig" class="btn btn-secondary btn-sm" disabled>Siguiente</button>
        </div>
      </div>
    </div>
  `;

  let paginaActual = 1;
  const tamanoPagina = 10;
  let queryBusqueda = '';

  async function cargarClientes() {
    const tbody = container.querySelector('#tbody-clientes');
    const infoPag = container.querySelector('#info-paginacion');
    const btnAnt = container.querySelector('#btn-pag-ant');
    const btnSig = container.querySelector('#btn-pag-sig');

    try {
      let ruta = `/clientes?pagina=${paginaActual}&tamano=${tamanoPagina}`;
      if (queryBusqueda) {
        ruta += `&q=${encodeURIComponent(queryBusqueda)}`;
      }

      const res = await api.get(ruta);
      const clientes = res?.datos || [];
      const pag = res?.paginacion || { pagina: 1, paginas: 1, total: 0 };

      infoPag.textContent = `Página ${pag.pagina} de ${pag.paginas} (Total: ${pag.total} clientes)`;
      btnAnt.disabled = pag.pagina <= 1;
      btnSig.disabled = pag.pagina >= pag.paginas;

      if (clientes.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No se encontraron clientes con el criterio de búsqueda.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = clientes.map((c) => `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${c.id}</td>
          <td>
            <span class="badge badge-info" style="font-size: 0.75rem;">${escapeHTML(c.tipo_documento)}</span>
            <span style="font-family: var(--font-mono); font-weight: 600; margin-left: 0.35rem;">${escapeHTML(c.numero_documento)}</span>
          </td>
          <td style="font-weight: 600; color: var(--text-primary);">
            ${escapeHTML(c.nombres)} ${escapeHTML(c.apellidos)}
          </td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(c.telefono || '—')}</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(c.correo || '—')}</td>
          <td>
            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn btn-secondary btn-sm btn-detalle-cliente" data-id="${c.id}" title="Ver resumen de deuda y vehículos">
                <span>📋</span> Resumen
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-editar-cliente" data-id="${c.id}">
                <span>✏</span>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Listeners
      tbody.querySelectorAll('.btn-detalle-cliente').forEach((btn) => {
        btn.addEventListener('click', (e) => verDetalleCliente(e.currentTarget.dataset.id));
      });

      tbody.querySelectorAll('.btn-editar-cliente').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const c = clientes.find((item) => String(item.id) === e.currentTarget.dataset.id);
          if (c) abrirModalCliente(c);
        });
      });

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar clientes: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // Consulta Detalle y Deuda del Cliente (GET /api/resumen/cliente/:id)
  async function verDetalleCliente(clienteId) {
    try {
      const [clienteDetalle, resumen] = await Promise.all([
        api.get(`/clientes/${clienteId}`),
        api.get(`/resumen/cliente/${clienteId}`)
      ]);

      const c = clienteDetalle;
      const r = resumen;

      const modalContent = document.createElement('div');
      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-lg); border-bottom: 1px solid var(--border-subtle); padding-bottom: var(--space-md);">
          <div>
            <h2 style="font-size: 1.35rem; margin-bottom: 0.25rem;">${escapeHTML(c.nombres)} ${escapeHTML(c.apellidos)}</h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              ${escapeHTML(c.tipo_documento)}: ${escapeHTML(c.numero_documento)} • Tel: ${escapeHTML(c.telefono || 'Sin teléfono')}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(c.correo || 'Sin correo')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Estado Cartera</div>
            ${r.obligaciones_vencidas?.length > 0 ? `
              <span class="badge badge-danger">⚠ En Mora</span>
            ` : `
              <span class="badge badge-success">✔ Al Día</span>
            `}
          </div>
        </div>

        <!-- Indicadores de Deuda -->
        <div class="grid-2" style="margin-bottom: var(--space-lg);">
          <div class="card" style="padding: var(--space-md); border-color: ${r.obligaciones_vencidas?.length > 0 ? 'rgba(255,64,87,0.5)' : 'var(--border-subtle)'};">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Obligaciones Vencidas</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${r.obligaciones_vencidas?.length > 0 ? '#FF7582' : '#10B981'};">
              ${r.obligaciones_vencidas?.length || 0}
            </div>
          </div>

          <div class="card" style="padding: var(--space-md);">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Obligaciones Pendientes</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #FBBF24;">
              ${r.obligaciones_pendientes?.length || 0}
            </div>
          </div>
        </div>

        <!-- Lista de Vehículos Vinculados -->
        <h4 style="margin-bottom: var(--space-xs); font-size: 1rem;">Vehículos del Cliente</h4>
        <div style="margin-bottom: var(--space-lg); font-size: 0.85rem;">
          ${(c.vehiculos && c.vehiculos.length > 0) ? `
            <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
              ${c.vehiculos.map((v) => `
                <span class="badge badge-violet" style="font-family: var(--font-mono); font-size: 0.85rem;">
                  🚗 ${escapeHTML(v.placa)} (${escapeHTML(v.marca)} ${escapeHTML(v.modelo)})
                </span>
              `).join('')}
            </div>
          ` : '<span style="color: var(--text-muted);">No tiene vehículos registrados todavía.</span>'}
        </div>

        <!-- Lista de Obligaciones Detallada -->
        <h4 style="margin-bottom: var(--space-xs); font-size: 1rem;">Obligaciones por Pagar</h4>
        <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
          <table class="table" style="font-size: 0.825rem;">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Importe</th>
                <th>Vencimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${[...(r.obligaciones_vencidas || []), ...(r.obligaciones_pendientes || [])].map((o) => `
                <tr>
                  <td style="font-family: var(--font-mono); font-weight: 700;">${escapeHTML(o.periodo)}</td>
                  <td style="font-family: var(--font-mono);">${formatearMonedaCOP(o.importe)}</td>
                  <td>${formatearFechaBogota(o.fecha_vencimiento)}</td>
                  <td>
                    <span class="badge ${o.estado_efectivo === 'vencida' ? 'badge-danger' : 'badge-warning'}">
                      ${o.estado_efectivo === 'vencida' ? '⚠ Vencida' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Sin obligaciones de pago pendientes.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;

      crearModal({
        titulo: 'Detalle de Cliente y Estado de Cartera',
        contenido: modalContent,
        botones: [{ texto: 'Cerrar', clase: 'btn-secondary' }]
      });

    } catch (err) {
      mostrarToast(`Error al obtener información del cliente: ${err.mensaje}`, 'error');
    }
  }

  // Modal para Crear / Editar Cliente
  function abrirModalCliente(clienteExistente = null) {
    const esEdicion = Boolean(clienteExistente);
    const modalContent = document.createElement('div');

    modalContent.innerHTML = `
      <form id="form-cliente-modal" novalidate>
        <div class="grid-2">
          <div class="form-group">
            <label for="modal-tipo-doc" class="form-label">Tipo Documento <span class="required">*</span></label>
            <select id="modal-tipo-doc" class="form-control" ${esEdicion ? 'disabled' : ''}>
              <option value="CC" ${clienteExistente?.tipo_documento === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía (CC)</option>
              <option value="CE" ${clienteExistente?.tipo_documento === 'CE' ? 'selected' : ''}>Cédula de Extranjería (CE)</option>
              <option value="NIT" ${clienteExistente?.tipo_documento === 'NIT' ? 'selected' : ''}>NIT</option>
              <option value="TI" ${clienteExistente?.tipo_documento === 'TI' ? 'selected' : ''}>Tarjeta de Identidad (TI)</option>
              <option value="PAS" ${clienteExistente?.tipo_documento === 'PAS' ? 'selected' : ''}>Pasaporte (PAS)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="modal-num-doc" class="form-label">Número de Documento <span class="required">*</span></label>
            <input 
              type="text" 
              id="modal-num-doc" 
              class="form-control" 
              value="${escapeHTML(clienteExistente?.numero_documento || '')}" 
              placeholder="ej. 1000000001" 
              required 
              ${esEdicion ? 'disabled' : ''}
            />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="modal-nombres" class="form-label">Nombres <span class="required">*</span></label>
            <input 
              type="text" 
              id="modal-nombres" 
              class="form-control" 
              value="${escapeHTML(clienteExistente?.nombres || '')}" 
              placeholder="ej. Camila" 
              required 
            />
          </div>
          <div class="form-group">
            <label for="modal-apellidos" class="form-label">Apellidos <span class="required">*</span></label>
            <input 
              type="text" 
              id="modal-apellidos" 
              class="form-control" 
              value="${escapeHTML(clienteExistente?.apellidos || '')}" 
              placeholder="ej. Rojas Peña" 
              required 
            />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="modal-telefono" class="form-label">Teléfono (Opcional)</label>
            <input 
              type="tel" 
              id="modal-telefono" 
              class="form-control" 
              value="${escapeHTML(clienteExistente?.telefono || '')}" 
              placeholder="ej. 3000000001" 
            />
          </div>
          <div class="form-group">
            <label for="modal-correo" class="form-label">Correo Electrónico (Opcional)</label>
            <input 
              type="email" 
              id="modal-correo" 
              class="form-control" 
              value="${escapeHTML(clienteExistente?.correo || '')}" 
              placeholder="ej. cliente@correo.example" 
            />
          </div>
        </div>

        <div class="form-group">
          <label for="modal-direccion" class="form-label">Dirección (Opcional)</label>
          <input 
            type="text" 
            id="modal-direccion" 
            class="form-control" 
            value="${escapeHTML(clienteExistente?.direccion || '')}" 
            placeholder="ej. Calle 10 #20-30, Bogotá" 
          />
        </div>
      </form>
    `;

    crearModal({
      titulo: esEdicion ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente',
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: esEdicion ? 'Guardar Cambios' : 'Registrar Cliente',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const nombres = modalContent.querySelector('#modal-nombres').value.trim();
            const apellidos = modalContent.querySelector('#modal-apellidos').value.trim();
            const telefono = modalContent.querySelector('#modal-telefono').value.trim() || null;
            const correo = modalContent.querySelector('#modal-correo').value.trim() || null;
            const direccion = modalContent.querySelector('#modal-direccion').value.trim() || null;

            if (!nombres || !apellidos) {
              mostrarToast('Los nombres y apellidos son obligatorios', 'warning');
              return;
            }

            btnConfirm.disabled = true;

            try {
              if (esEdicion) {
                await api.patch(`/clientes/${clienteExistente.id}`, {
                  nombres,
                  apellidos,
                  telefono,
                  correo,
                  direccion
                });
                mostrarToast('Cliente actualizado exitosamente', 'success');
              } else {
                const tipo_documento = modalContent.querySelector('#modal-tipo-doc').value;
                const numero_documento = modalContent.querySelector('#modal-num-doc').value.trim();

                if (!numero_documento) {
                  mostrarToast('El número de documento es obligatorio', 'warning');
                  btnConfirm.disabled = false;
                  return;
                }

                await api.post('/clientes', {
                  tipo_documento,
                  numero_documento,
                  nombres,
                  apellidos,
                  telefono,
                  correo,
                  direccion
                });
                mostrarToast('Cliente registrado exitosamente', 'success');
              }

              cerrar();
              cargarClientes();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al procesar cliente', 'error');
            }
          }
        }
      ]
    });
  }

  // Buscador y Paginación
  container.querySelector('#form-buscar-cliente').addEventListener('submit', (e) => {
    e.preventDefault();
    queryBusqueda = container.querySelector('#input-buscar-q').value.trim();
    paginaActual = 1;
    cargarClientes();
  });

  container.querySelector('#btn-limpiar-busqueda').addEventListener('click', () => {
    container.querySelector('#input-buscar-q').value = '';
    queryBusqueda = '';
    paginaActual = 1;
    cargarClientes();
  });

  container.querySelector('#btn-pag-ant').addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual--;
      cargarClientes();
    }
  });

  container.querySelector('#btn-pag-sig').addEventListener('click', () => {
    paginaActual++;
    cargarClientes();
  });

  container.querySelector('#btn-crear-cliente').addEventListener('click', () => abrirModalCliente());
  container.querySelector('#btn-refrescar-clientes').addEventListener('click', cargarClientes);

  cargarClientes();
  return container;
}
