/**
 * Vista: Administración de Cuentas de Acceso y Usuarios
 * 
 * Requisitos:
 * - Exclusiva para usuarios con rol 'administrador'
 * - Creación de usuarios con contraseña inicial segura
 * - Cambio de rol y activación/desactivación
 * - Cambio de contraseña (/api/usuarios/:id/cambiar-password)
 */

import { api } from '../services/api.js';
import { esAdmin, getUsuario } from '../services/auth.js';
import { mostrarToast } from '../components/toast.js';
import { crearModal } from '../components/modal.js';
import { escapeHTML } from '../utils/formatters.js';

export function renderUsuariosView() {
  if (!esAdmin()) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'auth-main';
    errorContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title" style="color: #FF7582;">Acceso Restringido</div>
        <div class="empty-state-desc">
          Este módulo está reservado exclusivamente para cuentas con rol de Administrador.
        </div>
        <a href="#/panel" class="btn btn-secondary btn-sm">Volver al Dashboard</a>
      </div>
    `;
    return errorContainer;
  }

  const container = document.createElement('div');
  container.className = 'auth-main';

  container.innerHTML = `
    <!-- Encabezado -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); flex-wrap: wrap; gap: var(--space-md);">
      <div>
        <h1 style="font-size: 1.85rem; margin-bottom: var(--space-xs);">
          Administración de Usuarios y Permisos
        </h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Gestión de cuentas del personal operativo, asignación de roles y control de credenciales.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button type="button" id="btn-crear-usuario" class="btn btn-primary btn-sm">
          <span aria-hidden="true">➕</span> Nuevo Usuario
        </button>
        <button type="button" id="btn-refrescar-usuarios" class="btn btn-secondary btn-sm">
          <span aria-hidden="true">🔄</span> Actualizar
        </button>
      </div>
    </div>

    <!-- Tabla de Usuarios -->
    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" id="tabla-usuarios">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre de Usuario</th>
              <th>Correo Electrónico</th>
              <th>Rol Asignado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-usuarios">
            <tr>
              <td colspan="6" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                Cargando usuarios...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  async function cargarUsuarios() {
    const tbody = container.querySelector('#tbody-usuarios');

    try {
      const usuarios = await api.get('/usuarios');

      if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
              No hay usuarios registrados.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = usuarios.map((u) => `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">#${u.id}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${escapeHTML(u.nombre_usuario)}</div>
            ${u.cliente_id ? `<div style="font-size: 0.75rem; color: var(--text-muted);">Asociado a Cliente #${u.cliente_id}</div>` : ''}
          </td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(u.correo)}</td>
          <td>
            <span class="badge ${u.rol === 'administrador' ? 'badge-violet' : 'badge-info'}">
              ${escapeHTML(u.rol)}
            </span>
          </td>
          <td>
            <span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">
              ${u.activo ? '✔ Activo' : 'Inactivo'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn btn-secondary btn-sm btn-cambiar-pass" data-id="${u.id}" data-usuario="${escapeHTML(u.nombre_usuario)}" title="Cambiar contraseña">
                🔑 Clave
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-editar-usuario" data-id="${u.id}" data-rol="${u.rol}" data-activo="${u.activo}" data-usuario="${escapeHTML(u.nombre_usuario)}">
                ✏ Editar
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-cambiar-pass').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const ds = e.currentTarget.dataset;
          abrirModalCambiarPassword(ds.id, ds.usuario);
        });
      });

      tbody.querySelectorAll('.btn-editar-usuario').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const ds = e.currentTarget.dataset;
          abrirModalEditarUsuario(ds.id, ds.usuario, ds.rol, ds.activo === 'true' || ds.activo === '1');
        });
      });

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--space-xl); color: #FF7582;">
            Error al consultar usuarios: ${escapeHTML(err.mensaje)}
          </td>
        </tr>
      `;
    }
  }

  // Modal para Cambiar Contraseña
  function abrirModalCambiarPassword(usuarioId, nombreUsuario) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <p style="margin-bottom: var(--space-md); font-size: 0.9rem; color: var(--text-secondary);">
        Asignación de nueva contraseña para el usuario <strong>${escapeHTML(nombreUsuario)}</strong>.
      </p>

      <form id="form-cambiar-pass" novalidate>
        <div class="form-group">
          <label for="nueva-password" class="form-label">Nueva Contraseña <span class="required">*</span></label>
          <input type="password" id="nueva-password" class="form-control" placeholder="••••••••••••" required />
          <span class="form-help">Mínimo 8 caracteres, al menos una mayúscula, un número y un símbolo.</span>
        </div>
      </form>
    `;

    crearModal({
      titulo: `Cambiar Contraseña — ${nombreUsuario}`,
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Actualizar Contraseña',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const nuevaPassword = modalContent.querySelector('#nueva-password').value;

            if (!nuevaPassword || nuevaPassword.length < 8) {
              mostrarToast('La contraseña debe tener al menos 8 caracteres', 'warning');
              return;
            }

            btnConfirm.disabled = true;

            try {
              await api.post(`/usuarios/${usuarioId}/cambiar-password`, {
                nueva_password: nuevaPassword
              });
              mostrarToast(`Contraseña actualizada para ${nombreUsuario}. Sus tokens previos quedaron invalidados.`, 'success');
              cerrar();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al cambiar contraseña', 'error');
            }
          }
        }
      ]
    });
  }

  // Modal para Editar Rol / Estado
  function abrirModalEditarUsuario(usuarioId, nombreUsuario, rolActual, activoActual) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="form-editar-usr" novalidate>
        <div class="form-group">
          <label for="usr-rol" class="form-label">Rol del Usuario</label>
          <select id="usr-rol" class="form-control">
            <option value="operador" ${rolActual === 'operador' ? 'selected' : ''}>Operador</option>
            <option value="administrador" ${rolActual === 'administrador' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>

        <div class="form-group">
          <label for="usr-activo" class="form-label">Estado de la Cuenta</label>
          <select id="usr-activo" class="form-control">
            <option value="1" ${activoActual ? 'selected' : ''}>Activo (Permite inicio de sesión)</option>
            <option value="0" ${!activoActual ? 'selected' : ''}>Inactivo (Acceso revocado)</option>
          </select>
          <span class="form-help">Desactivar un usuario invalida inmediatamente sus sesiones activas en la siguiente petición.</span>
        </div>
      </form>
    `;

    crearModal({
      titulo: `Editar Usuario — ${nombreUsuario}`,
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Guardar Cambios',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const rol = modalContent.querySelector('#usr-rol').value;
            const activo = modalContent.querySelector('#usr-activo').value === '1';

            btnConfirm.disabled = true;

            try {
              await api.patch(`/usuarios/${usuarioId}`, { rol, activo });
              mostrarToast('Usuario actualizado exitosamente', 'success');
              cerrar();
              cargarUsuarios();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al actualizar usuario', 'error');
            }
          }
        }
      ]
    });
  }

  // Modal para Crear Usuario
  function abrirModalCrearUsuario() {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="form-crear-usr" novalidate>
        <div class="form-group">
          <label for="nuevo-username" class="form-label">Nombre de Usuario <span class="required">*</span></label>
          <input type="text" id="nuevo-username" class="form-control" placeholder="ej. operador2.autoscolombia" required />
        </div>

        <div class="form-group">
          <label for="nuevo-correo" class="form-label">Correo Electrónico <span class="required">*</span></label>
          <input type="email" id="nuevo-correo" class="form-control" placeholder="operador2@autoscolombia.example" required />
        </div>

        <div class="form-group">
          <label for="nuevo-pass" class="form-label">Contraseña Inicial <span class="required">*</span></label>
          <input type="password" id="nuevo-pass" class="form-control" placeholder="••••••••••••" required />
          <span class="form-help">Mínimo 8 caracteres con letras y números.</span>
        </div>

        <div class="form-group">
          <label for="nuevo-rol" class="form-label">Rol del Sistema <span class="required">*</span></label>
          <select id="nuevo-rol" class="form-control">
            <option value="operador">Operador</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
      </form>
    `;

    crearModal({
      titulo: 'Crear Nueva Cuenta de Usuario',
      contenido: modalContent,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secondary' },
        {
          texto: 'Crear Usuario',
          clase: 'btn-primary',
          accion: async (cerrar, e) => {
            const btnConfirm = e.target;
            const nombre_usuario = modalContent.querySelector('#nuevo-username').value.trim();
            const correo = modalContent.querySelector('#nuevo-correo').value.trim();
            const password = modalContent.querySelector('#nuevo-pass').value;
            const rol = modalContent.querySelector('#nuevo-rol').value;

            if (!nombre_usuario || !correo || !password) {
              mostrarToast('Todos los campos son obligatorios', 'warning');
              return;
            }

            btnConfirm.disabled = true;

            try {
              await api.post('/usuarios', {
                nombre_usuario,
                correo,
                password,
                rol
              });
              mostrarToast(`Usuario ${nombre_usuario} creado exitosamente`, 'success');
              cerrar();
              cargarUsuarios();
            } catch (err) {
              btnConfirm.disabled = false;
              mostrarToast(err.mensaje || 'Error al crear usuario', 'error');
            }
          }
        }
      ]
    });
  }

  container.querySelector('#btn-crear-usuario').addEventListener('click', abrirModalCrearUsuario);
  container.querySelector('#btn-refrescar-usuarios').addEventListener('click', cargarUsuarios);

  cargarUsuarios();
  return container;
}
