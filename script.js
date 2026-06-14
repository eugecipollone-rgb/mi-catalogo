/**
 * CATÁLOGO WEB — script.js
 * Conecta con Google Sheets vía Apps Script Web App (JSON API)
 * Funcionalidades: carga dinámica, búsqueda, filtros, ordenamiento, modal, WhatsApp.
 */

/* ============================================================
   ⚙️  CONFIGURACIÓN — Editá solo estas variables
   ============================================================ */
const CONFIG = {
  // 👇 Pegá aquí la URL de tu Google Apps Script Web App
  // Guía completa al final de este archivo y en el README.md
  SHEETS_URL: 'https://script.google.com/macros/s/TU_ID_AQUI/exec',

  // Número de WhatsApp para consultas (sin + ni espacios)
  // Formato: código de país + número. Ej: 5491123456789
  WA_NUMBER: '5491100000000',

  // Moneda y separador de miles
  CURRENCY_SYMBOL: '$',
  LOCALE: 'es-AR',         // Para formatear precios

  // Intervalo de actualización automática en milisegundos (0 = desactivado)
  // 300000 = 5 minutos
  AUTO_REFRESH: 300000,
};

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let allProducts  = [];   // Todos los productos cargados
let activeFilter = 'todas';

/* ============================================================
   REFERENCIAS DOM
   ============================================================ */
const dom = {
  grid:        document.getElementById('grid'),
  loading:     document.getElementById('loading'),
  error:       document.getElementById('error'),
  noResults:   document.getElementById('noResults'),
  searchInput: document.getElementById('searchInput'),
  sortSelect:  document.getElementById('sortSelect'),
  filters:     document.getElementById('filters'),
  retryBtn:    document.getElementById('retryBtn'),
  year:        document.getElementById('year'),
  // Modal
  overlay:     document.getElementById('modalOverlay'),
  modalClose:  document.getElementById('modalClose'),
  modalImg:    document.getElementById('modalImg'),
  modalCat:    document.getElementById('modalCat'),
  modalTitle:  document.getElementById('modalTitle'),
  modalDesc:   document.getElementById('modalDesc'),
  modalCode:   document.getElementById('modalCode'),
  modalPrice:  document.getElementById('modalPrice'),
  modalWA:     document.getElementById('modalWA'),
  // Menú móvil
  hamburger:   document.getElementById('hamburger'),
  navMobile:   document.getElementById('navMobile'),
};

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  dom.year.textContent = new Date().getFullYear();
  initMobileMenu();
  initContactForm();
  initModal();
  loadProducts();

  // Auto-refresh
  if (CONFIG.AUTO_REFRESH > 0) {
    setInterval(loadProducts, CONFIG.AUTO_REFRESH);
  }

  // Eventos de búsqueda y ordenamiento
  dom.searchInput.addEventListener('input', renderFiltered);
  dom.sortSelect.addEventListener('change', renderFiltered);
  dom.retryBtn.addEventListener('click', loadProducts);
});

/* ============================================================
   CARGA DE PRODUCTOS DESDE GOOGLE SHEETS
   ============================================================ */
async function loadProducts() {
  showState('loading');

  try {
    const res  = await fetch(CONFIG.SHEETS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // El Apps Script devuelve { productos: [...] }
    allProducts = data.productos || data || [];

    buildFilters();
    renderFiltered();
    showState('grid');
  } catch (err) {
    console.error('Error al cargar productos:', err);
    showState('error');
  }
}

/* ============================================================
   FILTROS DE CATEGORÍA
   ============================================================ */
function buildFilters() {
  // Obtener categorías únicas preservando orden de aparición
  const cats = ['todas', ...new Set(allProducts.map(p => p.Categoría || p.categoria || '').filter(Boolean))];

  dom.filters.innerHTML = cats.map(cat =>
    `<button class="filter-btn${cat === activeFilter ? ' filter-btn--active' : ''}" data-cat="${cat}">
      ${cat === 'todas' ? 'Todas' : cat}
    </button>`
  ).join('');

  dom.filters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.cat;
      dom.filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      renderFiltered();
    });
  });
}

