/* ═══════════════════════════════════════════════════════════════
   DROPMALLU — Storefront App Logic
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────
import { supabase, initSupabase } from "../supabase/client.js";
let products = [];
// Force storage initialization to ensure default data
if (typeof initializeStorage === 'function') {
  initializeStorage();
}
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
  await initSupabase();
  try {
    products = (typeof getProducts === 'function' ? await getProducts() : []) || [];
    // Sort products descending (newest additions / higher IDs first)
    products.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numB - numA;
    });
  } catch (e) {
    console.error("Error fetching products:", e);
    products = [];
  }

  try {
    blogs = (typeof getBlogs === 'function' ? await getBlogs() : []) || [];
  } catch (e) {
    console.error("Error fetching blogs:", e);
    blogs = [];
  }

  try {
    const saved = localStorage.getItem('dropmallu_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    console.error("Cart loading error:", e);
  }

  renderProducts(products);
  renderDealsGrid();
  startCountdown();
  refreshCart();
  bindEvents();
  setupHeroScrolling();
  startCarousel();
  setupDynamicBackground();
  cyclePedestalHeroImage();

  // URL Hash Routing
  window.addEventListener('hashchange', checkUrlHash);
  checkUrlHash();
  // Supabase realtime subscription for product changes
  if (supabase) {
    supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        // Reload products on any insert, update, delete
        getProducts().then(p => {
          products = p || [];
          renderProducts(products);
        }).catch(err => console.error('Realtime product update error:', err));
      })
      .subscribe();
  }
}


// ── Render Products ──────────────────────────────────────────────
function renderProducts(list) {
  if (!productGrid) return;
  productGrid.innerHTML = '';

  const safeList = Array.isArray(list) ? list : [];

  if (safeList.length === 0) {
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
        <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
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

  // Circular, Sidebar and Promo Categories
  $$('.side-nav-list li a, .circ-cat-item, .promo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.cat || btn.getAttribute('data-cat') || 'all';
      
      // Update active states
      $$('.side-nav-list li').forEach(li => li.classList.remove('active'));
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      
      const parentLi = btn.closest('li');
      if (parentLi) parentLi.classList.add('active');
      
      const targetFilterBtn = $(`.cat-btn[data-cat="${cat}"]`);
      if (targetFilterBtn) targetFilterBtn.classList.add('active');
      
      activeCategory = cat;
      applyFilters();
      
      const exploreSec = $('#explore');
      if (exploreSec) exploreSec.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Top Header Search Bar
  const hSearchInput = $('#header-search-input');
  const hSearchBtn = $('#header-search-btn');
  const hSearchDropdown = $('#search-cat-dropdown');

  if (hSearchBtn && hSearchInput) {
    const triggerSearch = () => {
      searchQuery = hSearchInput.value.toLowerCase().trim();
      const cat = hSearchDropdown?.value || 'all';
      activeCategory = cat;
      
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      const targetFilterBtn = $(`.cat-btn[data-cat="${cat}"]`);
      if (targetFilterBtn) targetFilterBtn.classList.add('active');
      
      applyFilters();
      const exploreSec = $('#explore');
      if (exploreSec) exploreSec.scrollIntoView({ behavior: 'smooth' });
    };

    hSearchBtn.addEventListener('click', triggerSearch);
    hSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  }

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
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
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
    try {
      sessionStorage.setItem('dropmallu_auth', 'true');
      localStorage.setItem('dropmallu_auth', 'true');
    } catch (e) {}
    closeModals();
    window.location.href = 'admin.html?auth=true';
  } else {
    if (loginError) loginError.style.display = 'block';
    if ($('#login-pass')) {
      $('#login-pass').value = '';
      $('#login-pass').focus();
    }
  }
}

// ── Product Modal ────────────────────────────────────────────────
function showProduct(p) {
  const body = $('#product-modal-body');
  if (!body || !productModal) return;
  const price = formatPrice(p.price);
  
  // Custom Amazon/Flipkart styling tags
  const ratingStars = '★'.repeat(Math.round(p.rating || 4.5)) + '☆'.repeat(5 - Math.round(p.rating || 4.5));
  const stockCount = Math.floor(Math.random() * 5) + 2;
  
  body.innerHTML = `
    <div class="pdp-grid">
      <div class="pdp-left">
        <img class="pdp-img" src="${p.image}" alt="${p.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
      </div>
      <div class="pdp-info pdp-right">
        ${p.badge ? `<span class="pdp-badge">${p.badge}</span>` : ''}
        <h2 class="pdp-title">${p.name}</h2>
        <div class="pdp-rating-row">
          <span class="pdp-stars">${ratingStars}</span>
          <span class="pdp-rating-val">${p.rating || 4.5}</span>
          <span class="pdp-reviews-count">(${p.reviews || 20} Ratings)</span>
        </div>
        <div class="pdp-price-container">
          <span class="pdp-price">${price}</span>
          <span class="pdp-delivery-tag">FREE Delivery in 2-3 Days</span>
        </div>
        
        <p class="pdp-desc">${p.description}</p>
        
        <div class="pdp-urgency-box">
          <span class="pdp-stock-warning">Hurry! Only ${stockCount} left in stock.</span>
        </div>

        <div class="pdp-actions-container">
          <button class="btn-pdp btn-pdp-cart" onclick="addToCart('${p.id}'); closeModals();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ADD TO CART
          </button>
          <button class="btn-pdp btn-pdp-buynow" onclick="directBuy('${p.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            BUY NOW
          </button>
        </div>
      </div>
    </div>
  `;
  productModal.classList.add('active');
  
  // Update URL hash to allow sharing and indexing
  if (window.location.hash !== `#product-${p.id}`) {
    window.location.hash = `#product-${p.id}`;
  }
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
      <img src="${b.image}" alt="${b.title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
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

  // Update URL hash to allow sharing and indexing
  if (window.location.hash !== `#blog-${b.id}`) {
    window.location.hash = `#blog-${b.id}`;
  }
};

function closeModals(skipHashUpdate = false) {
  signinModal?.classList.remove('active');
  productModal?.classList.remove('active');
  blogModal?.classList.remove('active');
  if (!cartDrawer?.classList.contains('open')) {
    backdrop?.classList.remove('active');
    setTimeout(() => { if (backdrop) backdrop.style.display = 'none'; }, 300);
  }

  // Clear hash without adding to browser history loop if closed manually
  if (!skipHashUpdate && (window.location.hash.startsWith('#product-') || window.location.hash.startsWith('#blog-'))) {
    history.replaceState(null, null, ' ');
  }
}

// ── URL Hash Routing ─────────────────────────────────────────────
function checkUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#product-')) {
    const id = hash.replace('#product-', '');
    const p = products.find(x => x.id === id);
    if (p) {
      showProduct(p);
    }
  } else if (hash.startsWith('#blog-')) {
    const id = hash.replace('#blog-', '');
    const b = blogs.find(x => x.id === id);
    if (b) {
      window.openArticle(id);
    }
  } else {
    closeModals(true);
  }
}


// ── Carousel ─────────────────────────────────────────────────────
function startCarousel() {
  clearInterval(slideTimer);
  if (!slides || slides.length === 0) return;
  slideTimer = setInterval(nextSlide, 5500);
}

function nextSlide() { 
  if (!slides || slides.length === 0) return;
  goSlide((currentSlide + 1) % slides.length); 
}
function prevSlide() { 
  if (!slides || slides.length === 0) return;
  goSlide((currentSlide - 1 + slides.length) % slides.length); 
}

function goSlide(idx) {
  if (!slides || slides.length === 0) return;
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
        <img src="${p.image}" alt="${p.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
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

// ── Dynamic Scrolling Background Blending ────────────────────────
function setupDynamicBackground() {
  const colors = [
    [4, 18, 10],    // #04120a - Forest Green (Hero Section)
    [11, 30, 19],   // #0b1e13 - Deep Olive Green (Carousel Section)
    [26, 30, 20],   // #1a1e14 - Gold-Olive Muted (Explore Catalog)
    [3, 13, 7]      // #030d07 - Deep Velvet Green (Footer Section)
  ];

  const updateBg = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    const percent = Math.min(Math.max(window.scrollY / scrollHeight, 0), 1);
    
    const segmentCount = colors.length - 1;
    const position = percent * segmentCount;
    const index = Math.floor(position);
    const fraction = position - index;
    
    let r, g, b;
    if (index >= segmentCount) {
      const c = colors[segmentCount];
      r = c[0]; g = c[1]; b = c[2];
    } else {
      const c1 = colors[index];
      const c2 = colors[index + 1];
      r = Math.round(c1[0] + (c2[0] - c1[0]) * fraction);
      g = Math.round(c1[1] + (c2[1] - c1[1]) * fraction);
      b = Math.round(c1[2] + (c2[2] - c1[2]) * fraction);
    }
    
    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  };

  window.addEventListener('scroll', updateBg);
  updateBg(); // Initialize background color on load
}

// ── Deal of the Day Renderer & Countdown ─────────────────────────
function startCountdown() {
  const hrsEl = $('#timer-hrs');
  const minsEl = $('#timer-mins');
  const secsEl = $('#timer-secs');
  if (!hrsEl || !minsEl || !secsEl) return;

  let targetTime = localStorage.getItem('dropmallu_countdown_target');
  if (!targetTime || new Date(targetTime) <= new Date()) {
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 12);
    targetTime = nextDate.toISOString();
    localStorage.setItem('dropmallu_countdown_target', targetTime);
  }

  function update() {
    const diff = new Date(targetTime) - new Date();
    if (diff <= 0) {
      localStorage.removeItem('dropmallu_countdown_target');
      startCountdown();
      return;
    }
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    hrsEl.textContent = String(hrs).padStart(2, '0');
    minsEl.textContent = String(mins).padStart(2, '0');
    secsEl.textContent = String(secs).padStart(2, '0');
  }

  setInterval(update, 1000);
  update();
}

function renderDealsGrid() {
  const grid = $('#deals-products-grid');
  if (!grid || !products || products.length === 0) return;
  grid.innerHTML = '';

  const deals = products.slice(0, 5);

  deals.forEach((p, i) => {
    const card = document.createElement('div');
    const delay = i * 0.05;
    card.className = 'product-card glass scroll-reveal reveal-up';
    card.style.transitionDelay = `${delay}s`;
    
    const discountPercent = 20 + (i * 5);
    const originalPrice = Math.round(p.price / (1 - (discountPercent / 100)));

    card.innerHTML = `
      <span class="product-badge" style="background:#ef4444; color:#fff;">-${discountPercent}%</span>
      <div class="product-img-wrap">
        <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-cat">${p.category}</span>
          <span class="product-rating" style="color:var(--primary);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${p.rating || '4.5'}
          </span>
        </div>
        <h3 class="product-name" style="font-size:13px; margin:4px 0; font-weight:600;">${p.name}</h3>
        <div class="product-footer" style="margin-top:8px;">
          <div style="display:flex; flex-direction:column;">
            <span class="product-price" style="font-size:14px; font-weight:700; color:var(--primary);">${formatPrice(p.price)}</span>
            <span class="original-price" style="text-decoration:line-through; font-size:10px; color:var(--text-secondary);">${formatPrice(originalPrice)}</span>
          </div>
          <button class="cart-add-btn" style="background:var(--accent-green); border-color:var(--accent-green); color:#fff; width:28px; height:28px;" title="Add to Cart" onclick="addToCartClick(event,'${p.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.cart-add-btn')) return;
      showProduct(p);
    });

    grid.appendChild(card);
  });
}

// Cycle featured image in the main hero pedestal slider
function cyclePedestalHeroImage() {
  const heroImage = $('#pedestal-hero-image');
  if (!heroImage || !products || products.length === 0) return;
  
  let currentIdx = 0;
  // Use a subset of attractive watch / shoe items
  const cycleItems = products.filter(p => p.category === 'watch' || p.category === 'shoe');
  if (cycleItems.length === 0) return;
  
  setInterval(() => {
    currentIdx = (currentIdx + 1) % cycleItems.length;
    const nextItem = cycleItems[currentIdx];
    
    // Transition fade
    heroImage.style.opacity = '0';
    heroImage.style.transform = 'translateY(15px) scale(0.95)';
    
    setTimeout(() => {
      heroImage.src = nextItem.image;
      heroImage.style.opacity = '1';
      heroImage.style.transform = 'translateY(0) scale(1)';
    }, 400);
  }, 7000);
}

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
