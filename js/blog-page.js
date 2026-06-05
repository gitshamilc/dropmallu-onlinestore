/* ═══════════════════════════════════════════════════════════════
   DROPMALLU — Dedicated Blog Detail Page Hydrator
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────
let article = null;
let blogs = [];
let products = [];
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

// ── Init ─────────────────────────────────────────────────────────
async function initBlogPage() {
  try {
    blogs = await getBlogs();
    products = await getProducts(); // Loaded for cart support
    settings = await getSettings();
    
    // Load cart
    try {
      const saved = localStorage.getItem('dropmallu_cart');
      if (saved) cart = JSON.parse(saved);
    } catch (e) {
      console.error("Cart loading error:", e);
    }
    
    // Parse slug
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts.pop() || pathParts[pathParts.length - 2];
    
    article = blogs.find(b => slugify(b.title) === slug);
    
    if (!article) {
      renderErrorState();
      return;
    }

    // Apply settings
    applyThemeSettings(settings);
    
    // Hydrate metadata
    hydrateMetadata(article);
    
    // Render content
    renderBreadcrumbs(article);
    renderArticleContent(article);
    
    // Setup cart
    refreshCart();
    bindEvents();
    
  } catch (err) {
    console.error("Failed to load blog page:", err);
    renderErrorState();
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

// ── Hydrate SEO & Schema metadata ───────────────────────────────
function hydrateMetadata(b) {
  const canonicalUrl = `https://dropmallu.xyz/blog/${slugify(b.title)}`;
  
  // Set title
  document.title = `${b.title} — Insights & Tech News | DROPMALLU`;
  
  // Update Meta Description
  let metaDesc = $('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = b.summary;

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
  if (ogTitle) ogTitle.content = b.title;
  let ogDesc = $('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = b.summary;
  let ogImg = $('meta[property="og:image"]');
  if (ogImg) ogImg.content = b.image;
  let ogUrl = $('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = canonicalUrl;

  // JSON-LD NewsArticle Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": b.title,
    "image": [ b.image ],
    "datePublished": new Date(b.date).toISOString().split('T')[0] + "T08:00:00+05:30",
    "author": [{
      "@type": "Person",
      "name": b.author || "DROPMALLU Writer",
      "url": "https://dropmallu.xyz/"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "DROPMALLU",
      "logo": {
        "@type": "ImageObject",
        "url": "https://dropmallu.xyz/favicon.ico"
      }
    },
    "description": b.summary
  };

  // JSON-LD Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://dropmallu.xyz/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://dropmallu.xyz/#section-newsletter"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": b.title,
        "item": canonicalUrl
      }
    ]
  };

  const script1 = document.createElement('script');
  script1.type = 'application/ld+json';
  script1.text = JSON.stringify(articleSchema);
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.type = 'application/ld+json';
  script2.text = JSON.stringify(breadcrumbSchema);
  document.head.appendChild(script2);
}

// ── Render Breadcrumbs ───────────────────────────────────────────
function renderBreadcrumbs(b) {
  const container = $('#blog-breadcrumbs');
  if (!container) return;
  
  container.innerHTML = `
    <a href="/">Home</a>
    <span class="separator">&gt;</span>
    <span class="current">${escapeHTML(b.title)}</span>
  `;
}

// ── Render Article Content ───────────────────────────────────────
function renderArticleContent(b) {
  const container = $('#blog-content-area');
  if (!container) return;

  const paragraphs = (b.content || 'Full article coming soon.').split('\n\n').map(p => `
    <p style="margin-bottom: 1.5rem; text-align: justify; font-size: 1.05rem;">${escapeHTML(p)}</p>
  `).join('');

  container.innerHTML = `
    <article class="article-card-page">
      <div class="article-hero" style="position: relative; height: 380px; overflow: hidden; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
        <img src="${escapeHTML(b.image)}" alt="${escapeHTML(b.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';">
        <div class="article-hero-text" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(11,30,54,0.9), transparent); padding: 2rem; color: #fff; z-index: 2;">
          <h1 style="font-size: 2.2rem; font-weight: 800; line-height: 1.2; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${escapeHTML(b.title)}</h1>
          <div class="article-meta" style="display: flex; gap: 15px; font-size: 0.85rem; opacity: 0.9;">
            <span><i data-lucide="user" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${escapeHTML(b.author)}</span>
            <span><i data-lucide="calendar" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${escapeHTML(b.date)}</span>
            <span><i data-lucide="clock" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${escapeHTML(b.readTime)}</span>
          </div>
        </div>
        <div style="position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.25); z-index: 1;"></div>
      </div>
      
      <div class="article-body">
        <p class="lead">${escapeHTML(b.summary)}</p>
        <div class="content">
          ${paragraphs}
        </div>
        
        <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border-glass); text-align: center;">
          <h4 style="margin-bottom: 15px; color: var(--text-main); font-weight: 600;">Upgrade your gear</h4>
          <p style="color: var(--text-sub); font-size: 0.9rem; margin-bottom: 20px;">Explore premium gadgets matching this editorial review.</p>
          <a href="/" class="checkout-btn" style="display: inline-flex; width: auto; padding: 12px 24px; border-radius: var(--radius-sm); text-decoration: none; font-weight: 700; gap: 8px; align-items: center;">
            <i data-lucide="shopping-bag" style="width: 16px; height: 16px;"></i> Browse Store Catalog
          </a>
        </div>
      </div>
    </article>
  `;
  
  if (window.lucide) window.lucide.createIcons();
}

// ── Render Error State ───────────────────────────────────────────
function renderErrorState() {
  const container = $('#blog-content-area');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);">
      <h2 style="font-size: 2rem; color: var(--text-main); margin-bottom: 10px;">Article Not Found</h2>
      <p style="color: var(--text-sub); margin-bottom: 2rem;">The editorial feature you are looking for does not exist or has been removed.</p>
      <a href="/" class="checkout-btn" style="display: inline-flex; width: auto; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none;">
        Return to Storefront
      </a>
    </div>
  `;
}

// ── Cart Operations (Global scopes) ──────────────────────────────
window.addToCart = function(id) {
  const item = products.find(p => p.id === id);
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
  localStorage.setItem('dropmallu_cart', JSON.stringify(cart));
  
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
  const msg = `Hi! I want to order from DROPMALLU:\n\n${lines}\n*Total:* ₹${total.toLocaleString('en-IN')}\n\nPlease confirm!`;
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

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initBlogPage);
