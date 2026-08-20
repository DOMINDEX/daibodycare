/**
 * renderers.js
 * Builds the DOM for each of the 3 modes: menu, catalog, order.
 *
 * Supports:
 * - Single product image through "image"
 * - Multiple product images through "images"
 * - Category icon fallback when there are no images
 * - Product image gallery
 * - Global image lightbox
 */

function formatPrice(price, currency) {
    if (price === null || price === undefined || price === '') {
        return 'A convenir';
    }

    try {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency || 'ARS',
            maximumFractionDigits: 0,
        }).format(price);
    } catch (e) {
        return `$${Number(price).toLocaleString('es-AR')}`;
    }
}

function escapeHtml(str) {
    if (!str) return '';

    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Returns the images configured for a product.
 *
 * Priority:
 * 1. images[]
 * 2. image
 * 3. empty array
 */
function getItemImages(item) {
    if (Array.isArray(item.images) && item.images.length > 0) {
        return item.images.filter(Boolean);
    }

    if (item.image) {
        return [item.image];
    }

    return [];
}

/**
 * Returns only categories that contain products.
 */
function visibleCategories(catalog) {
    return (catalog.categories || []).filter(
        (cat) => (cat.items || []).length > 0
    );
}

/* ==========================================================================
   CATEGORY NAVIGATION
   ========================================================================== */

function categoryNavHtml(categories) {
    return categories
        .map(
            (cat, idx) => `
      <button
        type="button"
        class="category-chip${idx === 0 ? ' active' : ''}"
        data-category-target="${escapeHtml(cat.id)}"
        aria-label="Ir a ${escapeHtml(cat.name)}"
      >
        <i
          class="bi bi-${escapeHtml(cat.icon || 'grid')}"
          aria-hidden="true"
        ></i>

        <span>${escapeHtml(cat.name)}</span>
      </button>
    `
        )
        .join('');
}

function wireCategoryNav(navSelector = '.category-scroll') {
    const nav = document.querySelector(navSelector);

    if (!nav) return;

    nav.addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');

        if (!chip) return;

        const target = document.getElementById(
            `cat-${chip.dataset.categoryTarget}`
        );

        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    });

    const sections = document.querySelectorAll(
        '[data-category-section]'
    );

    if (
        !sections.length ||
        !('IntersectionObserver' in window)
    ) {
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const id = entry.target.dataset.categorySection;

                nav.querySelectorAll('.category-chip').forEach((chip) => {
                    chip.classList.toggle(
                        'active',
                        chip.dataset.categoryTarget === id
                    );
                });
            });
        },
        {
            rootMargin: '-45% 0px -50% 0px',
            threshold: 0,
        }
    );

    sections.forEach((section) => observer.observe(section));
}

/* ==========================================================================
   IMAGE LIGHTBOX
   ========================================================================== */

let lightboxImages = [];
let lightboxIndex = 0;

function ensureLightbox() {
    if (document.getElementById('product-lightbox')) {
        return;
    }

    const lightbox = document.createElement('div');

    lightbox.id = 'product-lightbox';
    lightbox.className = 'product-lightbox';
    lightbox.setAttribute('aria-hidden', 'true');

    lightbox.innerHTML = `
    <div
      class="product-lightbox-backdrop"
      data-lightbox-close
    ></div>

    <div
      class="product-lightbox-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada del producto"
    >
      <button
        type="button"
        class="product-lightbox-close"
        data-lightbox-close
        aria-label="Cerrar"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="product-lightbox-arrow product-lightbox-prev"
        data-lightbox-prev
        aria-label="Imagen anterior"
      >
        <i class="bi bi-chevron-left" aria-hidden="true"></i>
      </button>

      <div class="product-lightbox-image-wrap">
        <img
          id="product-lightbox-image"
          class="product-lightbox-image"
          src=""
          alt=""
        >
      </div>

      <button
        type="button"
        class="product-lightbox-arrow product-lightbox-next"
        data-lightbox-next
        aria-label="Imagen siguiente"
      >
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
      </button>

      <div
        id="product-lightbox-counter"
        class="product-lightbox-counter"
      ></div>
    </div>
  `;

    document.body.appendChild(lightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target.closest('[data-lightbox-close]')) {
            closeLightbox();
            return;
        }

        if (e.target.closest('[data-lightbox-prev]')) {
            changeLightboxImage(-1);
            return;
        }

        if (e.target.closest('[data-lightbox-next]')) {
            changeLightboxImage(1);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('is-open')) {
            return;
        }

        if (e.key === 'Escape') {
            closeLightbox();
        }

        if (e.key === 'ArrowLeft') {
            changeLightboxImage(-1);
        }

        if (e.key === 'ArrowRight') {
            changeLightboxImage(1);
        }
    });
}