/* ============================================================
   FILTRAR, BUSCAR Y ORDENAR
   ============================================================ */
function renderFiltered() {
  const query = dom.searchInput.value.trim().toLowerCase();
  const sort  = dom.sortSelect.value;

  let products = [...allProducts];

  // Filtro por categoría
  if (activeFilter !== 'todas') {
    products = products.filter(p =>
      (p.Categoría || p.categoria || '').toLowerCase() === activeFilter.toLowerCase()
    );
  }

  // Búsqueda
  if (query) {
    products = products.filter(p =>
      (p.Producto  || p.producto  || '').toLowerCase().includes(query) ||
      (p.Código    || p.codigo    || '').toString().toLowerCase().includes(query) ||
      (p.Descripción || p.descripcion || '').toLowerCase().includes(query)
    );
  }

  // Ordenamiento
  products = sortProducts(products, sort);

  // Render
  if (products.length === 0) {
    dom.grid.innerHTML = '';
    dom.noResults.hidden = false;
  } else {
    dom.noResults.hidden = true;
    renderGrid(products);
  }
}

function sortProducts(list, key) {
  const copy = [...list];
  switch (key) {
    case 'nombre-az':   return copy.sort((a, b) => getName(a).localeCompare(getName(b)));
    case 'nombre-za':   return copy.sort((a, b) => getName(b).localeCompare(getName(a)));
    case 'precio-asc':  return copy.sort((a, b) => getPrice(a) - getPrice(b));
    case 'precio-desc': return copy.sort((a, b) => getPrice(b) - getPrice(a));
    default:            return copy;
  }
}

/* ============================================================
   RENDERIZAR GRILLA
   ============================================================ */
function renderGrid(products) {
  dom.grid.innerHTML = products.map((p, i) => cardHTML(p, i)).join('');

  // Eventos click en tarjetas
  dom.grid.querySelectorAll('.card').forEach((card, i) => {
    card.addEventListener('click', () => openModal(products[i]));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(products[i]); });
  });
}

function cardHTML(p, index) {
  const name  = getName(p);
  const price = getPrice(p);
  const cat   = p.Categoría || p.categoria || '';
  const desc  = p.Descripción || p.descripcion || '';
  const code  = p.Código || p.codigo || '';
  const img   = p.Imagen || p.imagen || '';
  const delay = Math.min(index * 40, 400);

  const imgContent = img
    ? `<img class="card__img" src="${escHtml(img)}" alt="${escHtml(name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card__img-placeholder\\'>🧩</div>'">`
    : `<div class="card__img-placeholder">🧩</div>`;

  return `
    <article class="card" tabindex="0" style="animation-delay:${delay}ms" role="button" aria-label="Ver detalles de ${escHtml(name)}">
      <div class="card__img-wrap">
        ${imgContent}
        ${cat ? `<span class="card__cat">${escHtml(cat)}</span>` : ''}
      </div>
      <div class="card__body">
        <h3 class="card__name">${escHtml(name)}</h3>
        <p class="card__desc">${escHtml(desc)}</p>
        <div class="card__footer">
          <span class="card__price">${formatPrice(price)}</span>
          ${code ? `<span class="card__code">#${escHtml(String(code))}</span>` : ''}
        </div>
      </div>
    </article>`;
}

/* ============================================================
   MODAL DE DETALLE
   ============================================================ */
function openModal(p) {
  const name  = getName(p);
  const price = getPrice(p);
  const cat   = p.Categoría || p.categoria || '';
  const desc  = p.Descripción || p.descripcion || '';
  const code  = p.Código || p.codigo || '';
  const img   = p.Imagen || p.imagen || '';

  dom.modalImg.src = img || '';
  dom.modalImg.alt = name;
  dom.modalImg.style.display = img ? 'block' : 'none';
  dom.modalCat.textContent   = cat;
  dom.modalTitle.textContent = name;
  dom.modalDesc.textContent  = desc;
  dom.modalCode.textContent  = code ? `Código: #${code}` : '';
  dom.modalPrice.textContent = formatPrice(price);

  const waMsg = `Hola! Me interesa el producto: *${name}* (Cód. ${code}). ¿Está disponible?`;
  dom.modalWA.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  dom.overlay.hidden = false;
  dom.overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  dom.modalClose.focus();
}

