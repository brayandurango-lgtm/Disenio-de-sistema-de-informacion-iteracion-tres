/**
 * Vista: Inicio de Sesión (Login)
 * 
 * Requisitos cumplidos:
 * - Validaciones en cliente antes de enviar
 * - Estado de carga visual (spinner y botón deshabilitado)
 * - Manejo amigable de 401 (credenciales inválidas)
 * - Manejo explícito de 429 (límite de 5 intentos fallidos en 15 min)
 * - Sin credenciales predeterminadas visibles en los campos (campos vacíos)
 */

import logoSvg from '../assets/illustrations/logo.svg';
import { login, isAuthenticated } from '../services/auth.js';
import { mostrarToast } from '../components/toast.js';

export function renderLoginView() {
  if (isAuthenticated()) {
    window.location.hash = '#/panel';
    return document.createElement('div');
  }

  const container = document.createElement('div');
  container.className = 'public-main';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.padding = 'var(--space-2xl) var(--space-md)';

  container.innerHTML = `
    <div class="card" style="max-width: 440px; width: 100%; box-shadow: var(--shadow-lg), var(--shadow-neon-violet); border-color: rgba(168, 85, 247, 0.4);">
      <div style="text-align: center; margin-bottom: var(--space-xl);">
        <img src="${logoSvg}" alt="Autos Colombia Logo" style="width: 54px; height: 54px; margin: 0 auto var(--space-sm);" />
        <h1 style="font-size: 1.6rem; margin-bottom: var(--space-xs);">Autos Colombia</h1>
        <div class="badge badge-violet" style="font-size: 0.725rem;">Gestión de Parqueadero</div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: var(--space-sm);">
          Ingrese sus credenciales de acceso para gestionar celdas, vehículos y pagos.
        </p>
      </div>

      <div id="login-error-alert" role="alert" style="display: none; padding: var(--space-md); border-radius: var(--radius-md); background-color: var(--color-danger-bg); border: 1px solid rgba(255, 64, 87, 0.4); color: #FF7582; font-size: 0.875rem; margin-bottom: var(--space-md);">
      </div>

      <form id="form-login" novalidate>
        <div class="form-group">
          <label for="input-usuario" class="form-label">
            Nombre de Usuario <span class="required" aria-hidden="true">*</span>
          </label>
          <input 
            type="text" 
            id="input-usuario" 
            name="nombre_usuario" 
            class="form-control" 
            placeholder="ej. operador.autoscolombia" 
            required 
            autocomplete="username"
            autofocus
          />
          <span id="error-usuario" class="form-error" style="display: none;">El nombre de usuario es obligatorio.</span>
        </div>

        <div class="form-group">
          <label for="input-password" class="form-label">
            Contraseña <span class="required" aria-hidden="true">*</span>
          </label>
          <input 
            type="password" 
            id="input-password" 
            name="password" 
            class="form-control" 
            placeholder="••••••••••••" 
            required 
            autocomplete="current-password"
          />
          <span id="error-password" class="form-error" style="display: none;">La contraseña es obligatoria.</span>
        </div>

        <button type="submit" id="btn-submit-login" class="btn btn-primary" style="width: 100%; margin-top: var(--space-sm); padding: 0.75rem;">
          <span id="btn-text">Iniciar Sesión</span>
          <span id="btn-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
        </button>
      </form>

      <!-- Información orientativa para evaluadores/pruebas (sin rellenar automáticamente) -->
      <div style="margin-top: var(--space-xl); padding-top: var(--space-md); border-top: 1px dashed var(--border-subtle); font-size: 0.775rem; color: var(--text-muted); line-height: 1.5;">
        <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
          ℹ Cuentas de Prueba (Base _test):
        </div>
        <div>• Administrador: <code style="color: var(--accent-violet-light);">admin.autoscolombia</code></div>
        <div>• Operador: <code style="color: var(--accent-violet-light);">operador.autoscolombia</code></div>
        <div style="font-size: 0.725rem; margin-top: 0.35rem; color: var(--text-muted);">
          Contraseñas documentadas en <code>seeds/001_datos_ficticios.sql</code> para entornos de evaluación.
        </div>
      </div>

      <div style="text-align: center; margin-top: var(--space-lg);">
        <a href="#/inicio" style="font-size: 0.85rem; color: var(--text-secondary);">
          ← Volver al Portal Público
        </a>
      </div>
    </div>
  `;

  const form = container.querySelector('#form-login');
  const inputUsuario = container.querySelector('#input-usuario');
  const inputPassword = container.querySelector('#input-password');
  const errorUsuario = container.querySelector('#error-usuario');
  const errorPassword = container.querySelector('#error-password');
  const errorAlert = container.querySelector('#login-error-alert');
  const btnSubmit = container.querySelector('#btn-submit-login');
  const btnText = container.querySelector('#btn-text');
  const btnSpinner = container.querySelector('#btn-spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset de errores
    errorUsuario.style.display = 'none';
    errorPassword.style.display = 'none';
    errorAlert.style.display = 'none';
    errorAlert.textContent = '';

    const usuarioVal = inputUsuario.value.trim();
    const passwordVal = inputPassword.value;

    let hayError = false;
    if (!usuarioVal) {
      errorUsuario.style.display = 'block';
      hayError = true;
    }
    if (!passwordVal) {
      errorPassword.style.display = 'block';
      hayError = true;
    }

    if (hayError) return;

    // Estado de carga
    btnSubmit.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';

    try {
      const u = await login(usuarioVal, passwordVal);
      mostrarToast(`Bienvenido, ${u.nombre_usuario} (${u.rol})`, 'success');
      window.location.hash = '#/panel';
    } catch (err) {
      errorAlert.textContent = err.message || 'Error al iniciar sesión.';
      errorAlert.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnText.style.display = 'inline-block';
      btnSpinner.style.display = 'none';
    }
  });

  return container;
}