function openLightbox(images, index = 0, title = '') {
    if (!images || !images.length) return;

    ensureLightbox();

    lightboxImages = images;
    lightboxIndex = Math.max(
        0,
        Math.min(index, images.length - 1)
    );

    const lightbox = document.getElementById(
        'product-lightbox'
    );

    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');

    document.body.classList.add('lightbox-open');

    updateLightbox(title);
}

function closeLightbox() {
    const lightbox = document.getElementById(
        'product-lightbox'
    );

    if (!lightbox) return;

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');

    document.body.classList.remove('lightbox-open');
}

function changeLightboxImage(direction) {
    if (lightboxImages.length <= 1) return;

    lightboxIndex += direction;

    if (lightboxIndex < 0) {
        lightboxIndex = lightboxImages.length - 1;
    }

    if (lightboxIndex >= lightboxImages.length) {
        lightboxIndex = 0;
    }

    updateLightbox();
}

function updateLightbox(title = '') {
    const image = document.getElementById(
        'product-lightbox-image'
    );

    const counter = document.getElementById(
        'product-lightbox-counter'
    );

    const prev = document.querySelector(
        '[data-lightbox-prev]'
    );

    const next = document.querySelector(
        '[data-lightbox-next]'
    );

    if (!image || !counter) return;

    image.src = lightboxImages[lightboxIndex];
    image.alt = title || 'Imagen ampliada';

    if (lightboxImages.length > 1) {
        counter.textContent =
            `${lightboxIndex + 1} / ${lightboxImages.length}`;

        prev.style.display = 'flex';
        next.style.display = 'flex';
    } else {
        counter.textContent = '';

        prev.style.display = 'none';
        next.style.display = 'none';
    }
}

/**
 * Connects all product image triggers to the lightbox.
 */
function wireImageGalleries(root) {
    root.querySelectorAll(
        '[data-product-gallery]'
    ).forEach((gallery) => {
        const images = JSON.parse(
            gallery.dataset.galleryImages || '[]'
        );

        if (!images.length) return;

        gallery
            .querySelectorAll('[data-gallery-open]')
            .forEach((trigger) => {
                trigger.addEventListener('click', () => {
                    const index = Number(
                        trigger.dataset.galleryIndex || 0
                    );

                    const title =
                        gallery.dataset.galleryTitle || '';

                    openLightbox(images, index, title);
                });
            });

        gallery
            .querySelectorAll('[data-gallery-thumb]')
            .forEach((thumb) => {
                thumb.addEventListener('click', () => {
                    gallery
                        .querySelectorAll('[data-gallery-thumb]')
                        .forEach((el) =>
                            el.classList.remove('active')
                        );

                    thumb.classList.add('active');

                    const mainImage =
                        gallery.querySelector(
                            '[data-gallery-main]'
                        );

                    if (mainImage) {
                        mainImage.src =
                            thumb.dataset.galleryThumb;
                    }
                });
            });
    });
}

/**
 * Creates the product image area.
 */
