/**
 * Vista: Gestión de Vehículos y Novedades
 * 
 * Requisitos:
 * - Listado de vehículos con filtro por cliente o placa
 * - Alta de vehículo asociado a cliente
 * - Normalización de placa en frontend
 * - Gestión de novedades/incidentes del vehículo (/api/vehiculos/:id/novedades)
 */

import { api } from '../services/api.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { esPlacaValida, limpiarPlaca } from '../utils/validators.js';
import { formatearFechaBogota, escapeHTML } from '../utils/formatters.js';

export function renderVehiculosView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  container.innerHTML = `
    <!-- Encabezado -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Vehículos y Novedades
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Registro de automotores vinculados a abonados y bitácora de novedades técnicas.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-crear-vehiculo" class="btn btn-primary btn-sm">
          <span aria-hidden="true">🚗</span> Registrar Vehículo
        </button>
        <button type="button" id="btn-refrescar-vehiculos" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Filtro de Placa -->
    <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
      <form id="form-buscar-vehiculo" style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
        <div style="width: 200px;">
          <input 
            type="search" 
            id="input-buscar-placa" 
            class="form-control" 
            placeholder="Filtrar por placa..." 
            style="text-transform: uppercase;"
          />
        </div>
        <button type="submit" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔍</span> Filtrar
        </button>
        <button type="button" id="btn-limpiar-filtro-placa" class="btn btn-secondary btn-sm">
          Limpiar
        </button>
      </form>
    </div>

    <!-- Tabla de Vehículos -->
    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" id="tabla-vehiculos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Placa</th>
              <th>Marca y Modelo</th>
              <th>Año</th>
              <th>Color</th>
              <th>Cliente Responsable</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-vehiculos">
            <tr>
              <td colspan="7" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                Cargando vehículos...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" style="padding: var(--space-md) var(--space-lg);" id="paginacion-vehiculos">
        <div class="pagination-info" id="info-pag-vehiculos">Mostrando página 1</div>
        <div class="pagination-controls">
          <button type="button" id="btn-veh-ant" class="btn btn-secondary btn-sm" disabled>Anterior</button>
          <button type="button" id="btn-veh-sig" class="btn btn-secondary btn-sm" disabled>Siguiente</button>
        </div>
      </div>
    </div>
  `;

  let paginaActual = 1;
  const tamanoPagina = 10;
  let filtroPlaca = '';

  async function cargarVehiculos() {
    const tbody = container.querySelector('#tbody-vehiculos');
    const infoPag = container.querySelector('#info-pag-vehiculos');
    const btnAnt = container.querySelector('#btn-veh-ant');
    const btnSig = container.querySelector('#btn-veh-sig');

    try {
      let ruta = `/vehiculos?pagina=${paginaActual}&tamano=${tamanoPagina}`;
      if (filtroPlaca) {
        ruta += `&placa=${encodeURIComponent(filtroPlaca)}`;
      }

      const res = await api.get(ruta);
      const vehiculos = res?.datos || [];
      const pag = res?.paginacion || { pagina: 1, paginas: 1, total: 0 };

      infoPag.textContent = `Página ${pag.pagina} de ${pag.paginas} (Total: ${pag.total} vehículos)`;
      btnAnt.disabled = pag.pagina <= 1;
      btnSig.disabled = pag.pagina >= pag.paginas;

      if (vehiculos.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No se encontraron vehículos registrados.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = vehiculos.map((v) => `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${v.id}</td>
          <td>
            <span class="badge badge-violet" style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 800; letter-spacing: 0.05em;">
              ${escapeHTML(v.placa)}
            </span>
          </td>
          <td style="font-weight: 600; color: var(--text-primary);">
            ${escapeHTML(v.marca)} ${escapeHTML(v.modelo)}
          </td>
          <td>${v.anio || '—'}</td>
          <td>${escapeHTML(v.color || '—')}</td>
          <td>
            <div style="font-weight: 600; font-size: 0.85rem;">
              ${escapeHTML(v.cliente_nombre || `Cliente #${v.cliente_id}`)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">ID #${v.cliente_id}</div>
          </td>
          <td>
            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn btn-secondary btn-sm btn-novedades-veh" data-id="${v.id}" data-placa="${escapeHTML(v.placa)}" title="Ver bitácora de novedades">
                <span>📋</span> Novedades
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-novedades-veh').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          verNovedadesVehiculo(e.currentTarget.dataset.id, e.currentTarget.dataset.placa);
        });
      });

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar vehículos: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // Modal de Novedades del Vehículo (GET /api/vehiculos/:id/novedades y POST)
  async function verNovedadesVehiculo(vehiculoId, placa) {
    try {
      const novedades = await api.get(`/vehiculos/${vehiculoId}/novedades`);

      const modalContent = document.createElement('div');
      modalContent.innerHTML = `
        <div style="margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Vehículo</div>
            <div style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: var(--accent-violet-light);">
              ${escapeHTML(placa)}
            </div>
          </div>
          <button type="button" id="btn-nueva-novedad" class="btn btn-primary btn-sm">
            ➕ Agregar Novedad
          </button>
        </div>

        <!-- Formulario Oculto de Nueva Novedad -->
        <div id="box-form-novedad" style="display: none; padding: var(--space-md); background-color: var(--bg-surface-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-lg); border: 1px solid var(--border-subtle);">
          <h4 style="margin-bottom: var(--space-sm); font-size: 0.95rem;">Registrar Nueva Novedad</h4>
          <form id="form-crear-novedad">
            <div class="form-group">
              <label for="nov-descripcion" class="form-label">Descripción de la Novedad <span class="required">*</span></label>
              <textarea id="nov-descripcion" class="form-control" rows="2" placeholder="ej. Rayón en puerta derecha preexistente al ingreso" required></textarea>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label for="nov-fecha" class="form-label">Fecha (AAAA-MM-DD) <span class="required">*</span></label>
                <input type="date" id="nov-fecha" class="form-control" value="${new Date().toISOString().slice(0, 10)}" required />
              </div>
              <div class="form-group">
                <label for="nov-responsable" class="form-label">Responsable o Taller <span class="required">*</span></label>
                <input type="text" id="nov-responsable" class="form-control" placeholder="ej. Taller aliado / Propietario" required />
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: var(--space-xs);">
              <button type="button" id="btn-cancelar-novedad" class="btn btn-secondary btn-sm">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-sm">Guardar Novedad</button>
            </div>
          </form>
        </div>

        <!-- Lista de Novedades -->
        <div id="lista-novedades">
          ${(novedades && novedades.length > 0) ? `
            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
              ${novedades.map((n) => `
                <div style="padding: var(--space-md); background-color: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                    <span>📅 ${formatearFechaBogota(n.fecha)}</span>
                    <span class="badge badge-info">${escapeHTML(n.responsable)}</span>
                  </div>
                  <div style="color: var(--text-primary); font-size: 0.9rem;">
                    ${escapeHTML(n.descripcion)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div style="text-align: center; padding: var(--space-lg); color: var(--text-muted);">No hay novedades registradas para este vehículo.</div>'}
        </div>
      `;

      const { cerrar } = crearModal({
        titulo: 'Bitácora de Novedades del Vehículo',
        contenido: modalContent,
        botones: [{ texto: 'Cerrar', clase: 'btn-secondary' }]
      });

      const btnToggle = modalContent.querySelector('#btn-nueva-novedad');
      const boxForm = modalContent.querySelector('#box-form-novedad');
      const btnCancelar = modalContent.querySelector('#btn-cancelar-novedad');
      const formNovedad = modalContent.querySelector('#form-crear-novedad');

      btnToggle.addEventListener('click', () => {
        boxForm.style.display = 'block';
        btnToggle.style.display = 'none';
      });

      btnCancelar.addEventListener('click', () => {
        boxForm.style.display = 'none';
        btnToggle.style.display = 'inline-block';
      });

      formNovedad.addEventListener('submit', async (e) => {
        e.preventDefault();
        const descripcion = modalContent.querySelector('#nov-descripcion').value.trim();
        const fecha = modalContent.querySelector('#nov-fecha').value;
        const responsable = modalContent.querySelector('#nov-responsable').value.trim();

        if (!descripcion || !fecha || !responsable) {
          mostrarToast('Todos los campos son obligatorios', 'warning');
          return;
        }

        try {
          await api.post(`/vehiculos/${vehiculoId}/novedades`, {
            descripcion,
            fecha,
            responsable
          });
          mostrarToast('Novedad registrada exitosamente', 'success');
          cerrar();
          verNovedadesVehiculo(vehiculoId, placa);
        } catch (err) {
          mostrarToast(err.mensaje || 'Error al registrar novedad', 'error');
        }
      });

    } catch (err) {
      mostrarToast(`Error al consultar novedades: ${err.mensaje}`, 'error');
    }
  }

  // Modal para Registrar Nuevo Vehículo
  async function abrirModalVehiculo() {
    let clientes = [];
    try {
      const res = await api.get('/clientes?tamano=100');
      clientes = res?.datos || [];
    } catch {
      mostrarToast('Error al cargar clientes asociados', 'error');
      return;
    }

    if (clientes.length === 0) {
      mostrarToast('Debe registrar primero un cliente antes de crear vehículos.', 'warning');
      return;
    }

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="form-crear-vehiculo" novalidate>
        <div class="form-group">
          <label for="veh-cliente" class="form-label">Cliente Propietario / Responsable <span class="required">*</span></label>
          <select id="veh-cliente" class="form-control" required>
            <option value="">-- Seleccione el cliente --</option>
            ${clientes.map((c) => `
              <option value="${c.id}">${escapeHTML(c.nombres)} ${escapeHTML(c.apellidos)} (${escapeHTML(c.tipo_documento)} ${escapeHTML(c.numero_documento)})</option>
            `).join('')}
          </select>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="veh-placa" class="form-label">Placa Vehicular <span class="required">*</span></label>
            <input 
              type="text" 
              id="veh-placa" 
              class="form-control" 
              placeholder="ej. ABC123" 
              style="text-transform: uppercase;"
              required 
            />
            <span class="form-help">Formato colombiano (3 letras y 3 números).</span>
          </div>

          <div class="form-group">
            <label for="veh-marca" class="form-label">Marca <span class="required">*</span></label>
            <input type="text" id="veh-marca" class="form-control" placeholder="ej. Renault" required />
          </div>
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label for="veh-modelo" class="form-label">Línea / Modelo <span class="required">*</span></label>
            <input type="text" id="veh-modelo" class="form-control" placeholder="ej. Sandero" required />
          </div>
          <div class="form-group">
            <label for="veh-anio" class="form-label">Año (Opcional)</label>
            <input type="number" id="veh-anio" class="form-control" placeholder="2021" min="1980" max="2030" />
          </div>
          <div class="form-group">
            <label for="veh-color" class="form-label">Color (Opcional)</label>
            <input type="text" id="veh-color" class="form-control" placeholder="ej. Blanco" />
          </div>
        </div>
      </form>
    `;

    crearModal({
      titulo: 'Registrar Vehículo en Parqueadero',
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Registrar Vehículo',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const cliente_id = modalContent.querySelector('#veh-cliente').value;
            const placaRaw = modalContent.querySelector('#veh-placa').value;
            const marca = modalContent.querySelector('#veh-marca').value.trim();
            const modelo = modalContent.querySelector('#veh-modelo').value.trim();
            const anio = modalContent.querySelector('#veh-anio').value ? Number(modalContent.querySelector('#veh-anio').value) : null;
            const color = modalContent.querySelector('#veh-color').value.trim() || null;

            const placa = limpiarPlaca(placaRaw);

            if (!cliente_id || !placa || !marca || !modelo) {
              mostrarToast('Cliente, placa, marca y modelo son obligatorios', 'warning');
              return;
            }

            if (!esPlacaValida(placa)) {
              mostrarToast('Formato de placa inválido. Debe contener 6 caracteres alfanuméricos válidos.', 'warning');
              return;
            }

            btnConfirm.disabled = true;

            try {
              await api.post('/vehiculos', {
                cliente_id: Number(cliente_id),
                placa,
                marca,
                modelo,
                anio,
                color
              });
              mostrarToast(`Vehículo ${placa} registrado exitosamente`, 'success');
              cerrar();
              cargarVehiculos();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al registrar vehículo', 'error');
            }
          }
        }
      ]
    });
  }

  // Event Listeners
  container.querySelector('#form-buscar-vehiculo').addEventListener('submit', (e) => {
    e.preventDefault();
    filtroPlaca = limpiarPlaca(container.querySelector('#input-buscar-placa').value);
    paginaActual = 1;
    cargarVehiculos();
  });

  container.querySelector('#btn-limpiar-filtro-placa').addEventListener('click', () => {
    container.querySelector('#input-buscar-placa').value = '';
    filtroPlaca = '';
    paginaActual = 1;
    cargarVehiculos();
  });

  container.querySelector('#btn-veh-ant').addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual--;
      cargarVehiculos();
    }
  });

  container.querySelector('#btn-veh-sig').addEventListener('click', () => {
    paginaActual++;
    cargarVehiculos();
  });

  container.querySelector('#btn-crear-vehiculo').addEventListener('click', abrirModalVehiculo);
  container.querySelector('#btn-refrescar-vehiculos').addEventListener('click', cargarVehiculos);

  cargarVehiculos();
  return container;
}
