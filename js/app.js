/* ═══════════════════════════════════════════════════════════════
   DROPMALLU — Storefront App Logic
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────
let products = [];
let blogs = [];
let cart = [];
let currentSlide = 0;
let slideTimer = null;
let activeCategory = 'all';
let searchQuery = '';

// ── DOM Refs ─────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const productGrid = $('#product-grid');
const searchInput = $('#search-input');
const cartDrawer = $('#cart-drawer');
const cartItemsEl = $('#cart-items');
const cartBadge = $('#cart-badge');
const cartTotalEl = $('#cart-total');
const cartToggle = $('#cart-toggle');
const cartClose = $('#cart-close');
const backdrop = $('#backdrop');
const checkoutBtn = $('#checkout-btn');

const signinModal = $('#signin-modal');
const productModal = $('#product-modal');
const blogModal = $('#blog-modal');

const signinTrigger = $('#signin-trigger');
const signinClose = $('#signin-close');
const loginForm = $('#login-form');
const loginError = $('#login-error');

const heroScroll1 = $('#hero-scroll-1');
const heroScroll2 = $('#hero-scroll-2');
const scroll3d = $('#scroll3d');

const slides = $$('.carousel-slide');
const dots = $$('.dot');
const prevBtn = $('#slide-prev');
const nextBtn = $('#slide-next');

// Mobile nav
const mnavHome = $('#mnav-home');
const mnavExplore = $('#mnav-explore');
const mnavCart = $('#mnav-cart');
const mnavAccount = $('#mnav-account');

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  products = typeof getProducts === 'function' ? await getProducts() : [];
  blogs = typeof getBlogs === 'function' ? await getBlogs() : [];

  const saved = localStorage.getItem('dropmallu_cart');
  if (saved) cart = JSON.parse(saved);

  renderProducts(products);
  refreshCart();
  bindEvents();
  setupHeroScrolling();
  startCarousel();
}

// ── Render Products ──────────────────────────────────────────────
function renderProducts(list) {
  if (!productGrid) return;
  productGrid.innerHTML = '';

  if (list.length === 0) {
    productGrid.innerHTML = '<div class="no-results"><p>No products found.</p></div>';
    return;
  }

  list.forEach((p, i) => {
    const card = document.createElement('div');
    const dir = i % 2 === 0 ? 'reveal-left' : 'reveal-right';
    card.className = `product-card glass scroll-reveal ${dir}`;
    card.dataset.id = p.id;

    const price = formatPrice(p.price);

    card.innerHTML = `
      ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      <div class="product-img-wrap">
        <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-cat">${p.category}</span>
          <span class="product-rating">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${p.rating || '4.5'}
          </span>
        </div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">${price}</span>
          <button class="cart-add-btn" title="Add to Cart" onclick="addToCartClick(event,'${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.cart-add-btn')) return;
      showProduct(p);
    });

    productGrid.appendChild(card);
  });

  observeReveals();
}

// ── Event Bindings ───────────────────────────────────────────────
function bindEvents() {
  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  // Categories
  $$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      applyFilters();
    });
  });

  // Cart
  if (cartToggle) cartToggle.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (backdrop) backdrop.addEventListener('click', () => { closeCart(); closeModals(); });
  if (checkoutBtn) checkoutBtn.addEventListener('click', doCheckout);

  // Sign-in
  if (signinTrigger) signinTrigger.addEventListener('click', openSignin);
  if (signinClose) signinClose.addEventListener('click', closeModals);
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Carousel
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);
  dots.forEach(d => d.addEventListener('click', () => goSlide(+d.dataset.idx)));

  // Mobile nav
  if (mnavHome) mnavHome.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileActive(mnavHome); });
  if (mnavExplore) mnavExplore.addEventListener('click', (e) => { e.preventDefault(); $('#explore')?.scrollIntoView({ behavior: 'smooth' }); setMobileActive(mnavExplore); });
  if (mnavCart) mnavCart.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
  if (mnavAccount) mnavAccount.addEventListener('click', (e) => { e.preventDefault(); openSignin(); });

  // Scroll header
  window.addEventListener('scroll', () => {
    const h = $('#main-header');
    if (h) h.classList.toggle('scrolled', window.scrollY > 30);
  });

  // Modal close buttons
  $$('.modal-close-btn').forEach(btn => btn.addEventListener('click', closeModals));
}

function setMobileActive(el) {
  $$('.mobile-nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}

// ── Filters ──────────────────────────────────────────────────────
function applyFilters() {
  let filtered = products;
  if (activeCategory !== 'all') filtered = filtered.filter(p => p.category === activeCategory);
  if (searchQuery) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(searchQuery) ||
    p.description.toLowerCase().includes(searchQuery) ||
    p.category.toLowerCase().includes(searchQuery)
  );
  renderProducts(filtered);
}

// ── Cart Logic ───────────────────────────────────────────────────
window.addToCartClick = function(e, id) {
  e.stopPropagation();
  addToCart(id);
  const btn = $('#cart-toggle');
  if (btn) { btn.style.transform = 'scale(1.2)'; setTimeout(() => btn.style.transform = '', 200); }
};

function addToCart(id) {
  const item = products.find(p => p.id === id);
  if (!item) return;
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty++; } else {
    cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: 1 });
  }
  refreshCart();
  openCart();
}

window.removeFromCart = function(id) {
  cart = cart.filter(c => c.id !== id);
  refreshCart();
};

window.changeQty = function(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { cart = cart.filter(c => c.id !== id); }
  refreshCart();
};

function refreshCart() {
  localStorage.setItem('dropmallu_cart', JSON.stringify(cart));
  if (!cartBadge || !cartItemsEl || !cartTotalEl) return;

  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  cartBadge.textContent = count;
  cartBadge.style.display = count > 0 ? 'flex' : 'none';

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        <p>Your cart is empty</p>
      </div>`;
    checkoutBtn.disabled = true;
  } else {
    checkoutBtn.disabled = false;
    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <h4 class="cart-item-name">${item.name}</h4>
          <span class="cart-item-price">${formatPrice(item.price)}</span>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `).join('');
  }

  cartTotalEl.textContent = formatPrice(total);
}

function openCart() {
  cartDrawer?.classList.add('open');
  backdrop && (backdrop.style.display = 'block');
  setTimeout(() => backdrop?.classList.add('active'), 10);
}

function closeCart() {
  cartDrawer?.classList.remove('open');
  backdrop?.classList.remove('active');
  setTimeout(() => {
    if (!signinModal?.classList.contains('active') &&
        !productModal?.classList.contains('active') &&
        !blogModal?.classList.contains('active')) {
      if (backdrop) backdrop.style.display = 'none';
    }
  }, 300);
}

function doCheckout() {
  if (cart.length === 0) return;
  let lines = '';
  let total = 0;
  cart.forEach((item, i) => {
    const cost = item.price * item.qty;
    total += cost;
    lines += `${i + 1}. *${item.name}* (Qty: ${item.qty}) — ₹${cost.toLocaleString('en-IN')}\n`;
  });
  const msg = `Hi! I want to order from DROPMALLU:\n\n${lines}\n*Total:* ₹${total.toLocaleString('en-IN')}\n\nPlease confirm!`;
  window.open(`https://wa.me/919895177154?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Sign-In ──────────────────────────────────────────────────────
function openSignin() {
  if (!signinModal) return;
  if (loginError) loginError.style.display = 'none';
  if (loginForm) loginForm.reset();
  signinModal.classList.add('active');
}

function handleLogin(e) {
  e.preventDefault();
  const id = $('#login-id')?.value.trim();
  const pass = $('#login-pass')?.value;
  if (id === 'dropmallu' && pass === 'dropmallu@321') {
    sessionStorage.setItem('dropmallu_auth', 'true');
    closeModals();
    window.location.href = 'admin.html';
  } else {
    if (loginError) loginError.style.display = 'block';
    $('#login-pass').value = '';
    $('#login-pass').focus();
  }
}

// ── Product Modal ────────────────────────────────────────────────
function showProduct(p) {
  const body = $('#product-modal-body');
  if (!body || !productModal) return;
  const price = formatPrice(p.price);
  body.innerHTML = `
    <div class="pdp-grid">
      <div><img class="pdp-img" src="${p.image}" alt="${p.name}"></div>
      <div class="pdp-info">
        ${p.badge ? `<span class="pdp-badge">${p.badge}</span>` : ''}
        <h2 class="pdp-title">${p.name}</h2>
        <span class="pdp-price">${price}</span>
        <p class="pdp-desc">${p.description}</p>
        <div class="pdp-actions">
          <button class="btn btn-primary" style="flex:1;" onclick="directBuy('${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Order via WhatsApp
          </button>
          <button class="btn btn-outline" onclick="addToCart('${p.id}'); closeModals();">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
  productModal.classList.add('active');
}

window.directBuy = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const msg = `Hi! I want to order from DROPMALLU:\n\n*Product:* ${p.name}\n*Price:* ₹${p.price.toLocaleString('en-IN')}\n\nPlease confirm availability!`;
  window.open(`https://wa.me/919895177154?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Article/Blog Modal ───────────────────────────────────────────
window.openArticle = function(blogId) {
  const b = blogs.find(x => x.id === blogId);
  if (!b || !blogModal) return;
  const body = $('#blog-modal-body');
  body.innerHTML = `
    <div class="article-hero">
      <img src="${b.image}" alt="${b.title}">
      <div class="article-hero-text">
        <h2>${b.title}</h2>
        <div class="article-meta">
          <span>${b.author}</span>
          <span>${b.date}</span>
          <span>${b.readTime}</span>
        </div>
      </div>
    </div>
    <div class="article-body">
      <p class="lead">${b.summary}</p>
      <p class="content">${b.content || 'Full article coming soon.'}</p>
    </div>
  `;
  blogModal.classList.add('active');
};

function closeModals() {
  signinModal?.classList.remove('active');
  productModal?.classList.remove('active');
  blogModal?.classList.remove('active');
  if (!cartDrawer?.classList.contains('open')) {
    backdrop?.classList.remove('active');
    setTimeout(() => { if (backdrop) backdrop.style.display = 'none'; }, 300);
  }
}

// ── Carousel ─────────────────────────────────────────────────────
function startCarousel() {
  clearInterval(slideTimer);
  slideTimer = setInterval(nextSlide, 5500);
}

function nextSlide() { goSlide((currentSlide + 1) % slides.length); }
function prevSlide() { goSlide((currentSlide - 1 + slides.length) % slides.length); }

function goSlide(idx) {
  currentSlide = idx;
  slides.forEach((s, i) => s.classList.toggle('active', i === idx));
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  startCarousel();
}

// ── Hero Scrolling ───────────────────────────────────────────────
function setupHeroScrolling() {
  if (!heroScroll1 || !heroScroll2 || products.length === 0) return;

  let track1HTML = '';
  let track2HTML = '';
  
  // Duplicate array for infinite scroll effect
  const items = [...products, ...products];

  items.forEach((p, i) => {
    const card = `
      <div class="scroll-card">
        <img src="${p.image}" alt="${p.name}">
        <div class="scroll-card-title" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.name}</div>
        <div class="scroll-card-price">${formatPrice(p.price)}</div>
      </div>
    `;
    if (i % 2 === 0) track1HTML += card;
    else track2HTML += card;
  });

  heroScroll1.innerHTML = track1HTML;
  heroScroll2.innerHTML = track2HTML;

  // Background scroll
  window.addEventListener('scroll', () => {
    const sy = window.scrollY;
    if (scroll3d) {
      scroll3d.style.transform = `translateY(${sy * 0.25}px) rotate3d(1,1,0.5,${sy * 0.04}deg)`;
    }
  });
}

// ── Scroll Reveal Observer ───────────────────────────────────────
function observeReveals() {
  const els = $$('.scroll-reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
  els.forEach(el => obs.observe(el));
}

// ── Helpers ──────────────────────────────────────────────────────
function formatPrice(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
