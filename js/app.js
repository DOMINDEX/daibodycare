import { applyTheme } from './theme.js';
import { renderMenu, renderCatalog, renderOrder, emptyStateHtml } from './renderers.js';
import { Cart } from './cart.js';
import { generateWhatsAppMessage, generateInquiryMessage } from './whatsapp.js';

const els = {
    root: document.getElementById('app-root'),
    igLink: document.getElementById('ig-link'),
    waNavLink: document.getElementById('wa-nav-link'),
    heroLogo: document.getElementById('hero-logo'),
    heroTitle: document.getElementById('hero-title'),
    heroSub: document.getElementById('hero-sub'),
    heroEyebrow: document.getElementById('hero-eyebrow'),
    footerAddress: document.getElementById('footer-address'),
    footerWhatsapp: document.getElementById('footer-whatsapp'),
    footerInstagram: document.getElementById('footer-instagram'),
    footerBusiness: document.getElementById('footer-business'),
    cartFab: document.getElementById('cart-fab'),
    cartFabCount: document.getElementById('cart-fab-count'),
    offcanvasBody: document.getElementById('cart-offcanvas-body'),
    backToTop: document.getElementById('back-to-top'),
    toastContainer: document.getElementById('toast-container'),
    mapsLink: document.getElementById('maps-link'),
    footerLocation: document.getElementById('footer-location')
};

let config = null;
let catalog = null;
let cart = null;


function resolveMode() {
    const override = new URLSearchParams(window.location.search).get('mode');
    const valid = ['menu', 'catalog', 'order'];
    if (override && valid.includes(override)) return override;
    return valid.includes(config.mode) ? config.mode : 'menu';
}

async function loadData() {
    const [configRes, catalogRes] = await Promise.all([
        fetch('data/config.json'),
        fetch('data/catalog.json'),
    ]);
    if (!configRes.ok || !catalogRes.ok) {
        throw new Error('No se pudo cargar la configuración del negocio.');
    }
    config = await configRes.json();
    catalog = await catalogRes.json();
}

function renderChrome() {
    // Logo now lives once, in the hero — fallback to placeholder if missing/broken.
    els.heroLogo.src = config.logo || 'assets/logo-placeholder.svg';
    els.heroLogo.alt = `Logo de ${config.businessName || 'el negocio'}`;
    els.heroLogo.addEventListener('error', () => {
        els.heroLogo.src = 'assets/logo-placeholder.svg';
    });

    const mode = resolveMode();

    els.heroEyebrow.textContent = config.heroEyebrow || '';
    els.heroEyebrow.style.display = config.heroEyebrow ? '' : 'none';
    els.heroTitle.textContent = config.businessName || '';
    els.heroSub.textContent = config.tagline || '';
    els.heroSub.style.display = config.tagline ? '' : 'none';

    const hasWhatsapp = !!(config.whatsapp && config.enableWhatsAppOrders);
    els.waNavLink.style.display = hasWhatsapp ? '' : 'none';
    if (hasWhatsapp) {
        els.waNavLink.href = `https://wa.me/${config.whatsapp.replace(/[^\d]/g, '')}`;
    }

    els.igLink.style.display = config.instagram ? '' : 'none';
    if (config.instagram) els.igLink.href = config.instagram;

    els.footerBusiness.textContent = config.businessName || '';
    const hasLocation =
        !!config.address && !!config.googleMapsUrl;

    els.footerLocation.style.display =
        hasLocation ? '' : 'none';

    if (hasLocation) {
        els.footerAddress.innerHTML = `<i class="bi bi-geo-alt me-1" aria-hidden="true"></i>${config.address}`;
        els.footerAddress.href = config.googleMapsUrl;
    }

    els.footerWhatsapp.style.display = hasWhatsapp ? '' : 'none';
    if (hasWhatsapp) els.footerWhatsapp.href = `https://wa.me/${config.whatsapp.replace(/[^\d]/g, '')}`;

    els.footerInstagram.style.display = config.instagram ? '' : 'none';
    if (config.instagram) els.footerInstagram.href = config.instagram;

    const hasMaps = !!config.googleMapsUrl;

    els.mapsLink.style.display = hasMaps ? '' : 'none';

    if (hasMaps) {
        els.mapsLink.href = config.googleMapsUrl;
    }

    return mode;
}

/* ==========================================================================
   Cart UI (offcanvas, FAB, toast) — only meaningful in "order" mode
   ========================================================================== */

function formatMoney(value) {
    try {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: config.currency || 'ARS',
            maximumFractionDigits: 0,
        }).format(value);
    } catch (e) {
        return `$${Math.round(value).toLocaleString('es-AR')}`;
    }
}

