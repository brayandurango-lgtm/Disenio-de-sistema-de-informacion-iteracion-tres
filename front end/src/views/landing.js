/**
 * Vista: Portada y Portal Público (Autos Colombia — Cyber)
 */

import heroParkingSvg from '../assets/illustrations/hero-cyber-parking.svg';
import automovilSvg from '../assets/illustrations/automovil.svg';
import motocicletaSvg from '../assets/illustrations/motocicleta.svg';
import camionetaSvg from '../assets/illustrations/camioneta.svg';
import busSvg from '../assets/illustrations/bus.svg';
import camionSvg from '../assets/illustrations/camion.svg';
import { VEHICULOS_DEMO } from '../data/catalogo-demostrativo.js';
import { CONFIG_CONTACTO_Y_SEDES } from '../data/config-sedes.js';
import { escapeHTML } from '../utils/formatters.js';
import { crearModal } from '../components/modal.js';

export function renderLandingView() {
  const container = document.createElement('div');
  container.className = 'public-main';

  container.innerHTML = `
    <!-- Sección Hero Principal -->
    <section class="public-section" style="padding-top: var(--space-xl);">
      <div class="hero-grid" style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: var(--space-2xl); align-items: center;">
        <div>
          <div class="section-tagline">Infraestructura Inteligente • Mensualidades</div>
          <h1 style="font-size: 2.75rem; margin-bottom: var(--space-md); line-height: 1.15;">
            Control Integral de <span style="color: var(--accent-violet-light);">Parqueadero</span> y Recaudo Digital
          </h1>
          <p style="font-size: 1.1rem; margin-bottom: var(--space-xl); color: var(--text-secondary);">
            Sistema académico especializado en la gestión de vehículos, asignación de celdas y control estricto de mensualidades con comprobantes internos e idempotencia verificada.
          </p>
          <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
            <a href="#/login" class="btn btn-primary btn-lg">
              <span aria-hidden="true">🔐</span> Acceder al Sistema
            </a>
            <a href="#/catalogo-demo" class="btn btn-secondary btn-lg">
              <span aria-hidden="true">🚘</span> Catálogo Demostrativo
            </a>
          </div>
        </div>
        <div style="text-align: center;">
          <img 
            src="${heroParkingSvg}" 
            alt="Ilustración de la estación inteligente de parqueadero Autos Colombia con celdas digitalizadas" 
            style="width: 100%; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-neon-violet);" 
            width="900" 
            height="420"
          />
        </div>
      </div>
    </section>

    <!-- Sección de Vehículos Soportados (Ilustraciones Grandes) -->
    <section id="servicios" class="public-section" style="border-top: 1px solid var(--border-subtle);">
      <div class="section-header">
        <div class="section-tagline">Capacidad Multimodal</div>
        <h2 class="section-title">Tipos de Vehículos Autorizados</h2>
        <p class="section-desc">Celdas adaptadas y tarifas diferenciadas para la movilidad urbana y de carga nacional.</p>
      </div>

      <div class="grid-cards">
        <div class="card" style="text-align: center;">
          <img src="${automovilSvg}" alt="Vehículo terrestre tipo automóvil o sedán deportivo" style="height: 120px; margin: 0 auto var(--space-md); object-fit: contain;" width="600" height="320" loading="lazy" />
          <h3 style="margin-bottom: var(--space-xs);">Automóviles</h3>
          <p style="font-size: 0.875rem;">Sedanes y compactos con celdas cubiertas protegidas contra intemperie.</p>
        </div>

        <div class="card" style="text-align: center;">
          <img src="${motocicletaSvg}" alt="Vehículo terrestre tipo motocicleta urbana" style="height: 120px; margin: 0 auto var(--space-md); object-fit: contain;" width="500" height="320" loading="lazy" />
          <h3 style="margin-bottom: var(--space-xs);">Motocicletas</h3>
          <p style="font-size: 0.875rem;">Bahías ágiles con anclaje de seguridad y tarifa de mensualidad optimizada.</p>
        </div>

        <div class="card" style="text-align: center;">
          <img src="${camionetaSvg}" alt="Vehículo terrestre utilitario deportivo tipo camioneta o SUV 4x4" style="height: 120px; margin: 0 auto var(--space-md); object-fit: contain;" width="600" height="340" loading="lazy" />
          <h3 style="margin-bottom: var(--space-xs);">Camionetas y SUV</h3>
          <p style="font-size: 0.875rem;">Espacios de mayor gálibo y maniobrabilidad para vehículos familiares y 4x4.</p>
        </div>

        <div class="card" style="text-align: center;">
          <img src="${busSvg}" alt="Vehículo de transporte de pasajeros tipo bus" style="height: 120px; margin: 0 auto var(--space-md); object-fit: contain;" width="650" height="340" loading="lazy" />
          <h3 style="margin-bottom: var(--space-xs);">Buses</h3>
          <p style="font-size: 0.875rem;">Bahías de alto tonelaje para transporte colectivo e intermunicipal.</p>
        </div>

        <div class="card" style="text-align: center;">
          <img src="${camionSvg}" alt="Vehículo de transporte de carga pesada tipo camión" style="height: 120px; margin: 0 auto var(--space-md); object-fit: contain;" width="650" height="340" loading="lazy" />
          <h3 style="margin-bottom: var(--space-xs);">Camiones de Carga</h3>
          <p style="font-size: 0.875rem;">Zonas de estacionamiento logístico con seguridad perimetral continua.</p>
        </div>
      </div>
    </section>

    <!-- Módulos Operativos del Parqueadero -->
    <section class="public-section" style="border-top: 1px solid var(--border-subtle); background-color: var(--bg-surface);">
      <div class="section-header">
        <div class="section-tagline">Arquitectura Funcional</div>
        <h2 class="section-title">Estructura por Iteraciones Académicas</h2>
        <p class="section-desc">Diseñado bajo estándares de ingeniería de software con separación estricta de responsabilidades.</p>
      </div>

      <div class="grid-3">
        <div class="card" style="background-color: var(--bg-main);">
          <div class="badge badge-info" style="margin-bottom: var(--space-md);">Iteración 1</div>
          <h3 style="margin-bottom: var(--space-sm);">Control Operativo</h3>
          <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">
            <li>Registro y normalización de placas vehiculares.</li>
            <li>Entradas y salidas en tiempo real con asignación de celda.</li>
            <li>Registro histórico de novedades e incidentes de vehículos.</li>
          </ul>
        </div>

        <div class="card" style="background-color: var(--bg-main);">
          <div class="badge badge-info" style="margin-bottom: var(--space-md);">Iteración 2</div>
          <h3 style="margin-bottom: var(--space-sm);">Clientes y Contratos</h3>
          <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">
            <li>Gestión de clientes y cuentas con roles diferenciados.</li>
            <li>Celdas operativas (cubiertas/techadas) y estado derivado.</li>
            <li>Contratos de mensualidad con vigencia calendario y tarifa fija.</li>
          </ul>
        </div>

        <div class="card" style="background-color: var(--bg-main); border-color: var(--accent-violet);">
          <div class="badge badge-violet" style="margin-bottom: var(--space-md);">Iteración 3 (Foco Actual)</div>
          <h3 style="margin-bottom: var(--space-sm); color: var(--accent-violet-light);">Obligaciones y Pagos</h3>
          <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">
            <li>Generación explícita de mensualidades (YYYY-MM).</li>
            <li>Registro de pago idempotente (prevención de duplicados).</li>
            <li>Comprobante interno consecutivo numerado (CMP-AAAA-NNNNNN).</li>
            <li>Anulación atómica con auditoría exclusiva para administradores.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Catálogo Demostrativo Separado -->
    <section id="catalogo-demo" class="public-section" style="border-top: 1px solid var(--border-subtle);">
      <div class="section-header">
        <div class="badge badge-demo" style="margin-bottom: var(--space-xs);">Alcance Demostrativo</div>
        <h2 class="section-title">Muestra Visual de Vehículos</h2>
        <p class="section-desc">
          Tarjetas demostrativas solicitadas para visualización conceptual. 
          <strong>Aviso:</strong> Los precios y vehículos son ficticios y no forman parte del servicio de parqueadero ni constituyen una tienda comercial.
        </p>
      </div>

      <div class="grid-cards">
        ${VEHICULOS_DEMO.map((v) => `
          <div class="card card-interactive" data-demo-id="${escapeHTML(v.id)}">
            <div style="position: absolute; top: 1rem; right: 1rem;">
              <span class="badge badge-demo">${escapeHTML(v.etiqueta)}</span>
            </div>
            <img src="${v.ilustracion}" alt="${escapeHTML(v.nombre)}" style="height: 140px; margin: var(--space-md) auto; object-fit: contain;" width="600" height="320" loading="lazy" />
            <div class="badge badge-violet" style="margin-bottom: var(--space-xs);">${escapeHTML(v.tipo)}</div>
            <h3 style="font-size: 1.15rem; margin-bottom: var(--space-xs);">${escapeHTML(v.nombre)}</h3>
            <p style="font-size: 0.85rem; margin-bottom: var(--space-md);">${escapeHTML(v.descripcion)}</p>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: var(--space-sm);">
              ${v.especificaciones.slice(0, 2).map((e) => `<div>• ${escapeHTML(e)}</div>`).join('')}
            </div>
            <div style="margin-top: auto; padding-top: var(--space-md); border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Precio Ilustrativo</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-violet-light); font-family: var(--font-mono);">${escapeHTML(v.precioFormateado)}</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm btn-ficha-demo" data-id="${escapeHTML(v.id)}">
                Ficha Técnica
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Sección de Sedes y Contacto (Configuración Centralizada Transparente) -->
    <section id="contacto" class="public-section" style="border-top: 1px solid var(--border-subtle); background-color: var(--bg-surface);">
      <div class="section-header">
        <div class="section-tagline">Canales Oficiales</div>
        <h2 class="section-title">Sedes y Atención al Usuario</h2>
        <p class="section-desc">${escapeHTML(CONFIG_CONTACTO_Y_SEDES.estadoConfirmacion)}</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);">
            <span aria-hidden="true">📍</span> Sedes del Parqueadero
          </h3>
          ${CONFIG_CONTACTO_Y_SEDES.sedes.map((s) => `
            <div style="padding: var(--space-md); background-color: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: var(--space-sm);">
              <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${escapeHTML(s.nombre)}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${escapeHTML(s.ciudad)}</div>
              <div style="font-size: 0.85rem; color: var(--color-warning); font-style: italic; margin-bottom: 0.5rem;">${escapeHTML(s.direccion)}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Capacidad proyectada: ${escapeHTML(s.capacidadEstimada)}</div>
            </div>
          `).join('')}
        </div>

        <div class="card">
          <h3 style="margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);">
            <span aria-hidden="true">📞</span> Información de Contacto
          </h3>
          <div style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div style="padding: var(--space-md); background-color: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Línea Telefónica</div>
              <div style="font-size: 0.95rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${escapeHTML(CONFIG_CONTACTO_Y_SEDES.canales.telefono.mensaje)}
              </div>
            </div>

            <div style="padding: var(--space-md); background-color: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Buzón Académico</div>
              <div style="font-size: 0.95rem; color: var(--accent-violet-light); font-family: var(--font-mono); margin-top: 0.25rem;">
                ${escapeHTML(CONFIG_CONTACTO_Y_SEDES.canales.correo.valor)}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${escapeHTML(CONFIG_CONTACTO_Y_SEDES.canales.correo.nota)}</div>
            </div>

            <div style="padding: var(--space-md); background-color: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Horario Operativo</div>
              <div style="font-size: 0.95rem; color: var(--text-primary); margin-top: 0.25rem;">
                ${escapeHTML(CONFIG_CONTACTO_Y_SEDES.canales.horarioAtencion.valor)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer Público -->
    <footer style="padding: var(--space-xl); border-top: 1px solid var(--border-subtle); background-color: var(--bg-main); text-align: center;">
      <div style="max-width: 1000px; margin: 0 auto; font-size: 0.85rem; color: var(--text-muted);">
        <p style="margin-bottom: var(--space-xs);">
          <strong>Autos Colombia</strong> — Proyecto Académico de Diseño de Sistemas de Información (Iteración 3).
        </p>
        <p style="font-size: 0.775rem;">
          ${escapeHTML(CONFIG_CONTACTO_Y_SEDES.politicas.facturacion)}
        </p>
      </div>
    </footer>
  `;

  // Listener para botones de ficha técnica demostrativa (sustituye cualquier alert())
  container.querySelectorAll('.btn-ficha-demo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const demoId = e.currentTarget.dataset.id;
      const vehiculo = VEHICULOS_DEMO.find((v) => v.id === demoId);
      if (!vehiculo) return;

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: var(--space-md);">
          <img src="${vehiculo.ilustracion}" alt="${escapeHTML(vehiculo.nombre)}" style="height: 160px; margin: 0 auto; object-fit: contain;" />
        </div>
        <div style="margin-bottom: var(--space-md); padding: var(--space-sm) var(--space-md); background-color: rgba(245, 158, 11, 0.12); border-left: 3px solid #F59E0B; border-radius: var(--radius-sm); font-size: 0.825rem; color: #FCD34D;">
          <strong>Aviso de Alcance Demostrativo:</strong> Este vehículo es una muestra conceptual solicitada para visualización. No está disponible para venta ni constituye una operación comercial del parqueadero.
        </div>
        <p style="font-size: 0.925rem; color: var(--text-secondary); margin-bottom: var(--space-md);">${escapeHTML(vehiculo.descripcion)}</p>
        <h4 style="font-size: 0.9rem; margin-bottom: var(--space-xs); color: var(--text-primary);">Especificaciones Técnicas Ficticias:</h4>
        <ul style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-md); line-height: 1.6;">
          ${vehiculo.especificaciones.map((spec) => `<li>${escapeHTML(spec)}</li>`).join('')}
        </ul>
        <div style="padding-top: var(--space-sm); border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Precio Ilustrativo Referencial:</span>
          <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: var(--accent-violet-light);">${escapeHTML(vehiculo.precioFormateado)}</span>
        </div>
      `;

      crearModal({
        titulo: `Ficha Demostrativa — ${vehiculo.nombre}`,
        contenido: modalBody,
        botones: [{ texto: 'Cerrar', clase: 'btn-secondary' }],
        elementoDisparador: e.currentTarget
      });
    });
  });

  return container;
}