function productGalleryHtml(
    item,
    categoryIcon,
    mode = 'catalog'
) {
    const images = getItemImages(item);

    /*
     * No image:
     * use category icon.
     */
    if (!images.length) {
        const className =
            mode === 'catalog'
                ? 'catalog-card-img-empty'
                : mode === 'order'
                    ? 'order-row-thumb-empty'
                    : 'menu-row-thumb-empty';

        const iconSize =
            mode === 'catalog'
                ? ''
                : '';

        return `
      <div
        class="${className}"
        aria-hidden="true"
      >
        <i class="bi bi-${escapeHtml(
            categoryIcon || 'grid'
        )}" ${iconSize}></i>
      </div>
    `;
    }

    /*
     * Menu / order:
     * Keep it compact. Multiple images still work,
     * but only the first image is visible in the row.
     */
    if (mode === 'menu' || mode === 'order') {
        const imageClass =
            mode === 'menu'
                ? 'menu-row-thumb'
                : 'order-row-thumb';

        const galleryClass =
            mode === 'menu'
                ? 'product-gallery product-gallery-compact'
                : 'product-gallery product-gallery-order';

        const encodedImages = escapeHtml(
            JSON.stringify(images)
        );

        return `
      <div
        class="${galleryClass}"
        data-product-gallery
        data-gallery-images="${encodedImages}"
        data-gallery-title="${escapeHtml(item.title)}"
      >
        <button
          type="button"
          class="product-gallery-main"
          data-gallery-open
          data-gallery-index="0"
          aria-label="Ver imagen de ${escapeHtml(item.title)}"
        >
          <img
            src="${escapeHtml(images[0])}"
            alt="${escapeHtml(item.title)}"
            class="${imageClass}"
            loading="lazy"
            width="${mode === 'menu' ? '56' : '64'}"
            height="${mode === 'menu' ? '56' : '64'}"
            data-gallery-main
          >

          ${images.length > 1
                ? `
                <span class="product-gallery-count">
                  <i class="bi bi-images" aria-hidden="true"></i>
                  ${images.length}
                </span>
              `
                : ''
            }
        </button>
      </div>
    `;
    }

    /*
     * Catalog:
     * Full gallery with thumbnails.
     */
    const encodedImages = escapeHtml(
        JSON.stringify(images)
    );

    return `
    <div
      class="product-gallery product-gallery-catalog"
      data-product-gallery
      data-gallery-images="${encodedImages}"
      data-gallery-title="${escapeHtml(item.title)}"
    >
      <button
        type="button"
        class="product-gallery-main"
        data-gallery-open
        data-gallery-index="0"
        aria-label="Ver imagen de ${escapeHtml(item.title)}"
      >
        <img
          src="${escapeHtml(images[0])}"
          alt="${escapeHtml(item.title)}"
          class="catalog-card-img"
          loading="lazy"
          data-gallery-main
        >

        <span class="product-gallery-zoom">
          <i class="bi bi-zoom-in" aria-hidden="true"></i>
        </span>

        ${images.length > 1
            ? `
              <span class="product-gallery-count">
                <i class="bi bi-images" aria-hidden="true"></i>
                ${images.length}
              </span>
            `
            : ''
        }
      </button>

      ${images.length > 1
            ? `
            <div class="product-gallery-thumbs">
              ${images
                .map(
                    (image, index) => `
                    <button
                      type="button"
                      class="product-gallery-thumb${index === 0 ? ' active' : ''
                        }"
                      data-gallery-thumb="${escapeHtml(
                            image
                        )}"
                      aria-label="Ver imagen ${index + 1}"
                    >
                      <img
                        src="${escapeHtml(image)}"
                        alt=""
                        loading="lazy"
                      >
                    </button>
                  `
                )
                .join('')}
            </div>
          `
            : ''
        }
    </div>
  `;
}

/* ==========================================================================
   MENU MODE
   ========================================================================== */