function closeModal() {
  dom.overlay.hidden = true;
  document.body.style.overflow = '';
}

function initModal() {
  dom.modalClose.addEventListener('click', closeModal);
  dom.overlay.addEventListener('click', e => { if (e.target === dom.overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ============================================================
   MENÚ MÓVIL
   ============================================================ */
function initMobileMenu() {
  dom.hamburger.addEventListener('click', () => {
    const open = dom.navMobile.classList.toggle('open');
    dom.hamburger.setAttribute('aria-expanded', String(open));
    dom.navMobile.setAttribute('aria-hidden', String(!open));
  });

  // Cerrar al hacer click en link
  dom.navMobile.querySelectorAll('.nav-mobile__link').forEach(link => {
    link.addEventListener('click', () => {
      dom.navMobile.classList.remove('open');
      dom.hamburger.setAttribute('aria-expanded', 'false');
      dom.navMobile.setAttribute('aria-hidden', 'true');
    });
  });
}

/* ============================================================
   FORMULARIO DE CONTACTO
   ============================================================ */
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    form.querySelectorAll('[required]').forEach(field => {
      field.classList.remove('error-field');
      if (!field.value.trim()) {
        field.classList.add('error-field');
        valid = false;
      }
    });

    if (!valid) return;

    // Simulación de envío (sin back-end real)
    // Para conectar con un back-end real, reemplazá por un fetch() a tu API o Formspree
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Enviando…';
    btn.disabled = true;

    await new Promise(r => setTimeout(r, 1000)); // Simula delay de red

    form.reset();
    btn.textContent = 'Enviar mensaje';
    btn.disabled = false;
    success.hidden = false;
    setTimeout(() => { success.hidden = true; }, 5000);
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

/** Normaliza nombre de producto para distintos formatos de columna */
function getName(p) {
  return p.Producto || p.producto || p.nombre || p.Nombre || '';
}

/** Normaliza precio a número */
function getPrice(p) {
  const raw = p.Precio || p.precio || 0;
  return parseFloat(String(raw).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
}

/** Formatea precio con separadores locales */
function formatPrice(n) {
  if (!n) return 'Consultar';
  return CONFIG.CURRENCY_SYMBOL + n.toLocaleString(CONFIG.LOCALE);
}

/** Escapa HTML para evitar XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Muestra solo el estado pedido (loading | error | grid) */
function showState(state) {
  dom.loading.style.display  = state === 'loading' ? 'flex'  : 'none';
  dom.error.hidden            = state !== 'error';
  dom.grid.style.display     = state === 'grid'    ? 'grid'  : 'none';
}


/* ============================================================
   GOOGLE APPS SCRIPT — Código para tu hoja
   ============================================================
   Copiá el siguiente código en tu Apps Script y publicalo como Web App.

   function doGet() {
     const ss   = SpreadsheetApp.getActiveSpreadsheet();
     const hoja = ss.getSheetByName('Productos'); // Cambiá el nombre si es diferente
     const data = hoja.getDataRange().getValues();
     const headers = data[0];

     const productos = data.slice(1)
       .filter(row => row[0]) // Ignorar filas vacías
       .map(row => {
         const obj = {};
         headers.forEach((h, i) => { obj[h] = row[i]; });
         return obj;
       });

     return ContentService
       .createTextOutput(JSON.stringify({ productos }))
       .setMimeType(ContentService.MimeType.JSON);
   }

   PASOS para publicar:
   1. Abrí tu Google Sheet → Extensiones → Apps Script
   2. Pegá el código de arriba (función doGet)
   3. Guardá (Ctrl+S)
   4. Hacé clic en "Implementar" → "Nueva implementación"
   5. Tipo: Aplicación web
   6. Ejecutar como: Yo
   7. Acceso: Cualquier persona
   8. Hacé clic en "Implementar" y copiá la URL
   9. Pegá esa URL en CONFIG.SHEETS_URL al inicio de este archivo

   ============================================================ */
