/**
 * Sistema Accesible de Notificaciones Toast
 */

let container = null;

function asegurarContenedor() {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

export function mostrarToast(mensaje, tipo = 'info', duracionMs = 4500) {
  const c = asegurarContenedor();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');

  const iconos = {
    success: '✔',
    error: '✖',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true" style="font-weight: bold;">${iconos[tipo] || '•'}</span>
    <div class="toast-content" style="flex: 1; font-size: 0.9rem;">${mensaje}</div>
    <button type="button" class="toast-close" aria-label="Cerrar notificación" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0 0.25rem;">&times;</button>
  `;

  const btnCerrar = toast.querySelector('.toast-close');
  btnCerrar.addEventListener('click', () => {
    toast.remove();
  });

  c.appendChild(toast);

  if (duracionMs > 0) {
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }
    }, duracionMs);
  }
}