export function renderMenu(config, catalog, root) {
    const categories = visibleCategories(catalog);
    const currency = config.currency;

    const html = `
    <nav
      class="category-nav sticky-top"
      aria-label="Categorías del menú"
    >
      <div class="container">
        <div class="category-scroll">
          ${categoryNavHtml(categories)}
        </div>
      </div>
    </nav>

    <main class="container py-4">
      ${categories.length === 0
            ? emptyStateHtml(
                'No hay productos cargados todavía.'
            )
            : categories
                .map(
                    (cat) => `
                  <section
                    id="cat-${escapeHtml(cat.id)}"
                    data-category-section="${escapeHtml(
                        cat.id
                    )}"
                    class="mb-5"
                  >
                    <h2 class="section-title">
                      ${escapeHtml(cat.name)}
                    </h2>

                    <div class="menu-list">
                      ${cat.items
                            .map((item) =>
                                menuRowHtml(
                                    item,
                                    currency,
                                    config,
                                    cat.icon
                                )
                            )
                            .join('')}
                    </div>
                  </section>
                `
                )
                .join('')
        }
    </main>
  `;

    root.innerHTML = html;

    wireCategoryNav();
    wireImageGalleries(root);
    wireAddButtons(config, root);
}

function menuRowHtml(
    item,
    currency,
    config,
    categoryIcon
) {
    const unavailable = item.available === false;

    const thumb = productGalleryHtml(
        item,
        categoryIcon,
        'menu'
    );

    const priceClass =
        item.price === null ||
            item.price === undefined
            ? 'unavailable-price'
            : '';

    return `
    <article
      class="menu-row${unavailable ? ' item-unavailable' : ''
        }"
    >
      ${thumb}

      <div class="menu-row-body">

        ${item.featured && !unavailable
            ? '<span class="badge-featured">Destacado</span>'
            : ''
        }

        ${unavailable
            ? '<span class="badge-unavailable">Agotado</span>'
            : ''
        }

        <div class="menu-row-top">
          <span class="menu-row-title">
            ${escapeHtml(item.title)}
          </span>

          <span
            class="menu-row-price tabular-nums ${priceClass}"
          >
            ${formatPrice(item.price, currency)}
          </span>
        </div>

        ${item.description
            ? `
              <p class="menu-row-desc">
                ${escapeHtml(item.description)}
              </p>
            `
            : ''
        }

        ${config.enableCart && !unavailable
            ? `
              <div class="menu-row-actions">
                <button
                  type="button"
                  class="btn-add-discrete"
                  data-add-id="${escapeHtml(item.id)}"
                  aria-label="Agregar ${escapeHtml(
                item.title
            )} al pedido"
                >
                  Agregar
                </button>
              </div>
            `
            : ''
        }

      </div>
    </article>
  `;
}

/* ==========================================================================
   CATALOG MODE
   ========================================================================== */

export function renderCatalog(
    config,
    catalog,
    root
) {
    const categories = visibleCategories(catalog);

    const html = `
    <nav
      class="category-nav sticky-top"
      aria-label="Categorías del catálogo"
    >
      <div class="container">
        <div class="category-scroll">
          ${categoryNavHtml(categories)}
        </div>
      </div>
    </nav>

    <main class="container py-4">
      ${categories.length === 0
            ? emptyStateHtml(
                'No hay productos cargados todavía.'
            )
            : categories
                .map(
                    (cat) => `
                  <section
                    id="cat-${escapeHtml(cat.id)}"
                    data-category-section="${escapeHtml(
                        cat.id
                    )}"
                    class="mb-5"
                  >
                    <h2 class="section-title">
                      ${escapeHtml(cat.name)}
                    </h2>

                    <div class="row g-3 g-md-4">
                      ${cat.items
                            .map((item) =>
                                catalogCardHtml(
                                    item,
                                    config,
                                    cat.icon
                                )
                            )
                            .join('')}
                    </div>
                  </section>
                `
                )
                .join('')
        }
    </main>
  `;

    root.innerHTML = html;

    wireCategoryNav();
    wireImageGalleries(root);
    wireInquiryButtons(config, root);
    wireAddButtons(config, root);
}

