/**
 * Vista Principal: Gestión de Obligaciones y Pagos de Mensualidad (Iteración 3)
 * 
 * Requisitos Implementados:
 * - Filtros por cliente, periodo y estado efectivo (pendiente, pagada, vencida)
 * - Proceso de pago con confirmación previa del operador
 * - Generación de UUID v4 de idempotencia por intento lógico y reutilización estricta en reintentos
 * - Distinción de estados: confirmada, rechazada, resultado incierto (red)
 * - Emisión de Comprobante Interno (CMP-AAAA-NNNNNN) — NO factura electrónica
 * - Historial de pagos con consulta de comprobante
 * - Anulación exclusiva de administradores con motivo obligatorio y auditoría
 * - Retorno de la obligación a 'pendiente' para re-pago
 */

import { api } from '../services/api.js';
import { esAdmin } from '../services/auth.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { obtenerOIniciarIntento, registrarResultadoIntento, cancelarIntento } from '../services/idempotency.js';
import { formatearMonedaCOP, formatearFechaBogota, formatearPeriodo, escapeHTML } from '../utils/formatters.js';

export function renderPagosView() {
  const container = document.createElement('div');
  container.className = 'auth-main';

  const admin = esAdmin();

  container.innerHTML = `
    <!-- Encabezado -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Obligaciones y Pagos de Mensualidad
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Control de cartera, recaudo con idempotencia garantizada y emisión de comprobantes internos numerados.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-refrescar-todo" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Pestañas Principales: Obligaciones vs Historial de Pagos -->
    <div style="display: flex; gap: var(--space-sm); border-bottom: 1px solid var(--border-subtle); margin-bottom: var(--space-lg);">
      <button type="button" id="tab-obligaciones" class="btn btn-outline btn-sm active" style="border-bottom: 2px solid var(--accent-violet); border-radius: var(--radius-md) var(--radius-md) 0 0;">
        <span>📋</span> Obligaciones de Pago
      </button>
      <button type="button" id="tab-historial-pagos" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-md) var(--radius-md) 0 0;">
        <span>💳</span> Historial de Pagos y Comprobantes
      </button>
    </div>

    <!-- SECCIÓN A: TABLA DE OBLIGACIONES -->
    <div id="seccion-obligaciones">
      <!-- Filtros de Obligaciones -->
      <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
        <div style="display: flex; gap: var(--space-md); align-items: center; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label for="filtro-estado-obl" style="font-size: 0.85rem; color: var(--text-secondary);">Estado:</label>
            <select id="filtro-estado-obl" class="form-control" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <option value="todos">Todos los estados</option>
              <option value="pendiente" selected>Pendientes y Vencidas</option>
              <option value="vencida">Solo Vencidas (Mora)</option>
              <option value="pagada">Pagadas</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label for="filtro-periodo-obl" style="font-size: 0.85rem; color: var(--text-secondary);">Periodo:</label>
            <input type="text" id="filtro-periodo-obl" class="form-control" placeholder="YYYY-MM" style="width: 120px; padding: 0.4rem 0.8rem; font-size: 0.85rem;" />
          </div>

          <button type="button" id="btn-filtrar-obl" class="btn btn-secondary btn-sm">
            Filtrar
          </button>
          <button type="button" id="btn-limpiar-obl" class="btn btn-secondary btn-sm">
            Limpiar
          </button>
        </div>
      </div>

      <!-- Tabla de Obligaciones -->
      <div class="card" style="padding: 0;">
        <div class="table-responsive">
          <table class="table" id="tabla-obligaciones">
            <thead>
              <tr>
                <th>ID</th>
                <th>Periodo</th>
                <th>Contrato / Vehículo</th>
                <th>Importe</th>
                <th>Fecha Vencimiento</th>
                <th>Estado Efectivo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="tbody-obligaciones">
              <tr>
                <td colspan="7" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                  Cargando obligaciones...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SECCIÓN B: HISTORIAL DE PAGOS -->
    <div id="seccion-historial" style="display: none;">
      <!-- Filtros de Pagos -->
      <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
        <div style="display: flex; gap: var(--space-md); align-items: center; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label for="filtro-estado-pago" style="font-size: 0.85rem; color: var(--text-secondary);">Estado:</label>
            <select id="filtro-estado-pago" class="form-control" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <option value="todos">Todos los pagos</option>
              <option value="confirmado" selected>Confirmados</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>

          <button type="button" id="btn-filtrar-pagos" class="btn btn-secondary btn-sm">
            Filtrar
          </button>
        </div>
      </div>

      <!-- Tabla de Historial de Pagos -->
      <div class="card" style="padding: 0;">
        <div class="table-responsive">
          <table class="table" id="tabla-pagos">
            <thead>
              <tr>
                <th>ID</th>
                <th>Comprobante</th>
                <th>Periodo Cubierto</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Fecha y Hora</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tbody-pagos">
              <tr>
                <td colspan="8" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                  Cargando pagos...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  let modoVista = 'obligaciones'; // 'obligaciones' | 'historial'
  let obligacionesCache = [];
  let pagosCache = [];

  // ==========================================
  // 1. CARGA DE OBLIGACIONES
  // ==========================================
  async function cargarObligaciones() {
    const tbody = container.querySelector('#tbody-obligaciones');
    const filtroEstado = container.querySelector('#filtro-estado-obl').value;
    const filtroPeriodo = container.querySelector('#filtro-periodo-obl').value.trim();

    try {
      let ruta = '/obligaciones?tamano=100';
      if (filtroPeriodo) ruta += `&periodo_desde=${filtroPeriodo}&periodo_hasta=${filtroPeriodo}`;

      const res = await api.get(ruta);
      let obligaciones = res?.datos || [];

      // Filtrado por estado_efectivo en cliente
      if (filtroEstado === 'pendiente') {
        obligaciones = obligaciones.filter((o) => o.estado_efectivo === 'pendiente' || o.estado_efectivo === 'vencida');
      } else if (filtroEstado === 'vencida') {
        obligaciones = obligaciones.filter((o) => o.estado_efectivo === 'vencida');
      } else if (filtroEstado === 'pagada') {
        obligaciones = obligaciones.filter((o) => o.estado_efectivo === 'pagada');
      }

      obligacionesCache = obligaciones;

      if (obligaciones.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No hay obligaciones que coincidan con los filtros seleccionados.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = obligaciones.map((o) => {
        let badgeHtml = '<span class="badge badge-success"><span aria-hidden="true">✔</span> Pagada</span>';
        if (o.estado_efectivo === 'pendiente') {
          badgeHtml = '<span class="badge badge-warning">Pendiente</span>';
        } else if (o.estado_efectivo === 'vencida') {
          badgeHtml = '<span class="badge badge-danger"><span aria-hidden="true">⚠</span> Vencida (Mora)</span>';
        }

        const puedePagar = o.estado_efectivo === 'pendiente' || o.estado_efectivo === 'vencida';

        return `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${o.id}</td>
            <td>
              <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1rem; color: var(--accent-violet-light);">
                ${escapeHTML(o.periodo)}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${formatearPeriodo(o.periodo)}</div>
            </td>
            <td>
              <div style="font-size: 0.85rem; font-weight: 600;">Contrato #${o.contrato_id}</div>
              <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-violet-light);">
                🚗 ${escapeHTML(o.vehiculo_placa || 'Placa')}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(o.cliente_nombre || '')}</div>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 700; font-size: 1.05rem; color: #10B981;">
              ${formatearMonedaCOP(o.importe)}
            </td>
            <td style="font-size: 0.85rem;">
              ${formatearFechaBogota(o.fecha_vencimiento)}
              ${o.estado_efectivo === 'vencida' ? `<div style="font-size: 0.75rem; color: #FF7582; font-weight: 600;">Excedió vencimiento</div>` : ''}
            </td>
            <td>${badgeHtml}</td>
            <td>
              ${puedePagar ? `
                <button type="button" class="btn btn-primary btn-sm btn-iniciar-pago" data-id="${o.id}" data-importe="${o.importe}" data-periodo="${o.periodo}" data-contrato="${o.contrato_id}" data-placa="${escapeHTML(o.vehiculo_placa || '')}" data-cliente="${escapeHTML(o.cliente_nombre || '')}">
                  <span>💳</span> Pagar
                </button>
              ` : `
                <span style="font-size: 0.8rem; color: var(--text-muted);">Cubierta</span>
              `}
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-iniciar-pago').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const ds = e.currentTarget.dataset;
          abrirModalProcesoPago({
            id: Number(ds.id),
            importe: ds.importe,
            periodo: ds.periodo,
            contrato_id: ds.contrato,
            vehiculo_placa: ds.placa,
            cliente_nombre: ds.cliente
          }, e.currentTarget);
        });
      });

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar obligaciones: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // ==========================================
  // 2. PROCESO DE PAGO CON IDEMPOTENCIA
  // ==========================================
  function abrirModalProcesoPago(obl, elementoDisparador) {
    // Inicializa o recupera el intento lógico con su clave UUID v4
    const intento = obtenerOIniciarIntento(obl.id, { monto: obl.importe });

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="background-color: var(--bg-surface-secondary); padding: var(--space-md); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: var(--space-lg);">
        <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.25rem;">
          Resumen de la Obligación a Cancelar
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: var(--space-xs);">
          <div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">
              Periodo ${escapeHTML(obl.periodo)} (${formatearPeriodo(obl.periodo)})
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Vehículo: <strong style="color: var(--accent-violet-light); font-family: var(--font-mono);">${escapeHTML(obl.vehiculo_placa)}</strong> • Cliente: ${escapeHTML(obl.cliente_nombre)}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Importe Total</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #10B981; font-family: var(--font-mono);">
              ${formatearMonedaCOP(obl.importe)}
            </div>
          </div>
        </div>
      </div>

      <!-- Alerta de Reintento por Resultado Incierto previo -->
      <div id="alerta-intento-previo" style="${intento.estado === 'incierto' ? 'display: block;' : 'display: none;'} margin-bottom: var(--space-md); padding: var(--space-md); border-radius: var(--radius-md); background-color: var(--color-warning-bg); border: 1px solid rgba(245, 158, 11, 0.4); color: #FBBF24; font-size: 0.85rem;">
        ⚠ <strong>Resultado incierto detectado:</strong> La petición anterior experimentó un corte de red. Se reintentará utilizando exactamente la misma clave de idempotencia para garantizar que el pago no se duplique.
      </div>

      <div id="alerta-error-pago" role="alert" style="display: none; margin-bottom: var(--space-md); padding: var(--space-md); border-radius: var(--radius-md); background-color: var(--color-danger-bg); border: 1px solid rgba(255, 64, 87, 0.4); color: #FF7582; font-size: 0.85rem;">
      </div>

      <form id="form-registro-pago" novalidate>
        <div class="form-group">
          <label for="select-metodo-pago" class="form-label">
            Medio de Pago <span class="required">*</span>
          </label>
          <select id="select-metodo-pago" class="form-control" required>
            <option value="efectivo" ${intento.metodoPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
            <option value="transferencia" ${intento.metodoPago === 'transferencia' ? 'selected' : ''}>Transferencia Bancaria</option>
          </select>
          <span class="form-help">Medios autorizados según la política del parqueadero.</span>
        </div>

        <div class="form-group">
          <label class="form-label">Clave de Idempotencia del Intento</label>
          <input 
            type="text" 
            class="form-control" 
            value="${intento.claveIdempotencia}" 
            disabled 
            style="font-family: var(--font-mono); font-size: 0.8rem; opacity: 0.75;" 
          />
          <span class="form-help">Identificador UUID v4 único generado por el cliente para blindar la transacción contra doble cobro.</span>
        </div>
      </form>
    `;

    const modalObj = crearModal({
      titulo: 'Confirmación y Registro de Pago',
      contenido: modalContent,
      elementoDisparador,
      botones: [
        {
          texto: 'Cancelar',
          clase: 'btn-secondary',
          accion: (cerrar) => {
            if (intento.estado !== 'incierto') {
              cancelarIntento(obl.id);
            }
            cerrar();
          }
        },
        {
          texto: intento.estado === 'incierto' ? 'Reintentar Pago' : 'Confirmar y Pagar',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnPagar = e.target;
            const metodoPago = modalContent.querySelector('#select-metodo-pago').value;
            const alertaError = modalContent.querySelector('#alerta-error-pago');

            alertaError.style.display = 'none';
            btnPagar.disabled = true;
            btnPagar.textContent = 'Procesando pago...';

            intento.metodoPago = metodoPago;

            try {
              // Llamada a POST /api/pagos con clave_idempotencia y monto exacto
              const pago = await api.post('/pagos', {
                obligacion_id: obl.id,
                metodo_pago: metodoPago,
                clave_idempotencia: intento.claveIdempotencia,
                monto: String(obl.importe)
              });

              registrarResultadoIntento(obl.id, { estado: 'confirmado', pago });
              mostrarToast(`Pago registrado exitosamente. Comprobante ${pago.comprobante}`, 'success');
              cerrar();

              // Muestra el comprobante emitido
              abrirModalComprobante(pago);
              cargarObligaciones();

            } catch (err) {
              btnPagar.disabled = false;
              btnPagar.textContent = 'Reintentar Pago';

              if (err.codigo === 'ERROR_CONEXION') {
                // Estado Incierto por pérdida de red
                registrarResultadoIntento(obl.id, { estado: 'incierto', error: err });
                alertaError.innerHTML = `
                  <strong>Interrupción de Red:</strong> No se pudo verificar la respuesta del servidor. 
                  Haga clic en <strong>Reintentar Pago</strong>; el sistema reenviará la solicitud con la misma clave para consultar o asentar el pago sin duplicidad.
                `;
                alertaError.style.display = 'block';
              } else if (err.codigo === 'OBLIGACION_YA_PAGADA') {
                registrarResultadoIntento(obl.id, { estado: 'rechazado', error: err });
                alertaError.innerHTML = `
                  <strong>Operación no requerida:</strong> La obligación ya tiene un pago confirmado registrado. 
                  ${err.detalles?.pago_existente ? `(Pago ID #${err.detalles.pago_existente})` : ''}
                `;
                alertaError.style.display = 'block';
                setTimeout(() => {
                  cerrar();
                  cargarObligaciones();
                }, 3000);
              } else if (err.codigo === 'IDEMPOTENCIA_CONFLICTO') {
                registrarResultadoIntento(obl.id, { estado: 'rechazado', error: err });
                alertaError.textContent = 'Conflicto: La clave de idempotencia fue utilizada previamente con datos diferentes.';
                alertaError.style.display = 'block';
              } else {
                registrarResultadoIntento(obl.id, { estado: 'rechazado', error: err });
                alertaError.textContent = err.mensaje || 'Error al procesar el pago.';
                alertaError.style.display = 'block';
              }
            }
          }
        }
      ]
    });
  }

  // ==========================================
  // 3. COMPROBANTE INTERNO (NO FACTURA ELECTRÓNICA)
  // ==========================================
  function abrirModalComprobante(pago, elementoDisparador) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div class="receipt-box">
        <div class="receipt-header">
          <div class="receipt-title">AUTOS COLOMBIA</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
            Parqueadero de Mensualidad
          </div>
          <div class="receipt-disclaimer">
            COMPROBANTE INTERNO DE CONTROL DE RECAUDO
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">
            (Documento interno operativo — No constituye factura electrónica tributaria)
          </div>
        </div>

        <div class="receipt-row">
          <span>Número Comprobante:</span>
          <strong style="color: var(--accent-violet-light);">${escapeHTML(pago.comprobante)}</strong>
        </div>

        <div class="receipt-row">
          <span>Identificador Único:</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(pago.identificador || '—')}</span>
        </div>

        <div class="receipt-row">
          <span>Fecha y Hora:</span>
          <span>${formatearFechaBogota(pago.fecha_hora)}</span>
        </div>

        <div class="receipt-row">
          <span>Obligación ID:</span>
          <span>#${pago.obligacion_id}</span>
        </div>

        <div class="receipt-row">
          <span>Periodo Cubierto:</span>
          <span>${escapeHTML(pago.obligacion?.periodo || '—')}</span>
        </div>

        <div class="receipt-row">
          <span>Vehículo Placa:</span>
          <strong>${escapeHTML(pago.placa || '—')}</strong>
        </div>

        <div class="receipt-row">
          <span>Cliente:</span>
          <span>${escapeHTML(pago.cliente_nombre || '—')}</span>
        </div>

        <div class="receipt-row">
          <span>Medio de Pago:</span>
          <span style="text-transform: uppercase;">${escapeHTML(pago.metodo_pago)}</span>
        </div>

        <div class="receipt-row">
          <span>Estado del Pago:</span>
          <strong style="color: ${pago.estado === 'confirmado' ? '#10B981' : '#FF7582'}; text-transform: uppercase;">
            ${escapeHTML(pago.estado)}
          </strong>
        </div>

        ${pago.estado === 'anulado' ? `
          <div style="margin-top: var(--space-md); padding: var(--space-xs); border: 1px dashed var(--accent-red); border-radius: var(--radius-sm); font-size: 0.8rem; color: #FF7582;">
            <div><strong>ANULADO POR AUDITORÍA</strong></div>
            <div>Motivo: ${escapeHTML(pago.motivo_anulacion || 'Sin motivo')}</div>
            <div>Fecha anulación: ${formatearFechaBogota(pago.anulado_en)}</div>
          </div>
        ` : ''}

        <div class="receipt-total">
          <div class="receipt-row" style="margin: 0;">
            <span>TOTAL RECIBIDO:</span>
            <span>${formatearMonedaCOP(pago.monto)}</span>
          </div>
        </div>
      </div>
    `;

    crearModal({
      titulo: `Comprobante ${pago.comprobante}`,
      contenido: modalContent,
      elementoDisparador,
      botones: [
        {
          texto: 'Imprimir / Guardar',
          clase: 'btn-outline',
          accion: () => {
            window.print();
          }
        },
        { texto: 'Cerrar', clase: 'btn-secondary' }
      ]
    });
  }

  // ==========================================
  // 4. HISTORIAL DE PAGOS Y ANULACIÓN
  // ==========================================
  async function cargarPagos() {
    const tbody = container.querySelector('#tbody-pagos');
    const filtroEstado = container.querySelector('#filtro-estado-pago').value;

    try {
      let ruta = '/pagos?tamano=50';
      if (filtroEstado !== 'todos') {
        ruta += `&estado=${filtroEstado}`;
      }

      const res = await api.get(ruta);
      const pagos = res?.datos || [];
      pagosCache = pagos;

      if (pagos.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No hay pagos que coincidan con los filtros seleccionados.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = pagos.map((p) => `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${p.id}</td>
          <td>
            <span class="badge badge-violet" style="font-family: var(--font-mono); font-weight: 800; font-size: 0.85rem;">
              ${escapeHTML(p.comprobante)}
            </span>
          </td>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 600;">
              ${escapeHTML(p.obligacion?.periodo || `Obligación #${p.obligacion_id}`)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(p.placa || '')}</div>
          </td>
          <td style="font-family: var(--font-mono); font-weight: 700; font-size: 1rem; color: #10B981;">
            ${formatearMonedaCOP(p.monto)}
          </td>
          <td><span class="badge badge-info">${escapeHTML(p.metodo_pago)}</span></td>
          <td style="font-size: 0.825rem;">${formatearFechaBogota(p.fecha_hora)}</td>
          <td>
            <span class="badge ${p.estado === 'confirmado' ? 'badge-success' : 'badge-danger'}">
              ${escapeHTML(p.estado)}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-ver-comprobante" data-id="${p.id}" title="Ver comprobante numerado">
                <span>📄</span> Ver
              </button>
              ${(admin && p.estado === 'confirmado') ? `
                <button type="button" class="btn btn-danger btn-sm btn-anular-pago" data-id="${p.id}" data-comprobante="${escapeHTML(p.comprobante)}" data-obl="${p.obligacion_id}" title="Anular pago (Solo administrador)">
                  Anular
                </button>
              ` : ''}
              ${p.estado === 'anulado' ? `
                <span class="badge badge-warning" title="La obligación volvió a estar pendiente y puede re-pagarse">
                  Re-pago admitido
                </span>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-ver-comprobante').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = Number(e.currentTarget.dataset.id);
          const p = pagosCache.find((item) => item.id === id);
          if (p) abrirModalComprobante(p, e.currentTarget);
        });
      });

      if (admin) {
        tbody.querySelectorAll('.btn-anular-pago').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const comp = e.currentTarget.dataset.comprobante;
            const oblId = e.currentTarget.dataset.obl;
            abrirModalAnularPago(id, comp, oblId, e.currentTarget);
          });
        });
      }

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar historial de pagos: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // Modal para Anular Pago (Solo Administrador)
  function abrirModalAnularPago(pagoId, comprobante, obligacionId, elementoDisparador) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: var(--space-md); font-size: 0.9rem; color: var(--text-secondary);">
        Está a punto de anular el pago con comprobante <strong style="color: var(--accent-violet-light); font-family: var(--font-mono);">${escapeHTML(comprobante)}</strong>.
      </div>

      <div style="padding: var(--space-md); background-color: var(--color-warning-bg); border-radius: var(--radius-md); border: 1px solid rgba(245, 158, 11, 0.4); color: #FBBF24; font-size: 0.85rem; margin-bottom: var(--space-lg);">
        ⚠ <strong>Efecto en la Obligación:</strong> La obligación #${obligacionId} volverá automáticamente al estado <strong>pendiente</strong> para admitir un nuevo pago posterior. Esta acción queda auditada permanentemente.
      </div>

      <form id="form-anular-pago" novalidate>
        <div class="form-group">
          <label for="input-motivo-anulacion" class="form-label">
            Motivo Obligatorio de Anulación <span class="required">*</span>
          </label>
          <textarea 
            id="input-motivo-anulacion" 
            class="form-control" 
            rows="3" 
            placeholder="ej. Monto registrado con billete equivocado; corrección de auditoría" 
            maxlength="300" 
            required
          ></textarea>
          <span class="form-help">Máximo 300 caracteres. Justificación requerida para trazabilidad.</span>
        </div>
      </form>
    `;

    crearModal({
      titulo: `Anular Pago ${comprobante}`,
      contenido: modalContent,
      elementoDisparador,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Confirmar Anulación',
          clase: 'btn-danger',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const motivo = modalContent.querySelector('#input-motivo-anulacion').value.trim();

            if (!motivo) {
              mostrarToast('El motivo de anulación es estrictamente obligatorio.', 'warning');
              return;
            }

            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Anulando...';

            try {
              await api.post(`/pagos/${pagoId}/anular`, { motivo });
              mostrarToast(`Pago ${comprobante} anulado. La obligación vuelve a estar pendiente.`, 'success');
              cerrar();
              cargarPagos();
            } catch (err) {
              btnConfirm.disabled = false;
              btnConfirm.textContent = 'Confirmar Anulación';
              mostrarToast(err.mensaje || 'Error al anular pago', 'error');
            }
          }
        }
      ]
    });
  }

  // ==========================================
  // 5. EVENT LISTENERS Y NAVEGACIÓN DE PESTAÑAS
  // ==========================================
  const tabObl = container.querySelector('#tab-obligaciones');
  const tabHist = container.querySelector('#tab-historial-pagos');
  const secObl = container.querySelector('#seccion-obligaciones');
  const secHist = container.querySelector('#seccion-historial');

  tabObl.addEventListener('click', () => {
    modoVista = 'obligaciones';
    tabObl.className = 'btn btn-outline btn-sm active';
    tabHist.className = 'btn btn-secondary btn-sm';
    secObl.style.display = 'block';
    secHist.style.display = 'none';
    cargarObligaciones();
  });

  tabHist.addEventListener('click', () => {
    modoVista = 'historial';
    tabHist.className = 'btn btn-outline btn-sm active';
    tabObl.className = 'btn btn-secondary btn-sm';
    secHist.style.display = 'block';
    secObl.style.display = 'none';
    cargarPagos();
  });

  container.querySelector('#btn-filtrar-obl').addEventListener('click', cargarObligaciones);
  container.querySelector('#btn-limpiar-obl').addEventListener('click', () => {
    container.querySelector('#filtro-periodo-obl').value = '';
    container.querySelector('#filtro-estado-obl').value = 'pendiente';
    cargarObligaciones();
  });

  container.querySelector('#btn-filtrar-pagos').addEventListener('click', cargarPagos);
  container.querySelector('#btn-refrescar-todo').addEventListener('click', () => {
    if (modoVista === 'obligaciones') cargarObligaciones();
    else cargarPagos();
  });

  cargarObligaciones();
  return container;
}
