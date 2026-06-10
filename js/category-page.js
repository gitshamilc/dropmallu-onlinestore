/* ═══════════════════════════════════════════════════════════════
   DROPYMART — Dedicated Category Page Hydrator
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────
let categorySlug = '';
let categoryProducts = [];
let allProducts = [];
let cart = [];
let settings = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Helpers ──────────────────────────────────────────────────────
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

function formatPrice(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// Category matching map
function matchCategory(p, slug) {
  if (slug === 'all') return true;
  if (slug === 'deals') return p.badge && p.badge.trim() !== '';
  
  const cat = (p.category || '').toLowerCase().trim();
  const cleanSlug = slug.toLowerCase().trim();
  
  if (cat === cleanSlug) return true;
  if (cleanSlug === 'watches' && cat === 'watch') return true;
  if (cleanSlug === 'watch' && cat === 'watch') return true;
  if (cleanSlug === 'powerbanks' && cat === 'powerbank') return true;
  if (cleanSlug === 'powerbank' && cat === 'powerbank') return true;
  if (cleanSlug === 'shoes' && cat === 'shoe') return true;
  if (cleanSlug === 'shoe' && cat === 'shoe') return true;
  if (cleanSlug === 'projectors' && cat === 'projector') return true;
  if (cleanSlug === 'projector' && cat === 'projector') return true;
  if (cleanSlug === 'gadgets' && cat === 'gadgets') return true;
  if (cleanSlug === 'electronics' && (cat === 'gadgets' || cat === 'projector' || cat === 'powerbank')) return true;
  if (cleanSlug === 'mobiles' && (cat === 'gadgets' || cat === 'accessories')) return true;
  if (cleanSlug === 'mobile' && (cat === 'gadgets' || cat === 'accessories')) return true;
  return false;
}

// ── Init ─────────────────────────────────────────────────────────
async function initCategoryPage() {
  try {
    allProducts = await getProducts();
    settings = await getSettings();
    
    // Load cart
    try {
      const saved = localStorage.getItem('dropymart_cart');
      if (saved) cart = JSON.parse(saved);
    } catch (e) {
      console.error("Cart loading error:", e);
    }
    
    // Parse slug
    const pathParts = window.location.pathname.split('/');
    categorySlug = pathParts.pop() || pathParts[pathParts.length - 2];
    
    categoryProducts = allProducts.filter(p => matchCategory(p, categorySlug));
    
    // Theme override
    applyThemeSettings(settings);
    
    // Hydrate Header metadata
    hydrateMetadata(categorySlug);
    
    // Render
    renderBreadcrumbs(categorySlug);
    renderCategoryHeader(categorySlug);
    renderProductsList(categoryProducts);
    
    // Setup general interactions
    createScrollProgressBar();
    initDynamicScrollBackground();
    initLogoInteractions();
    refreshCart();
    bindEvents();
    
  } catch (err) {
    console.error("Failed to load category page:", err);
    $('#category-content-area').innerHTML = `<p style="text-align:center;color:red;">Error loading collection.</p>`;
  }
}

// ── Apply Settings ───────────────────────────────────────────────
function applyThemeSettings(s) {
  if (!s) return;
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

  document.body.style.backgroundColor = s.theme_bg_dark || '#f3f5f8';

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
  
  if (window.lucide) window.lucide.createIcons();
}

// ── Dynamic Category Title mapping ─────────────────────────────────
function getCategoryMeta(slug) {
  const meta = {
    title: "Premium Products",
    desc: "Browse our collection of premium items."
  };
  
  const clean = slug.toLowerCase().trim();
  if (clean === 'watch' || clean === 'watches') {
    meta.title = "Premium Watches Collection";
    meta.desc = "Exquisite luxury and smartwatches designed for a modern, connected lifestyle.";
  } else if (clean === 'powerbank' || clean === 'powerbanks') {
    meta.title = "High-Capacity Fast Powerbanks";
    meta.desc = "Power Delivery (PD) external batteries for laptops, iPhone cases, and tech accessories.";
  } else if (clean === 'shoe' || clean === 'shoes') {
    meta.title = "Premium Sports & Lifestyle Shoes";
    meta.desc = "High-rebound nitrogen foam, carbon fiber shanks, and breathable comfort shoes.";
  } else if (clean === 'projector' || clean === 'projectors') {
    meta.title = "Cinematic 4K Laser Projectors";
    meta.desc = "Transform your living space with automatic focus projectors and ceiling projections.";
  } else if (clean === 'gadgets') {
    meta.title = "Smart Gadgets & Innovations";
    meta.desc = "Upgrade your home, desk setup, and workflow with addressable RGB levitating creations.";
  } else if (clean === 'deals') {
    meta.title = "Limited-Time Special Deals";
    meta.desc = "Catch the daily drops and flash sales offering up to 60% off original premium accessories.";
  } else if (clean === 'all') {
    meta.title = "Full Catalog - Browse All Products";
    meta.desc = "View our comprehensive collection of authenticated gadgets, apparel, and gadgets.";
  }
  return meta;
}

// ── Hydrate SEO & Schema metadata ───────────────────────────────
function hydrateMetadata(slug) {
  const canonicalUrl = `https://dropymart.store/category/${slug}`;
  const meta = getCategoryMeta(slug);
  
  // Set title
  document.title = `${meta.title} — Shop Online | DROPYMART`;
  
  // Update Meta Description
  let metaDesc = $('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = meta.desc;

  // Set Canonical
  let canonicalLink = $('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  // Open Graph tags
  let ogTitle = $('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = `${meta.title} — DROPYMART`;
  let ogDesc = $('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = meta.desc;
  let ogUrl = $('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = canonicalUrl;

  // Twitter Card tags
  let twTitle = $('meta[name="twitter:title"]');
  if (twTitle) twTitle.content = `${meta.title} — DROPYMART`;
  let twDesc = $('meta[name="twitter:description"]');
  if (twDesc) twDesc.content = meta.desc;

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://dropymart.store/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": meta.title,
        "item": canonicalUrl
      }
    ]
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(breadcrumbSchema);
  document.head.appendChild(script);
}

// ── Render Breadcrumbs ───────────────────────────────────────────
function renderBreadcrumbs(slug) {
  const container = $('#category-breadcrumbs');
  if (!container) return;
  const meta = getCategoryMeta(slug);
  
  container.innerHTML = `
    <a href="/">Home</a>
    <span class="separator">&gt;</span>
    <span class="current">${escapeHTML(meta.title)}</span>
  `;
}

// ── Render Header ────────────────────────────────────────────────
function renderCategoryHeader(slug) {
  const meta = getCategoryMeta(slug);
  const titleEl = $('#cat-title-h1');
  const descEl = $('#cat-desc-p');
  
  if (titleEl) titleEl.textContent = meta.title;
  if (descEl) descEl.textContent = meta.desc;
}

// ── Render Products List ─────────────────────────────────────────
function renderProductsList(list) {
  const loader = $('#category-content-area');
  const grid = $('#category-product-grid');
  const countEl = $('#product-count-span');
  
  if (!grid) return;
  grid.innerHTML = '';
  
  if (loader) loader.style.display = 'none';
  grid.style.display = 'grid';
  
  if (countEl) countEl.textContent = `${list.length} premium product${list.length === 1 ? '' : 's'} found`;
  
  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);">
        <p style="color: var(--text-sub); margin-bottom: 0;">No products match this category right now.</p>
      </div>`;
    return;
  }
  
  list.forEach(p => {
    const card = document.createElement('a');
    card.href = `/product/${slugify(p.name)}`;
    card.className = 'product-card glass';
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
        <h3 class="product-name" style="font-size: 13px; font-weight: 600; margin: 4px 0;">${escapeHTML(p.name)}</h3>
        <p class="product-desc" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px;color:var(--text-sub);margin-bottom:8px;">${escapeHTML(p.description)}</p>
        <div class="product-footer">
          <span class="product-price" style="font-size: 14px; font-weight: 700; color: var(--primary);">${price}</span>
          <button class="cart-add-btn" title="Add to Cart" onclick="event.preventDefault(); event.stopPropagation(); addToCart('${escapeHTML(p.id)}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── Cart Operations ──────────────────────────────────────────────
window.addToCart = function(id) {
  const item = allProducts.find(p => p.id === id);
  if (!item) return;
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: 1 });
  }
  refreshCart();
  openCart();
};

window.removeFromCart = function(id) {
  cart = cart.filter(c => c.id !== id);
  refreshCart();
};

window.changeQty = function(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== id);
  }
  refreshCart();
};

function refreshCart() {
  localStorage.setItem('dropymart_cart', JSON.stringify(cart));
  
  const cartBadge = $('#cart-badge');
  const cartItemsEl = $('#cart-items');
  const cartTotalEl = $('#cart-total');
  const checkoutBtn = $('#checkout-btn');
  
  if (!cartBadge || !cartItemsEl || !cartTotalEl) return;

  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  cartBadge.textContent = count;
  cartBadge.style.display = count > 0 ? 'flex' : 'none';

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty" style="text-align:center; padding:3rem 0; color:var(--text-sub);">
        <i data-lucide="shopping-bag" style="width:40px; height:40px; margin-bottom:10px; opacity:0.5;"></i>
        <p>Your cart is empty</p>
      </div>`;
    if (checkoutBtn) checkoutBtn.disabled = true;
  } else {
    if (checkoutBtn) checkoutBtn.disabled = false;
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
  if (window.lucide) window.lucide.createIcons();
}

function openCart() {
  $('#cart-drawer')?.classList.add('open');
  const b = $('#backdrop');
  if (b) {
    b.style.display = 'block';
    setTimeout(() => b.classList.add('active'), 10);
  }
}

function closeCart() {
  $('#cart-drawer')?.classList.remove('open');
  const b = $('#backdrop');
  if (b) {
    b.classList.remove('active');
    setTimeout(() => { b.style.display = 'none'; }, 300);
  }
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

// ── Bind UI Event Listeners ──────────────────────────────────────
function bindEvents() {
  $('#cart-toggle')?.addEventListener('click', openCart);
  $('#cart-close')?.addEventListener('click', closeCart);
  $('#backdrop')?.addEventListener('click', closeCart);
  $('#checkout-btn')?.addEventListener('click', doCheckout);

  // Search redirection
  const hSearchInput = $('#header-search-input');
  const hSearchBtn = $('#header-search-btn');
  const hSearchDropdown = $('#search-cat-dropdown');

  if (hSearchBtn && hSearchInput) {
    const triggerSearch = () => {
      const q = encodeURIComponent(hSearchInput.value.trim());
      const cat = hSearchDropdown?.value || 'all';
      window.location.href = `/?cat=${cat}&search=${q}`;
    };

    hSearchBtn.addEventListener('click', triggerSearch);
    hSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  }

  // Category page live search filter
  const catSearch = $('#cat-search');
  if (catSearch) {
    catSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = categoryProducts.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
      renderProductsList(filtered);
    });
  }
  
  // Newsletter Signup
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
}

// ── Scroll Progress, Theme Transitions & Logo Functions ──────────────
function createScrollProgressBar() {
  if (document.getElementById('scroll-progress-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'scroll-progress-bar';
  document.body.appendChild(bar);
}

function initDynamicScrollBackground() {
  document.body.classList.add('active-sec-hero');
  document.body.classList.add('theme-dark-scroll');

  const updateLogoRotation = () => {
    const logoImg = document.querySelector('#main-header .logo img');
    if (logoImg) {
      logoImg.style.transform = `rotate(${window.scrollY * 0.08}deg)`;
    }
  };

  window.addEventListener('scroll', () => {
    updateLogoRotation();
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
    // Note: Detail pages typically only have main content and a footer.
    const sectionIds = ['hero', 'explore', 'footer'];
    const triggerY = scrollY + window.innerHeight / 3;
    
    let activeId = 'hero';
    for (const id of sectionIds) {
      const el = document.getElementById(id) || (id === 'footer' ? document.querySelector('footer') : null);
      if (!el) continue;
      if (triggerY >= el.offsetTop) {
        activeId = id;
      }
    }
    
    // Toggle active classes
    const allSectionIds = ['hero', 'categories', 'deals', 'explore', 'testimonials', 'brands', 'footer'];
    allSectionIds.forEach(id => {
      document.body.classList.toggle(`active-sec-${id}`, id === activeId);
    });

    // Toggle dark mode classes
    document.body.classList.toggle('theme-dark-scroll', true); // Detail pages stay dark theme readable
  });

  // Run initial rotation check
  updateLogoRotation();
}

function initLogoInteractions() {
  const logoImg = document.querySelector('#main-header .logo img');
  if (logoImg) {
    logoImg.classList.add('logo-spin-load');
    setTimeout(() => logoImg.classList.remove('logo-spin-load'), 850);
  }

  const headerLogoEl = document.querySelector('#main-header .logo');
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
        if (enabled) {
          localStorage.setItem('admin_mode_enabled', 'false');
          alert("🔒 Merchant Mode Disabled! Sign In option is now hidden.");
        } else {
          localStorage.setItem('admin_mode_enabled', 'true');
          alert("🔒 Merchant Mode Enabled! Sign In option is now visible.");
        }
        logoClicks = 0;
      }
    });
  }
}



// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initCategoryPage);