function catalogCardHtml(
    item,
    config,
    categoryIcon
) {
    const unavailable = item.available === false;

    const hasPrice =
        item.price !== null &&
        item.price !== undefined &&
        item.price !== '';

    const gallery = productGalleryHtml(
        item,
        categoryIcon,
        'catalog'
    );

    return `
    <div class="col-6 col-md-4 col-lg-3">
      <article
        class="catalog-card${unavailable ? ' item-unavailable' : ''}"
      >

        ${gallery}

        <div class="catalog-card-body">

          ${item.featured && !unavailable
            ? '<span class="badge-featured">Destacado</span>'
            : ''
        }

          ${unavailable
            ? '<span class="badge-unavailable">No disponible</span>'
            : ''
        }

          <h3 class="catalog-card-title">
            ${escapeHtml(item.title)}
          </h3>

          ${item.description
            ? `
                <p class="catalog-card-desc">
                  ${escapeHtml(item.description)}
                </p>
              `
            : '<div class="catalog-card-desc"></div>'
        }

          <div class="catalog-card-footer">

            <span class="catalog-card-price tabular-nums">
              ${formatPrice(item.price, config.currency)}
            </span>

            ${!unavailable
            ? hasPrice && config.enableCart
                ? `
                    <button
                      type="button"
                      class="btn-primary-soft"
                      data-add-id="${item.id}"
                    >
                      Agregar
                    </button>
                  `
                : config.enableWhatsAppOrders
                    ? `
                      <button
                        type="button"
                        class="btn-primary-soft"
                        data-inquire-id="${item.id}"
                      >
                        Consultar
                      </button>
                    `
                    : ''
            : ''
        }

          </div>

        </div>
      </article>
    </div>
  `;
}

/* ==========================================================================
   ORDER MODE
   ========================================================================== */

export function renderOrder(
    config,
    catalog,
    root,
    cart
) {
    const categories = visibleCategories(catalog);
    const currency = config.currency;

    const html = `
    <nav
      class="category-nav sticky-top"
      aria-label="Categorías del pedido"
    >
      <div class="container">
        <div class="category-scroll">
          ${categoryNavHtml(categories)}
        </div>
      </div>
    </nav>

    <main class="container py-4 pb-5">
      ${categories.length === 0
            ? emptyStateHtml(
                'No hay productos cargados todavía.'
            )
            : categories
                .map(
                    (cat) => `
                  <section
                    id="cat-${escapeHtml(cat.id)}"
                    data-category-section="${escapeHtml(
                        cat.id
                    )}"
                    class="mb-5"
                  >
                    <h2 class="section-title">
                      ${escapeHtml(cat.name)}
                    </h2>

                    <div class="order-list">
                      ${cat.items
                            .map((item) =>
                                orderRowHtml(
                                    item,
                                    currency,
                                    cat.icon
                                )
                            )
                            .join('')}
                    </div>
                  </section>
                `
                )
                .join('')
        }
    </main>
  `;

    root.innerHTML = html;

    wireCategoryNav();
    wireImageGalleries(root);
    wireOrderStepper(
        cart,
        catalog,
        root
    );
}

