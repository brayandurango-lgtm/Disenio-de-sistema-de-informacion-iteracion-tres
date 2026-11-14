/**
 * Modal Accesible y Reutilizable con Trampa de Foco y Retorno de Foco
 */

export function crearModal({ titulo, contenido, botones = [], alCerrar = null, elementoDisparador = null }) {
  // Guarda el elemento que abrió el modal para devolverle el foco al cerrar
  const focoPrevio = elementoDisparador || (document.activeElement instanceof HTMLElement ? document.activeElement : null);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'modal-titulo');
  backdrop.setAttribute('aria-describedby', 'modal-cuerpo');

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';

  dialog.innerHTML = `
    <div class="modal-header">
      <h3 id="modal-titulo" class="modal-title">${titulo}</h3>
      <button type="button" class="modal-close" aria-label="Cerrar ventana emergente">&times;</button>
    </div>
    <div class="modal-body" id="modal-cuerpo"></div>
    <div class="modal-footer" id="modal-acciones"></div>
  `;

  const cuerpo = dialog.querySelector('#modal-cuerpo');
  if (typeof contenido === 'string') {
    cuerpo.innerHTML = contenido;
  } else if (contenido instanceof HTMLElement) {
    cuerpo.appendChild(contenido);
  }

  const footer = dialog.querySelector('#modal-acciones');
  botones.forEach((btnConfig) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${btnConfig.clase || 'btn-secondary'}`;
    btn.textContent = btnConfig.texto;
    btn.addEventListener('click', (e) => {
      if (btnConfig.accion) {
        btnConfig.accion(cerrar, e);
      } else {
        cerrar();
      }
    });
    footer.appendChild(btn);
  });

  backdrop.appendChild(dialog);

  function obtenerElementosFoco() {
    return Array.from(dialog.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  function manejarTeclado(e) {
    if (e.key === 'Escape') {
      cerrar();
      return;
    }

    // Trampa de foco accesible (Tab y Shift+Tab dentro del modal)
    if (e.key === 'Tab') {
      const elementos = obtenerElementosFoco();
      if (elementos.length === 0) {
        e.preventDefault();
        return;
      }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  }

  function cerrar() {
    document.removeEventListener('keydown', manejarTeclado);
    backdrop.remove();
    if (alCerrar) alCerrar();

    // Devuelve el foco al elemento que disparó el modal
    if (focoPrevio && document.body.contains(focoPrevio)) {
      try {
        focoPrevio.focus();
      } catch {
        // Ignora si el elemento no puede recibir foco
      }
    }
  }

  dialog.querySelector('.modal-close').addEventListener('click', cerrar);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) cerrar();
  });

  document.addEventListener('keydown', manejarTeclado);
  document.body.appendChild(backdrop);

  // Foco inicial en el primer elemento interactivo
  const primerElemento = dialog.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), .modal-footer button');
  if (primerElemento) {
    primerElemento.focus();
  } else {
    dialog.querySelector('.modal-close')?.focus();
  }

  return { backdrop, dialog, cerrar };
}
