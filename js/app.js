/* ═══════════════════════════════════════════════════════════════
   DROPYMART — Storefront App Logic
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────
import { supabase, initSupabase } from "../supabase/client.js";
let products = [];
// Force storage initialization to ensure default data
if (typeof initializeStorage === 'function') {
  initializeStorage();
}
let blogs = [];
let settings = null;
let cart = [];
let currentSlide = 0;
let slideTimer = null;
let activeCategory = 'all';
let searchQuery = '';

// ── Helpers & Security Utilities ─────────────────────────────────
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
window.slugify = slugify;

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

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
    const rawProducts = (typeof getProducts === 'function' ? await getProducts() : []) || [];
    products = rawProducts.filter(p => p !== null && p !== undefined && p.id);
    if (!products || products.length === 0) {
      console.warn("Products from storage was empty, falling back to DEFAULT_PRODUCTS.");
      products = (window.DEFAULT_PRODUCTS || []);
    }
    // Sort products descending (newest additions / higher IDs first)
    products.sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      return numB - numA;
    });
  } catch (e) {
    console.error("Error fetching products:", e);
    products = window.DEFAULT_PRODUCTS || [];
  }

  try {
    blogs = (typeof getBlogs === 'function' ? await getBlogs() : []) || [];
  } catch (e) {
    console.error("Error fetching blogs:", e);
    blogs = [];
  }

  try {
    settings = (typeof getSettings === 'function' ? await getSettings() : null) || window.DEFAULT_SETTINGS;
  } catch (e) {
    console.error("Error fetching settings:", e);
    settings = window.DEFAULT_SETTINGS;
  }

  try {
    const saved = localStorage.getItem('dropymart_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    console.error("Cart loading error:", e);
  }

  applyStorefrontSettings(settings);
  const logoImg = document.querySelector('#main-header .logo img');
  if (logoImg) {
    logoImg.classList.add('logo-spin-load');
    setTimeout(() => logoImg.classList.remove('logo-spin-load'), 850);
  }
  createScrollProgressBar();
  pruneEmptyCategories();
  initDynamicScrollBackground();
  initScroll3DCanvas();
  await renderHomepageSectionsOrder();
  await renderTestimonials();
  await renderBrandsList();
  renderProducts(products);
  renderDealsGrid();
  startCountdown();
  refreshCart();
  bindEvents();

  // Load search and categories from URL parameters for cross-page navigation
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('search')) {
      searchQuery = params.get('search').toLowerCase().trim();
      const hSearchInput = $('#header-search-input');
      const searchInput = $('#search-input');
      if (hSearchInput) hSearchInput.value = params.get('search');
      if (searchInput) searchInput.value = params.get('search');
    }
    if (params.has('cat')) {
      activeCategory = params.get('cat');
      const hSearchDropdown = $('#search-cat-dropdown');
      if (hSearchDropdown) hSearchDropdown.value = activeCategory;
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      const targetFilterBtn = $(`.cat-btn[data-cat="${activeCategory}"]`);
      if (targetFilterBtn) targetFilterBtn.classList.add('active');
    }
    if (params.has('search') || params.has('cat')) {
      applyFilters();
      setTimeout(() => {
        $('#section-products')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  } catch (e) {
    console.error("Error reading search params on init:", e);
  }

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

  // Register service worker for PWA support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered successfully!', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
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

  safeList.forEach((p, i) => {
    const card = document.createElement('a');
    const slug = slugify(p.name);
    card.href = `/product/${slug}`;
    const dir = i % 2 === 0 ? 'reveal-left' : 'reveal-right';
    card.className = `product-card glass scroll-reveal ${dir}`;
    card.dataset.id = escapeHTML(p.id);
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';

    const price = formatPrice(p.price);

    card.innerHTML = `
      ${p.badge ? `<span class="product-badge">${escapeHTML(p.badge)}</span>` : ''}
      <div class="product-img-wrap">
        <img class="product-img" src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-cat">${escapeHTML(p.category)}</span>
          <span class="product-rating">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${escapeHTML(p.rating || '4.5')}
          </span>
        </div>
        <h3 class="product-name">${escapeHTML(p.name)}</h3>
        <p class="product-desc">${escapeHTML(p.description)}</p>
        <div class="product-footer">
          <span class="product-price">${price}</span>
          <button class="cart-add-btn" title="Add to Cart" onclick="addToCartClick(event,'${escapeHTML(p.id)}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
    `;

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
      
      const exploreSec = $('#section-products');
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
      const exploreSec = $('#section-products');
      if (exploreSec) exploreSec.scrollIntoView({ behavior: 'smooth' });
    };

    hSearchBtn.addEventListener('click', triggerSearch);
    hSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });

    // Instant live search as user types
    hSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  // Filter instantly when user changes header category dropdown
  if (hSearchDropdown) {
    hSearchDropdown.addEventListener('change', () => {
      activeCategory = hSearchDropdown.value;
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      const targetFilterBtn = $(`.cat-btn[data-cat="${activeCategory}"]`);
      if (targetFilterBtn) targetFilterBtn.classList.add('active');
      applyFilters();
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
  if (mnavExplore) mnavExplore.addEventListener('click', (e) => { e.preventDefault(); $('#section-products')?.scrollIntoView({ behavior: 'smooth' }); setMobileActive(mnavExplore); });
  if (mnavCart) mnavCart.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
  if (mnavAccount) mnavAccount.addEventListener('click', (e) => { e.preventDefault(); openSignin(); });

  // Scroll header
  window.addEventListener('scroll', () => {
    const h = $('#main-header');
    if (h) h.classList.toggle('scrolled', window.scrollY > 30);
  });

  // Modal close buttons
  $$('.modal-close-btn').forEach(btn => btn.addEventListener('click', closeModals));

  // Newsletter Card Submit
  const newsletterForm = $('#newsletter-card-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = $('#newsletter-card-email');
      const successEl = $('#newsletter-card-success');
      if (emailInput && successEl) {
        successEl.textContent = settings?.newsletter_success_msg || "Thank you for subscribing!";
        successEl.style.display = 'block';
        emailInput.value = '';
        setTimeout(() => { successEl.style.display = 'none'; }, 5000);
      }
    });
  }

  const footerNewsletterBtn = $('#newsletter-btn');
  if (footerNewsletterBtn) {
    footerNewsletterBtn.addEventListener('click', () => {
      const emailInput = $('#newsletter-email');
      if (emailInput && emailInput.value) {
        alert(settings?.newsletter_success_msg || "Thank you for subscribing!");
        emailInput.value = '';
      }
    });
  }

  // View All Deals button inside deals header
  const viewAllDealsBtn = $('a[href="#explore"].btn-sm');
  if (viewAllDealsBtn) {
    viewAllDealsBtn.addEventListener('click', () => {
      activeCategory = 'deals';
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      const targetFilterBtn = $(`.cat-btn[data-cat="deals"]`);
      if (targetFilterBtn) targetFilterBtn.classList.add('active');
      applyFilters();
    });
  }

  // Handle header sub nav links clicking
  $$('.sub-nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const text = link.textContent.trim().toLowerCase();
      if (text === 'new arrivals' || text === 'featured' || text === 'products') {
        e.preventDefault();
        activeCategory = 'all';
        searchQuery = '';
        const hSearchInput = $('#header-search-input');
        const searchInput = $('#search-input');
        if (hSearchInput) hSearchInput.value = '';
        if (searchInput) searchInput.value = '';
        $$('.cat-btn').forEach(b => b.classList.remove('active'));
        const targetFilterBtn = $(`.cat-btn[data-cat="all"]`);
        if (targetFilterBtn) targetFilterBtn.classList.add('active');
        applyFilters();
        const exploreSec = $('#section-products');
        if (exploreSec) exploreSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Logo 5-click Merchant Mode toggle
  const headerLogoEl = $('#main-header .logo');
  if (headerLogoEl) {
    let logoClicks = 0;
    let lastLogoClick = 0;
    headerLogoEl.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastLogoClick < 1500) {
        logoClicks++;
      } else {
        logoClicks = 1;
      }
      lastLogoClick = now;

      if (logoClicks >= 5) {
        e.preventDefault();
        e.stopPropagation();
        
        const enabled = localStorage.getItem('admin_mode_enabled') === 'true';
        const desktopSignin = document.getElementById('signin-trigger');
        const mobileSignin = document.getElementById('mnav-account');
        
        if (enabled) {
          localStorage.setItem('admin_mode_enabled', 'false');
          if (desktopSignin) desktopSignin.style.setProperty('display', 'none', 'important');
          if (mobileSignin) mobileSignin.style.setProperty('display', 'none', 'important');
          alert("🔒 Merchant Mode Disabled! Sign In option is now hidden.");
        } else {
          localStorage.setItem('admin_mode_enabled', 'true');
          if (desktopSignin) desktopSignin.style.setProperty('display', 'flex', 'important');
          if (mobileSignin) mobileSignin.style.setProperty('display', 'flex', 'important');
          alert("🔒 Merchant Mode Enabled! Sign In option is now visible.");
        }
        logoClicks = 0;
      } else {
        // Prevent navigating home if clicked on homepage
        const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';
        if (isHomepage) {
          e.preventDefault();
          if (logoClicks === 1) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    });
  }
}

function setMobileActive(el) {
  $$('.mobile-nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}

// ── Filters ──────────────────────────────────────────────────────
function applyFilters() {
  let filtered = products;
  
  if (activeCategory !== 'all') {
    const active = activeCategory.toLowerCase().trim();
    if (active === 'deals') {
      filtered = filtered.filter(p => p.badge && p.badge.trim() !== '');
    } else {
      filtered = filtered.filter(p => {
        if (!p.category) return false;
        const cat = p.category.toLowerCase().trim();
        
        if (cat === active || cat.startsWith(active) || active.startsWith(cat)) {
          return true;
        }
        
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        
        if (active === 'mobile' && (cat.includes('gadget') || name.includes('phone') || name.includes('mobile') || desc.includes('phone') || desc.includes('mobile'))) {
          return true;
        }
        if (active === 'electronics' && (cat.includes('projector') || cat.includes('powerbank') || name.includes('projector') || name.includes('speaker') || name.includes('powerbank') || desc.includes('projector') || desc.includes('speaker') || desc.includes('powerbank'))) {
          return true;
        }
        if (active === 'audio' && (name.includes('earbuds') || name.includes('headphones') || name.includes('speaker') || name.includes('audio') || desc.includes('earbuds') || desc.includes('headphones') || desc.includes('speaker') || desc.includes('audio'))) {
          return true;
        }
        if (active === 'home' && (name.includes('projector') || name.includes('globe') || name.includes('levitating') || desc.includes('projector') || desc.includes('globe') || desc.includes('levitating'))) {
          return true;
        }
        if (active === 'accessories' && (cat.includes('powerbank') || name.includes('cable') || name.includes('charger') || name.includes('dock') || name.includes('powerbank') || desc.includes('cable') || desc.includes('charger') || desc.includes('dock') || desc.includes('powerbank'))) {
          return true;
        }
        if (active === 'laptop' && (name.includes('laptop') || name.includes('macbook') || name.includes('computer') || desc.includes('laptop') || desc.includes('macbook') || desc.includes('computer'))) {
          return true;
        }
        if (active === 'camera' && (name.includes('camera') || name.includes('lens') || desc.includes('camera') || desc.includes('lens'))) {
          return true;
        }
        if (active === 'gaming' && (name.includes('game') || name.includes('playstation') || name.includes('xbox') || name.includes('switch') || desc.includes('game') || desc.includes('playstation') || desc.includes('xbox') || desc.includes('switch'))) {
          return true;
        }
        if (active === 'beauty' && (name.includes('sleep mask') || name.includes('face') || desc.includes('sleep mask') || desc.includes('face'))) {
          return true;
        }
        
        return false;
      });
    }
  }
  
  if (searchQuery) {
    filtered = filtered.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchQuery)) ||
      (p.description && p.description.toLowerCase().includes(searchQuery)) ||
      (p.category && p.category.toLowerCase().includes(searchQuery))
    );
  }
  
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
  localStorage.setItem('dropymart_cart', JSON.stringify(cart));
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
        <img class="cart-item-img" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
        <div class="cart-item-info">
          <h4 class="cart-item-name">${escapeHTML(item.name)}</h4>
          <span class="cart-item-price">${formatPrice(item.price)}</span>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${escapeHTML(item.id)}',-1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${escapeHTML(item.id)}',1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${escapeHTML(item.id)}')" title="Remove">
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
  const msg = `Hi! I want to order from DROPYMART:\n\n${lines}\n*Total:* ₹${total.toLocaleString('en-IN')}\n\nPlease confirm!`;
  window.open(`https://wa.me/919895177154?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Sign-In ──────────────────────────────────────────────────────
function openSignin() {
  if (!signinModal) return;
  if (loginError) loginError.style.display = 'none';
  if (loginForm) loginForm.reset();
  signinModal.classList.add('active');
}

async function handleLogin(e) {
  e.preventDefault();
  const id = $('#login-id')?.value.trim();
  const pass = $('#login-pass')?.value;
  const hash = await sha256(pass || '');
  if (id === 'dropymart' && hash === 'ea197929c33aa56b8f895c85e098d956f058af7dbca4cdb33bf183f9ffea04ff') {
    try {
      sessionStorage.setItem('dropymart_auth', 'true');
      localStorage.setItem('dropymart_auth', 'true');
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
  
  const ratingStars = '★'.repeat(Math.round(p.rating || 4.5)) + '☆'.repeat(5 - Math.round(p.rating || 4.5));
  
  // Dynamic stock alerts
  let stockText = '';
  let stockStyle = '';
  if (p.stock_status) {
    stockText = p.stock_status;
    stockStyle = p.stock_status.toLowerCase().includes('out') ? 'color:#ef4444;' : 'color:#10b981;';
  } else if (typeof p.inventory !== 'undefined') {
    const inv = Number(p.inventory);
    if (inv === 0) {
      stockText = 'Hurry! Out of stock.';
      stockStyle = 'color:#ef4444;';
    } else if (inv <= 10) {
      stockText = `Hurry! Only ${inv} left in stock.`;
      stockStyle = 'color:#ef4444; background: rgba(239, 68, 68, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ef4444;';
    } else {
      stockText = 'In Stock';
      stockStyle = 'color:#10b981;';
    }
  } else {
    stockText = 'Hurry! Only 4 left in stock.';
    stockStyle = 'color:#ef4444; background: rgba(239, 68, 68, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ef4444;';
  }

  // Gallery slider thumbnails
  let galleryHtml = '';
  const images = [];
  if (p.image) images.push(p.image);
  if (p.gallery) {
    p.gallery.split(',').forEach(img => {
      const trimmed = img.trim();
      if (trimmed && trimmed !== p.image) images.push(trimmed);
    });
  }
  if (images.length > 1) {
    galleryHtml = '<div class="pdp-gallery-thumbs" style="display:flex; gap:8px; margin-top:12px; overflow-x:auto; padding-bottom:4px;">';
    images.forEach((img, idx) => {
      galleryHtml += `<img src="${escapeHTML(img)}" style="width:50px; height:50px; border-radius:6px; object-fit:cover; border:2px solid ${idx === 0 ? 'var(--primary)' : 'transparent'}; cursor:pointer; background:rgba(255,255,255,0.05);" onclick="document.querySelector('.pdp-img').src='${escapeHTML(img)}'; document.querySelectorAll('.pdp-gallery-thumbs img').forEach(i => i.style.borderColor='transparent'); this.style.borderColor='var(--primary)';">`;
    });
    galleryHtml += '</div>';
  }

  // Specifications block
  let specsHtml = '';
  if (p.specs) {
    specsHtml = '<div class="pdp-specs-list" style="margin-top: 15px; border-top: 1px solid var(--border-glass); padding-top: 10px; font-size: 12px; color: var(--text-sub);">';
    const pairs = p.specs.split(',');
    pairs.forEach(pair => {
      const parts = pair.split(':');
      if (parts.length >= 2) {
        specsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.02); padding-bottom:2px;"><strong>${escapeHTML(parts[0].trim())}:</strong> <span style="color:var(--text-main);">${escapeHTML(parts[1].trim())}</span></div>`;
      }
    });
    specsHtml += '</div>';
  }
  
  body.innerHTML = `
    <div class="pdp-grid">
      <div class="pdp-left">
        <img class="pdp-img" src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
        ${galleryHtml}
      </div>
      <div class="pdp-info pdp-right">
        ${p.badge ? `<span class="pdp-badge">${escapeHTML(p.badge)}</span>` : ''}
        <h2 class="pdp-title">${escapeHTML(p.name)}</h2>
        <div class="pdp-rating-row">
          <span class="pdp-stars" style="color:#fbbf24; margin-right:5px;">${ratingStars}</span>
          <span class="pdp-rating-val" style="font-weight:700; color:var(--primary); margin-right:5px;">${escapeHTML(p.rating || 4.5)}</span>
          <span class="pdp-reviews-count" style="color:var(--text-sub);">(${escapeHTML(p.reviews || 20)} Ratings)</span>
        </div>
        <div class="pdp-price-container">
          <span class="pdp-price">${price}</span>
          <span class="pdp-delivery-tag" style="color:var(--primary); font-size:12px; font-weight:600; margin-left:12px;">FREE Delivery in 2-3 Days</span>
        </div>
        
        <p class="pdp-desc" style="margin-top:12px; line-height:1.5; font-size:13px; color:var(--text-sub);">${escapeHTML(p.description)}</p>
        
        ${specsHtml}
        
        <div class="pdp-urgency-box" style="margin-top:15px; margin-bottom:15px;">
          <span class="pdp-stock-warning" style="${stockStyle}">${escapeHTML(stockText)}</span>
        </div>
 
        <div class="pdp-actions-container">
          <button class="btn-pdp btn-pdp-cart" onclick="addToCart('${escapeHTML(p.id)}'); closeModals();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ADD TO CART
          </button>
          <button class="btn-pdp btn-pdp-buynow" onclick="directBuy('${escapeHTML(p.id)}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            BUY NOW
          </button>
        </div>
      </div>
    </div>
  `;
  productModal.classList.add('active');
  
  if (window.location.hash !== `#product-${p.id}`) {
    window.location.hash = `#product-${p.id}`;
  }
}

window.directBuy = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const msg = `Hi! I want to order from DROPYMART:\n\n*Product:* ${p.name}\n*Price:* ₹${p.price.toLocaleString('en-IN')}\n\nPlease confirm availability!`;
  window.open(`https://wa.me/919895177154?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Article/Blog Modal ───────────────────────────────────────────
window.openArticle = function(blogId) {
  const b = blogs.find(x => x.id === blogId);
  if (!b || !blogModal) return;
  const body = $('#blog-modal-body');
  body.innerHTML = `
    <div class="article-hero">
      <img src="${escapeHTML(b.image)}" alt="${escapeHTML(b.title)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
      <div class="article-hero-text">
        <h2>${escapeHTML(b.title)}</h2>
        <div class="article-meta">
          <span>${escapeHTML(b.author)}</span>
          <span>${escapeHTML(b.date)}</span>
          <span>${escapeHTML(b.readTime)}</span>
        </div>
      </div>
    </div>
    <div class="article-body">
      <p class="lead">${escapeHTML(b.summary)}</p>
      <p class="content">${escapeHTML(b.content || 'Full article coming soon.')}</p>
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
      const slug = slugify(p.name);
      window.location.replace(`/product/${slug}`);
    }
  } else if (hash.startsWith('#blog-')) {
    const id = hash.replace('#blog-', '');
    const b = blogs.find(x => x.id === id);
    if (b) {
      const slug = slugify(b.title);
      window.location.replace(`/blog/${slug}`);
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
        <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
        <div class="scroll-card-title" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHTML(p.name)}</div>
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
    [243, 245, 248], // Light gray-blue
    [235, 240, 245], // Soft blue tint
    [245, 247, 250], // Muted light gray
    [230, 235, 240]  // Muted steel gray
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

  let targetTime = localStorage.getItem('dropymart_countdown_target');
  const offsetHrs = (settings && typeof settings.timer_hours !== 'undefined') ? Number(settings.timer_hours) : 12;
  if (!targetTime || new Date(targetTime) <= new Date()) {
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + offsetHrs);
    targetTime = nextDate.toISOString();
    localStorage.setItem('dropymart_countdown_target', targetTime);
  }

  function update() {
    const diff = new Date(targetTime) - new Date();
    if (diff <= 0) {
      localStorage.removeItem('dropymart_countdown_target');
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
  let list = products;
  if (!list || list.length === 0) {
    list = window.DEFAULT_PRODUCTS || [];
  }
  if (!grid || list.length === 0) return;
  grid.innerHTML = '';

  const deals = list.slice(0, 5);

  deals.forEach((p, i) => {
    const card = document.createElement('a');
    const slug = slugify(p.name);
    card.href = `/product/${slug}`;
    card.className = 'product-card glass';
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';
    
    const discountPercent = 20 + (i * 5);
    const originalPrice = Math.round(p.price / (1 - (discountPercent / 100)));

    card.innerHTML = `
      <span class="product-badge" style="background:#ef4444; color:#fff;">-${discountPercent}%</span>
      <div class="product-img-wrap">
        <img class="product-img" src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-cat">${escapeHTML(p.category)}</span>
          <span class="product-rating" style="color:var(--primary);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${escapeHTML(p.rating || '4.5')}
          </span>
        </div>
        <h3 class="product-name" style="font-size:13px; margin:4px 0; font-weight:600;">${escapeHTML(p.name)}</h3>
        <div class="product-footer" style="margin-top:8px;">
          <div style="display:flex; flex-direction:column;">
            <span class="product-price" style="font-size:14px; font-weight:700; color:var(--primary);">${formatPrice(p.price)}</span>
            <span class="original-price" style="text-decoration:line-through; font-size:10px; color:var(--text-secondary);">${formatPrice(originalPrice)}</span>
          </div>
          <button class="cart-add-btn" style="background:var(--accent-green); border-color:var(--accent-green); color:#fff; width:28px; height:28px;" title="Add to Cart" onclick="addToCartClick(event,'${escapeHTML(p.id)}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
    `;

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

function applyStorefrontSettings(s) {
  if (!s) return;

  // Theme styling overrides
  const root = document.documentElement;
  if (s.theme_primary) root.style.setProperty('--primary', s.theme_primary);
  if (s.theme_primary_hover) root.style.setProperty('--primary-hover', s.theme_primary_hover);
  if (s.theme_bg_dark) root.style.setProperty('--bg-dark', s.theme_bg_dark);
  if (s.theme_bg_surface) root.style.setProperty('--bg-card', s.theme_bg_surface);
  if (s.theme_text_primary) root.style.setProperty('--text-main', s.theme_text_primary);
  if (s.theme_text_secondary) root.style.setProperty('--text-sub', s.theme_text_secondary);
  if (s.theme_border_radius) {
    root.style.setProperty('--radius-sm', s.theme_border_radius);
    root.style.setProperty('--radius-md', s.theme_border_radius);
    root.style.setProperty('--radius-lg', s.theme_border_radius);
  }
  if (s.theme_shadows) root.style.setProperty('--shadow-card', s.theme_shadows);

  // SEO updates
  if (s.seo_home_title) {
    document.title = s.seo_home_title;
    let ogTitle = $('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = s.seo_home_title;

    let twTitle = $('meta[name="twitter:title"]');
    if (!twTitle) {
      twTitle = document.createElement('meta');
      twTitle.name = 'twitter:title';
      document.head.appendChild(twTitle);
    }
    twTitle.content = s.seo_home_title;
  }
  let metaDesc = $('meta[name="description"]');
  if (s.seo_home_desc) {
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = s.seo_home_desc;

    let ogDesc = $('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = s.seo_home_desc;

    let twDesc = $('meta[name="twitter:description"]');
    if (!twDesc) {
      twDesc = document.createElement('meta');
      twDesc.name = 'twitter:description';
      document.head.appendChild(twDesc);
    }
    twDesc.content = s.seo_home_desc;
  }
  let ogImage = $('meta[property="og:image"]');
  if (s.seo_home_og_image) {
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.content = s.seo_home_og_image;

    let twImage = $('meta[name="twitter:image"]');
    if (!twImage) {
      twImage = document.createElement('meta');
      twImage.name = 'twitter:image';
      document.head.appendChild(twImage);
    }
    twImage.content = s.seo_home_og_image;
  }

  // Footer text overrides
  const footerLogo = $('footer .logo');
  if (footerLogo && s.footer_logo_text) {
    footerLogo.innerHTML = `<i data-lucide="shield-check"></i> ${s.footer_logo_text}<span class="dot">.</span>`;
  }
  const footerAbout = $('.footer-brand-desc');
  if (footerAbout && s.footer_about_content) {
    footerAbout.textContent = s.footer_about_content;
  }
  const fb = $('footer a[title="Facebook"]');
  if (fb && s.footer_social_facebook) fb.href = s.footer_social_facebook;
  const insta = $('footer a[title="Instagram"]');
  if (insta && s.footer_social_instagram) insta.href = s.footer_social_instagram;
  const tw = $('footer a[title="Twitter"]');
  if (tw && s.footer_social_twitter) tw.href = s.footer_social_twitter;
  const yt = $('footer a[title="Youtube"]');
  if (yt && s.footer_social_youtube) yt.href = s.footer_social_youtube;

  // Newsletter UI card setup
  const newsletterHeading = $('#newsletter-card-heading');
  const newsletterDesc = $('#newsletter-card-desc');
  const newsletterCard = $('#newsletter-card');
  if (newsletterHeading && s.newsletter_heading) newsletterHeading.textContent = s.newsletter_heading;
  if (newsletterDesc && s.newsletter_desc) newsletterDesc.textContent = s.newsletter_desc;
  if (newsletterCard && s.newsletter_bg) newsletterCard.style.backgroundImage = `url('${s.newsletter_bg}')`;

  const badge = $('#hero-badge');
  const title = $('#hero-title');
  const subtitle = $('#hero-subtitle');
  const image = $('#pedestal-hero-image');

  if (badge) badge.innerHTML = `<i data-lucide="shield-check"></i> ${s.hero_badge || 'Premium Collection'}`;
  if (title) title.innerHTML = s.hero_title || 'Upgrade Your <br><span>Lifestyle</span>';
  if (subtitle) subtitle.textContent = s.hero_subtitle || 'Discover trending gadgets, luxury watches, performance shoes and more.';
  if (image && s.hero_image) image.src = s.hero_image;

  const dealsTitle = $('#deals-title');
  const dealsSubtitle = $('#deals-subtitle');
  if (dealsTitle) dealsTitle.textContent = s.timer_title || '⚡ Deal of the Day';
  if (dealsSubtitle) dealsSubtitle.textContent = s.timer_subtitle || 'Limited time offer, don\'t miss out!';

  const b1Title = $('#promo-b1-title');
  const b1Subtitle = $('#promo-b1-subtitle');
  const b1Link = $('#promo-b1-link');
  const b1Img = $('#promo-b1-img');
  if (b1Title) b1Title.textContent = s.promo_b1_title || 'Smart Watches';
  if (b1Subtitle) b1Subtitle.textContent = s.promo_b1_subtitle || 'Starting at ₹100';
  if (b1Link) {
    b1Link.dataset.cat = s.promo_b1_cat || 'watch';
    b1Link.innerHTML = `Explore Now <i data-lucide="arrow-right"></i>`;
  }
  if (b1Img && s.promo_b1_image) b1Img.src = s.promo_b1_image;

  const b2Title = $('#promo-b2-title');
  const b2Subtitle = $('#promo-b2-subtitle');
  const b2Link = $('#promo-b2-link');
  const b2Img = $('#promo-b2-img');
  if (b2Title) b2Title.textContent = s.promo_b2_title || 'Best Selling Shoes';
  if (b2Subtitle) b2Subtitle.textContent = s.promo_b2_subtitle || 'Up to 50% Off';
  if (b2Link) {
    b2Link.dataset.cat = s.promo_b2_cat || 'shoe';
    b2Link.innerHTML = `Shop Now <i data-lucide="arrow-right"></i>`;
  }
  if (b2Img && s.promo_b2_image) b2Img.src = s.promo_b2_image;

  // Apply merchant mode visibility
  const adminModeEnabled = localStorage.getItem('admin_mode_enabled') === 'true';
  const desktopSignin = document.getElementById('signin-trigger');
  const mobileSignin = document.getElementById('mnav-account');
  if (desktopSignin) {
    desktopSignin.style.setProperty('display', adminModeEnabled ? 'flex' : 'none', adminModeEnabled ? 'important' : '');
  }
  if (mobileSignin) {
    mobileSignin.style.setProperty('display', adminModeEnabled ? 'flex' : 'none', adminModeEnabled ? 'important' : '');
  }

  if (window.lucide) window.lucide.createIcons();
}

async function renderHomepageSectionsOrder() {
  try {
    const sections = (typeof getHomepageSections === 'function' ? await getHomepageSections() : []) || [];
    const container = document.getElementById('homepage-sections-container');
    if (!container || !sections || sections.length === 0) return;

    sections.forEach(sec => {
      const el = document.getElementById(`section-${sec.id}`);
      if (el) {
        if (sec.enabled) {
          el.style.display = '';
          container.appendChild(el);
        } else {
          el.style.display = 'none';
        }
      }
    });
  } catch (e) {
    console.error("Error sorting sections:", e);
  }
}

async function renderTestimonials() {
  try {
    const testimonials = (typeof getTestimonials === 'function' ? await getTestimonials() : []) || [];
    const container = document.getElementById('testimonials-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (testimonials.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sub); text-align:center; width:100%;">No testimonials to show.</p>';
      return;
    }

    testimonials.forEach(t => {
      const stars = '★'.repeat(t.rating || 5) + '☆'.repeat(Math.max(0, 5 - (t.rating || 5)));
      const card = document.createElement('div');
      card.className = 'testimonial-card glass scroll-reveal reveal-up';
      card.style.cssText = 'background: var(--bg-card); border-radius: var(--radius-md); padding: 1.5rem; border: 1px solid var(--border-glass); margin: 10px; max-width: 320px; flex: 1 1 300px;';
      card.innerHTML = `
        <div class="testimonial-header" style="display:flex; align-items:center; gap: 12px; margin-bottom: 12px;">
          <img src="${escapeHTML(t.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80')}" alt="${escapeHTML(t.name)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
          <div>
            <h4 style="margin:0; font-size:14px; font-weight:600; color:var(--text-main);">${escapeHTML(t.name)}</h4>
            <div class="testimonial-stars" style="color:#fbbf24; font-size:12px;">${stars}</div>
          </div>
        </div>
        <p class="testimonial-review" style="font-size:13px; color:var(--text-sub); margin:0; line-height: 1.4; font-style: italic;">"${escapeHTML(t.review)}"</p>
      `;
      container.appendChild(card);
    });

    container.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; padding: 20px 0;';
  } catch (e) {
    console.error("Testimonial render error:", e);
  }
}

async function renderBrandsList() {
  try {
    const brands = (typeof getBrands === 'function' ? await getBrands() : []) || [];
    const container = document.getElementById('brands-row');
    if (!container) return;
    container.innerHTML = '';

    if (brands.length === 0) {
      container.style.display = 'none';
      return;
    }

    brands.forEach(b => {
      const card = document.createElement('a');
      card.href = escapeHTML(b.link || '#explore');
      card.className = 'brand-logo-card';
      card.innerHTML = b.logo ? `<img src="${escapeHTML(b.logo)}" alt="${escapeHTML(b.name)}" style="max-height: 36px; max-width: 80px; object-fit: contain;">` : `<span>${escapeHTML(b.name)}</span>`;
      container.appendChild(card);
    });
  } catch (e) {
    console.error("Brands row render error:", e);
  }
}

// ── Scroll Progress & Dynamic Background Functions ───────────────────
function createScrollProgressBar() {
  if (document.getElementById('scroll-progress-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'scroll-progress-bar';
  document.body.appendChild(bar);
}

function initDynamicScrollBackground() {
  // Add initial class
  document.body.classList.add('active-sec-hero');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const progress = scrollY / maxScroll;
    
    // Update progress bar width
    const progressBar = document.getElementById('scroll-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }

    // Determine active section and toggle classes
    const sectionIds = ['hero', 'categories', 'deals', 'explore', 'testimonials', 'brands', 'footer'];
    const triggerY = scrollY + window.innerHeight / 3;
    
    let activeId = 'hero';
    for (const id of sectionIds) {
      const el = document.getElementById(id) || (id === 'footer' ? document.querySelector('footer') : null);
      if (!el) continue;
      if (triggerY >= el.offsetTop) {
        activeId = id;
      }
    }
    
    sectionIds.forEach(id => {
      document.body.classList.toggle(`active-sec-${id}`, id === activeId);
    });

    // Toggle dark mode classes
    const darkSections = ['hero', 'categories', 'deals', 'explore', 'testimonials', 'brands', 'footer'];
    document.body.classList.toggle('theme-dark-scroll', darkSections.includes(activeId));
  });
}

function pruneEmptyCategories() {
  const activeCats = new Set(products.map(p => (p.category || '').toLowerCase().trim()));

  // 1. Prune header search dropdown
  const hSearchDropdown = document.getElementById('search-cat-dropdown');
  if (hSearchDropdown) {
    Array.from(hSearchDropdown.options).forEach(opt => {
      const val = opt.value.toLowerCase().trim();
      if (val !== 'all' && val !== 'deals' && !activeCats.has(val)) {
        opt.style.display = 'none';
      } else {
        opt.style.display = '';
      }
    });
  }

  // 2. Prune sub-navigation links
  const subNavLinks = document.querySelectorAll('.sub-nav-links a');
  subNavLinks.forEach(link => {
    const cat = link.getAttribute('data-cat') || link.getAttribute('href')?.split('/').pop() || '';
    const cleanCat = cat.toLowerCase().trim();
    if (cleanCat && cleanCat !== 'all' && cleanCat !== 'deals') {
      const isMatch = cleanCat === 'watches' || cleanCat === 'watch' ? activeCats.has('watch') : activeCats.has(cleanCat);
      if (!isMatch) {
        link.style.display = 'none';
      } else {
        link.style.display = '';
      }
    } else {
      link.style.display = '';
    }
  });

  // 3. Prune circular quick category links
  const circCatItems = document.querySelectorAll('.circ-cat-item');
  circCatItems.forEach(item => {
    const cat = item.getAttribute('data-cat') || item.getAttribute('href')?.split('/').pop() || '';
    const cleanCat = cat.toLowerCase().trim();
    if (cleanCat && cleanCat !== 'all' && cleanCat !== 'deals') {
      const isMatch = cleanCat === 'watches' || cleanCat === 'watch' ? activeCats.has('watch') : activeCats.has(cleanCat);
      if (!isMatch) {
        item.style.display = 'none';
      } else {
        item.style.display = '';
      }
    } else {
      item.style.display = '';
    }
  });

  // 4. Prune catalog category filter buttons
  const catFilterBtns = document.querySelectorAll('.cat-btn');
  catFilterBtns.forEach(btn => {
    const cat = btn.getAttribute('data-cat') || '';
    const cleanCat = cat.toLowerCase().trim();
    if (cleanCat && cleanCat !== 'all' && cleanCat !== 'deals') {
      const isMatch = cleanCat === 'watches' || cleanCat === 'watch' ? activeCats.has('watch') : activeCats.has(cleanCat);
      if (!isMatch) {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
    } else {
      btn.style.display = '';
    }
  });

  // 5. Hide promo banners if the target category has 0 items
  const b1Card = document.getElementById('promo-b1-card');
  const b2Card = document.getElementById('promo-b2-card');
  if (b1Card && settings?.promo_b1_cat) {
    const isMatch = activeCats.has(settings.promo_b1_cat.toLowerCase().trim());
    b1Card.style.display = isMatch ? '' : 'none';
  }
  if (b2Card && settings?.promo_b2_cat) {
    const isMatch = activeCats.has(settings.promo_b2_cat.toLowerCase().trim());
    b2Card.style.display = isMatch ? '' : 'none';
  }
}

function initScroll3DCanvas() {
  if (document.getElementById('scroll-3d-canvas')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'scroll-3d-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = canvas.width = 460;
  let height = canvas.height = 460;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = rect.width * window.devicePixelRatio;
    height = canvas.height = rect.height * window.devicePixelRatio;
  }
  window.addEventListener('resize', resize);
  resize();

  const vertices = [
    [0, -1.2, 0],
    [0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7], [-0.7, 0, 0.7],
    [0.9, -0.4, 0], [0, -0.4, 0.9], [-0.9, -0.4, 0], [0, -0.4, -0.9],
    [0, 1.2, 0]
  ];

  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [0, 5], [0, 6], [0, 7], [0, 8],
    [1, 2], [2, 3], [3, 4], [4, 1],
    [1, 9], [2, 9], [3, 9], [4, 9],
    [5, 9], [6, 9], [7, 9], [8, 9],
    [5, 6], [6, 7], [7, 8], [8, 5]
  ];

  let scrollProgress = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      scrollProgress = scrollY / maxScroll;
    }
    draw();
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height) * 0.35;
    const cx = width / 2;
    const cy = height / 2;

    const angleX = scrollProgress * Math.PI * 3 + 0.5;
    const angleY = scrollProgress * Math.PI * 5 + 0.8;
    const angleZ = scrollProgress * Math.PI * 2;

    const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const cosZ = Math.cos(angleZ), sinZ = Math.sin(angleZ);

    const projected = [];

    vertices.forEach(v => {
      let x1 = v[0] * cosY - v[2] * sinY;
      let z1 = v[0] * sinY + v[2] * cosY;

      let y2 = v[1] * cosX - z1 * sinX;
      let z2 = v[1] * sinX + z1 * cosX;

      let x3 = x1 * cosZ - y2 * sinZ;
      let y3 = x1 * sinZ + y2 * cosZ;

      const depth = 2.5;
      const f = 1.8 / (depth + z2);
      
      projected.push({
        x: x3 * scale * f + cx,
        y: y3 * scale * f + cy,
        z: z2
      });
    });

    ctx.lineWidth = 1.5 * window.devicePixelRatio;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#fbc02d';

    edges.forEach(edge => {
      const p1 = projected[edge[0]];
      const p2 = projected[edge[1]];
      const avgZ = (p1.z + p2.z) / 2;
      const opacity = Math.max(0.15, 0.65 - avgZ * 0.3);
      
      ctx.strokeStyle = primaryColor;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    ctx.globalAlpha = 0.9;
    projected.forEach(p => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5 * window.devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7 * window.devicePixelRatio, 0, Math.PI * 2);
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 0.9;
    });
    ctx.globalAlpha = 1.0;
  }

  draw();
}

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