function renderCartOffcanvas() {
    const items = cart.getItems();

    if (items.length === 0) {
        els.offcanvasBody.innerHTML = `
      <div class="cart-empty-state">
        <i class="bi bi-bag-heart" aria-hidden="true"></i>
        <p class="mb-0">
          Todavía no agregaste productos.<br>
        </p>
      </div>
    `;
        return;
    }

    const linesHtml = items
        .map(
            (item) => `
        <div class="cart-line">
          <div class="flex-grow-1">
            <div class="cart-line-title">
              ${item.qty}x ${item.title}
            </div>

            ${item.categoryName
                    ? `<small class="text-muted">${item.categoryName}</small>`
                    : ''
                }

            <div class="cart-line-price tabular-nums">
              ${formatMoney(item.price * item.qty)}
            </div>
          </div>

          <div class="qty-stepper" data-cart-stepper="${item.id}">
            <button
              type="button"
              data-step="-1"
              aria-label="Quitar uno"
            >
              −
            </button>

            <span>${item.qty}</span>

            <button
              type="button"
              data-step="1"
              aria-label="Agregar uno"
            >
              +
            </button>
          </div>

          <button
            type="button"
            class="cart-line-remove"
            data-remove-id="${item.id}"
            aria-label="Eliminar ${item.title}"
          >
            <i class="bi bi-trash3" aria-hidden="true"></i>
          </button>
        </div>
      `
        )
        .join('');

    const deliveryEnabled = config.ordering?.delivery?.enabled !== false;
    const pickupEnabled = config.ordering?.pickup?.enabled !== false;

    const deliveryFee =
        config.ordering?.delivery?.shippingCost ?? null;

    els.offcanvasBody.innerHTML = `
    <div class="cart-items-wrap">
      ${linesHtml}
    </div>

    <div class="cart-summary">
      <div class="cart-summary-row">
        <span>Subtotal</span>
        <span class="tabular-nums">
          ${formatMoney(cart.getSubtotal())}
        </span>
      </div>

      <div class="cart-summary-total">
        <span>Total</span>
        <span class="tabular-nums">
          ${formatMoney(cart.getTotal())}
        </span>
      </div>
    </div>

    <form class="checkout-form px-3 py-3" id="checkout-form" novalidate>

      <div class="mb-3">
        <label class="form-label">
          ¿Cómo querés recibir tu pedido?
        </label>

        <div class="delivery-options">

          ${deliveryEnabled
            ? `
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="delivery-method"
                    id="delivery-method-delivery"
                    value="delivery"
                    checked
                  >
                  <label
                    class="form-check-label"
                    for="delivery-method-delivery"
                  >
                    <i class="bi bi-truck me-1"></i>
                    Envío
                  </label>
                </div>
              `
            : ''
        }

          ${pickupEnabled
            ? `
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="delivery-method"
                    id="delivery-method-pickup"
                    value="pickup"
                    ${!deliveryEnabled ? 'checked' : ''}
                  >
                  <label
                    class="form-check-label"
                    for="delivery-method-pickup"
                  >
                    <i class="bi bi-shop me-1"></i>
                    Retiro
                  </label>
                </div>
              `
            : ''
        }

        </div>
      </div>

      <div class="mb-2">
        <label for="cf-name" class="form-label">
          Nombre
        </label>

        <input
          type="text"
          class="form-control"
          id="cf-name"
          required
          autocomplete="name"
        >
      </div>

      <div class="mb-2">
        <label for="cf-phone" class="form-label">
          Teléfono
        </label>

        <input
          type="tel"
          class="form-control"
          id="cf-phone"
          required
          autocomplete="tel"
        >
      </div>

      <div id="delivery-fields">

        <div class="mb-2">
          <label for="cf-address" class="form-label">
            Dirección
          </label>

          <input
            type="text"
            class="form-control"
            id="cf-address"
            autocomplete="street-address"
          >
        </div>

        <div class="mb-2">
          <label for="cf-between-streets" class="form-label">
            Entre calles
          </label>

          <input
            type="text"
            class="form-control"
            id="cf-between-streets"
            placeholder="Ej: Av. Rivadavia y Moreno"
          >
        </div>

      </div>

      <div class="mb-3">
        <label for="cf-notes" class="form-label">
          Observaciones
        </label>

        <textarea
          class="form-control"
          id="cf-notes"
          rows="2"
          placeholder="Ej: Departamento 6, Tocar timbre, etc."
        ></textarea>
      </div>

      <button
        type="submit"
        class="btn btn-primary-soft w-100 py-2"
        style="border-radius: var(--radius-sm);"
      >
        <i class="bi bi-whatsapp me-1" aria-hidden="true"></i>
        Confirmar pedido por WhatsApp
      </button>

    </form>
  `;

    const deliveryFields =
        document.getElementById('delivery-fields');

    const deliveryRadios =
        document.querySelectorAll('input[name="delivery-method"]');

    function updateDeliveryFields() {
        const selected = document.querySelector(
            'input[name="delivery-method"]:checked'
        );

        const isDelivery = selected?.value === 'delivery';

        if (deliveryFields) {
            deliveryFields.style.display = isDelivery ? '' : 'none';
        }
    }

    deliveryRadios.forEach((radio) => {
        radio.addEventListener('change', updateDeliveryFields);
    });

    updateDeliveryFields();

    els.offcanvasBody
        .querySelectorAll('[data-cart-stepper]')
        .forEach((stepper) => {
            stepper.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-step]');
                if (!btn) return;

                const id = stepper.dataset.cartStepper;
                const current = items.find((i) => i.id === id);

                if (!current) return;

                cart.updateQuantity(
                    id,
                    current.qty + parseInt(btn.dataset.step, 10)
                );
            });
        });

    els.offcanvasBody
        .querySelectorAll('[data-remove-id]')
        .forEach((btn) => {
            btn.addEventListener('click', () => {
                cart.remove(btn.dataset.removeId);
            });
        });

    const form = document.getElementById('checkout-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name =
            document.getElementById('cf-name').value.trim();

        const phone =
            document.getElementById('cf-phone').value.trim();

        const notes =
            document.getElementById('cf-notes').value.trim();

        const selectedMethod =
            document.querySelector(
                'input[name="delivery-method"]:checked'
            )?.value;

        const addressField =
            document.getElementById('cf-address');

        const betweenStreetsField =
            document.getElementById('cf-between-streets');

        const address =
            addressField?.value.trim() || '';

        const betweenStreets =
            betweenStreetsField?.value.trim() || '';

        if (!name || !phone) return;

        if (selectedMethod === 'delivery') {
            if (!address) {
                addressField?.focus();
                return;
            }

            if (
                config.ordering?.delivery?.requireBetweenStreets &&
                !betweenStreets
            ) {
                betweenStreetsField?.focus();
                return;
            }
        }

        const deliveryFee =
            selectedMethod === 'delivery'
                ? config.ordering?.delivery?.shippingCost ?? null
                : 0;

        const url = generateWhatsAppMessage(
            cart,
            {
                name,
                phone,
                notes,
                address,
                betweenStreets,
                deliveryMethod: selectedMethod,
            },
            {
                ...config,
                deliveryFee,
            }
        );

        window.open(url, '_blank', 'noopener');
    });
}