function orderRowHtml(
    item,
    currency,
    categoryIcon
) {
    const unavailable =
        item.available === false;

    const thumb = productGalleryHtml(
        item,
        categoryIcon,
        'order'
    );

    return `
    <article
      class="order-row${unavailable ? ' item-unavailable' : ''
        }"
      data-item-row="${escapeHtml(item.id)}"
    >

      ${thumb}

      <div class="order-row-body">

        ${item.featured && !unavailable
            ? '<span class="badge-featured">Destacado</span>'
            : ''
        }

        ${unavailable
            ? '<span class="badge-unavailable">Sin stock</span>'
            : ''
        }

        <div class="order-row-title">
          ${escapeHtml(item.title)}
        </div>

        ${item.description
            ? `
              <p class="order-row-desc">
                ${escapeHtml(item.description)}
              </p>
            `
            : ''
        }

        <div
          class="d-flex align-items-center justify-content-between"
        >
          <span
            class="order-row-price tabular-nums"
          >
            ${formatPrice(
            item.price,
            currency
        )}
          </span>

          ${unavailable
            ? ''
            : `
                <div
                  class="qty-stepper"
                  data-stepper-id="${escapeHtml(
                item.id
            )}"
                >
                  <button
                    type="button"
                    data-step="-1"
                    aria-label="Quitar una unidad de ${escapeHtml(
                item.title
            )}"
                  >
                    −
                  </button>

                  <span
                    data-qty-display="${escapeHtml(
                item.id
            )}"
                  >
                    0
                  </span>

                  <button
                    type="button"
                    data-step="1"
                    aria-label="Agregar una unidad de ${escapeHtml(
                item.title
            )}"
                  >
                    +
                  </button>
                </div>
              `
        }

        </div>
      </div>
    </article>
  `;
}

function wireOrderStepper(
    cart,
    catalog,
    root
) {
    const allItems = {};

    (catalog.categories || []).forEach(
        (cat) => {
            (cat.items || []).forEach(
                (item) => {
                    allItems[item.id] = item;
                }
            );
        }
    );

    function syncQtyDisplays() {
        const items = cart.getItems();

        root
            .querySelectorAll('[data-qty-display]')
            .forEach((el) => {
                const id = el.dataset.qtyDisplay;

                const found = items.find(
                    (i) => i.id === id
                );

                el.textContent = found
                    ? found.qty
                    : 0;
            });
    }

    root
        .querySelectorAll('[data-stepper-id]')
        .forEach((stepper) => {
            stepper.addEventListener(
                'click',
                (e) => {
                    const btn =
                        e.target.closest(
                            'button[data-step]'
                        );

                    if (!btn) return;

                    const id =
                        stepper.dataset.stepperId;

                    const item = allItems[id];

                    if (!item) return;

                    const current =
                        cart
                            .getItems()
                            .find(
                                (i) => i.id === id
                            );

                    const delta = parseInt(
                        btn.dataset.step,
                        10
                    );

                    if (delta > 0) {
                        cart.add(item, 1);

                        window.dispatchEvent(
                            new CustomEvent(
                                'dx:item-added',
                                {
                                    detail: { item },
                                }
                            )
                        );
                    } else if (current) {
                        cart.updateQuantity(
                            id,
                            current.qty - 1
                        );
                    }
                }
            );
        });

    window.addEventListener(
        'dx:cart-updated',
        syncQtyDisplays
    );

    syncQtyDisplays();
}

/* ==========================================================================
   SHARED
   ========================================================================== */

function wireAddButtons(
    config,
    root
) {
    root.addEventListener(
        'click',
        (e) => {
            const btn =
                e.target.closest(
                    '[data-add-id]'
                );

            if (!btn) return;

            window.dispatchEvent(
                new CustomEvent(
                    'dx:request-add',
                    {
                        detail: {
                            id: btn.dataset.addId,
                        },
                    }
                )
            );
        }
    );
}

function wireInquiryButtons(
    config,
    root
) {
    root.addEventListener(
        'click',
        (e) => {
            const btn =
                e.target.closest(
                    '[data-inquire-id]'
                );

            if (!btn) return;

            window.dispatchEvent(
                new CustomEvent(
                    'dx:request-inquiry',
                    {
                        detail: {
                            id: btn.dataset.inquireId,
                        },
                    }
                )
            );
        }
    );
}

export function emptyStateHtml(
    message
) {
    return `
    <div class="empty-state">
      <i
        class="bi bi-inboxes"
        style="
          font-size:2rem;
          color:var(--primary);
          opacity:.5;
        "
        aria-hidden="true"
      ></i>

      <p class="mt-2 mb-0">
        ${escapeHtml(message)}
      </p>
    </div>
  `;
}