function updateFab() {
    const count = cart.getCount();
    if (!els.cartFab) return;
    if (count === 0) {
        els.cartFab.classList.add('d-none');
        return;
    }
    els.cartFab.classList.remove('d-none');
    els.cartFabCount.textContent = count;
    els.cartFab.classList.remove('bump');
    // Force reflow so the bump animation can re-trigger on rapid adds.
    void els.cartFab.offsetWidth;
    els.cartFab.classList.add('bump');
}

function showToast(message) {
    const toastEl = document.createElement('div');
    toastEl.className = 'toast dx-toast align-items-center';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body"><i class="bi bi-check-circle me-2 text-success" aria-hidden="true"></i>${message}</div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>`;
    els.toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 2200 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/* ==========================================================================
   Back to top
   ========================================================================== */

function wireBackToTop() {
    window.addEventListener('scroll', () => {
        els.backToTop.classList.toggle('visible', window.scrollY > 480);
    });
    els.backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ==========================================================================
   Bootstrap
   ========================================================================== */

function findItem(id) {
    for (const cat of catalog.categories || []) {
        const found = (cat.items || []).find((i) => i.id === id);

        if (found) {
            return {
                ...found,
                categoryId: cat.id,
                categoryName: cat.name,
            };
        }
    }

    return null;
}

async function init() {
    try {
        await loadData();
    } catch (err) {
        els.root.innerHTML = emptyStateHtml('No se pudo cargar el contenido. Intentá recargar la página.');
        return;
    }

    applyTheme(config);
    const mode = renderChrome();
    cart = new Cart(config.businessName || 'default');

    if (mode === 'menu') {
        renderMenu(config, catalog, els.root);
    } else if (mode === 'catalog') {
        renderCatalog(config, catalog, els.root);
    } else {
        renderOrder(config, catalog, els.root, cart);
    }

    const cartEnabled = config.enableCart !== false;

    if (cartEnabled) {
        renderCartOffcanvas();
        updateFab();
    } else if (els.cartFab) {
        els.cartFab.classList.add('d-none');
    }

    window.addEventListener('dx:cart-updated', () => {
        renderCartOffcanvas();
        updateFab();
    });

    window.addEventListener('dx:item-added', (e) => {
        if (e.detail?.item) showToast(`${e.detail.item.title} agregado`);
    });

    // Menu mode "Agregar" buttons feed into the same cart.
    window.addEventListener('dx:request-add', (e) => {
        const item = findItem(e.detail.id);
        if (!item) return;
        cart.add(item, 1);
        showToast(`${item.title} agregado`);
    });

    // Catalog mode "Consultar" buttons open a prefilled WhatsApp chat.
    window.addEventListener('dx:request-inquiry', (e) => {
        const item = findItem(e.detail.id);
        if (!item) return;
        const url = generateInquiryMessage(item, config);
        window.open(url, '_blank', 'noopener');
    });

    wireBackToTop();
}

init();