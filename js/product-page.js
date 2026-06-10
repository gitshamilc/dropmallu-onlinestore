/* ═══════════════════════════════════════════════════════════════
   DROPYMART — Dedicated Product Detail Page Hydrator
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────
let product = null;
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
async function initProductPage() {
  try {
    // 1. Fetch data
    products = await getProducts();
    settings = await getSettings();
    
    // Load cart
    try {
      const saved = localStorage.getItem('dropymart_cart');
      if (saved) cart = JSON.parse(saved);
    } catch (e) {
      console.error("Cart loading error:", e);
    }
    
    // 2. Identify product
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts.pop() || pathParts[pathParts.length - 2]; // Handles trailing slashes
    
    product = products.find(p => slugify(p.name) === slug);
    
    if (!product) {
      renderErrorState();
      return;
    }

    // 3. Apply settings & theme override
    applyThemeSettings(settings);
    
    // 4. Update head metadata & dynamic JSON-LD schemas
    hydrateMetadata(product);
    
    // 5. Render components
    renderBreadcrumbs(product);
    renderProductDetails(product);
    renderRelatedProducts(product);
    
    // 6. Setup general interactions
    createScrollProgressBar();
    initDynamicScrollBackground();
    initLogoInteractions();
    initScroll3DCanvas();
    refreshCart();
    bindEvents();
    
  } catch (err) {
    console.error("Failed to load product page:", err);
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
function hydrateMetadata(p) {
  const canonicalUrl = `https://dropymart.xyz/product/${slugify(p.name)}`;
  
  // Set title
  document.title = `${p.name} — Buy Premium ${p.category.charAt(0).toUpperCase() + p.category.slice(1)} | DROPYMART`;
  
  // Update Meta Description
  let metaDesc = $('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = `Buy ${p.name} at ₹${p.price.toLocaleString('en-IN')}. ${p.description.substring(0, 140)}... Free fast shipping inside India. Order now via WhatsApp!`;

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
  if (ogTitle) ogTitle.content = `${p.name} — DROPYMART`;
  let ogDesc = $('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = p.description.substring(0, 160);
  let ogImg = $('meta[property="og:image"]');
  if (ogImg) ogImg.content = p.image;
  let ogUrl = $('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = canonicalUrl;

  // Twitter Card tags
  let twTitle = $('meta[name="twitter:title"]');
  if (twTitle) twTitle.content = `${p.name} — DROPYMART`;
  let twDesc = $('meta[name="twitter:description"]');
  if (twDesc) twDesc.content = p.description.substring(0, 160);
  let twImg = $('meta[name="twitter:image"]');
  if (twImg) twImg.content = p.image;

  // JSON-LD Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "description": p.description,
    "image": p.image,
    "brand": {
      "@type": "Brand",
      "name": "DROPYMART"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": p.price,
      "availability": "https://schema.org/InStock",
      "url": canonicalUrl,
      "priceValidUntil": "2027-12-31",
      "seller": {
        "@type": "Organization",
        "name": "DROPYMART",
        "url": "https://dropymart.xyz/"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": p.rating || 4.5,
      "reviewCount": p.reviews || 24
    }
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
        "item": "https://dropymart.xyz/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": p.category.charAt(0).toUpperCase() + p.category.slice(1),
        "item": `https://dropymart.xyz/category/${p.category}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": p.name,
        "item": canonicalUrl
      }
    ]
  };

  const script1 = document.createElement('script');
  script1.type = 'application/ld+json';
  script1.text = JSON.stringify(productSchema);
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.type = 'application/ld+json';
  script2.text = JSON.stringify(breadcrumbSchema);
  document.head.appendChild(script2);
}

// ── Render Breadcrumbs ───────────────────────────────────────────
function renderBreadcrumbs(p) {
  const container = $('#pdp-breadcrumbs');
  if (!container) return;
  
  const categoryLabel = p.category.charAt(0).toUpperCase() + p.category.slice(1);
  container.innerHTML = `
    <a href="/">Home</a>
    <span class="separator">&gt;</span>
    <a href="/category/${p.category}">${categoryLabel}</a>
    <span class="separator">&gt;</span>
    <span class="current">${escapeHTML(p.name)}</span>
  `;
}

// ── Render Product Details ───────────────────────────────────────
function renderProductDetails(p) {
  const container = $('#pdp-content-area');
  if (!container) return;

  const price = formatPrice(p.price);
  const ratingStars = '★'.repeat(Math.round(p.rating || 4.5)) + '☆'.repeat(5 - Math.round(p.rating || 4.5));

  // Urgency indicator / stock status
  let stockText = 'Hurry! Only 4 left in stock.';
  let stockStyle = 'color:#ef4444; background: rgba(239, 68, 68, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ef4444;';
  
  if (p.stock_status) {
    stockText = p.stock_status;
    stockStyle = p.stock_status.toLowerCase().includes('out') ? 'color:#ef4444;' : 'color:#10b981;';
  } else if (typeof p.inventory !== 'undefined') {
    const inv = Number(p.inventory);
    if (inv === 0) {
      stockText = 'Out of Stock';
      stockStyle = 'color:#ef4444;';
    } else if (inv <= 10) {
      stockText = `Hurry! Only ${inv} left in stock.`;
      stockStyle = 'color:#ef4444; background: rgba(239, 68, 68, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ef4444;';
    } else {
      stockText = 'In Stock';
      stockStyle = 'color:#10b981;';
    }
  }

  // Gallery
  let galleryHtml = '';
  const images = [p.image];
  if (p.gallery) {
    p.gallery.split(',').forEach(img => {
      const trimmed = img.trim();
      if (trimmed && trimmed !== p.image) images.push(trimmed);
    });
  }
  if (images.length > 1) {
    galleryHtml = '<div class="pdp-gallery-thumbs" style="display:flex; gap:8px; margin-top:12px; overflow-x:auto; padding-bottom:4px;">';
    images.forEach((img, idx) => {
      galleryHtml += `
        <img src="${escapeHTML(img)}" 
             style="width:60px; height:60px; border-radius:var(--radius-sm); object-fit:cover; border:2px solid ${idx === 0 ? 'var(--primary)' : 'transparent'}; cursor:pointer; background:rgba(255,255,255,0.05);" 
             onclick="document.querySelector('.pdp-img').src='${escapeHTML(img)}'; document.querySelectorAll('.pdp-gallery-thumbs img').forEach(i => i.style.borderColor='transparent'); this.style.borderColor='var(--primary)';">`;
    });
    galleryHtml += '</div>';
  }

  // Specifications
  let specsHtml = '';
  if (p.specs) {
    specsHtml = '<div class="pdp-specs-list" style="margin-top: 20px; border-top: 1px solid var(--border-glass); padding-top: 15px; font-size: 13px; color: var(--text-sub);">';
    const pairs = p.specs.split(',');
    pairs.forEach(pair => {
      const parts = pair.split(':');
      if (parts.length >= 2) {
        specsHtml += `
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.02); padding-bottom:4px;">
            <strong>${escapeHTML(parts[0].trim())}:</strong> 
            <span style="color:var(--text-main);">${escapeHTML(parts[1].trim())}</span>
          </div>`;
      }
    });
    specsHtml += '</div>';
  }

  container.innerHTML = `
    <div class="pdp-grid">
      <div class="pdp-left">
        <img class="pdp-img" src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';">
        ${galleryHtml}
      </div>
      
      <div class="pdp-info pdp-right">
        ${p.badge ? `<span class="pdp-badge" style="align-self: flex-start; margin-bottom: 10px;">${escapeHTML(p.badge)}</span>` : ''}
        <h1 class="pdp-title" style="font-size: 2rem; font-weight: 700; margin-bottom: 10px; color: var(--text-main); line-height: 1.2;">${escapeHTML(p.name)}</h1>
        
        <div class="pdp-rating-row" style="display: flex; align-items: center; margin-bottom: 15px;">
          <span class="pdp-stars" style="color:#fbbf24; margin-right:8px; font-size: 1.1rem;">${ratingStars}</span>
          <span class="pdp-rating-val" style="font-weight:700; color:var(--primary); margin-right:8px;">${escapeHTML(p.rating || 4.5)}</span>
          <span class="pdp-reviews-count" style="color:var(--text-sub); font-size: 0.85rem;">(${escapeHTML(p.reviews || 20)} verified ratings)</span>
        </div>
        
        <div class="pdp-price-container" style="display: flex; align-items: baseline; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <span class="pdp-price" style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">${price}</span>
          <span class="pdp-delivery-tag" style="color:#10b981; font-size:0.85rem; font-weight:600; margin-left:15px; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="truck" style="width: 14px; height: 14px;"></i> Free Delivery in 2-3 Days
          </span>
        </div>
        
        <p class="pdp-desc" style="line-height:1.6; font-size:14px; color:var(--text-sub); margin-bottom: 20px;">${escapeHTML(p.description)}</p>
        
        ${specsHtml}
        
        <div class="pdp-urgency-box" style="margin-top:20px; margin-bottom:20px;">
          <span class="pdp-stock-warning" style="${stockStyle}">${escapeHTML(stockText)}</span>
        </div>
 
        <div class="pdp-actions-container" style="display: flex; gap: 15px; margin-top: 10px;">
          <button class="btn-pdp btn-pdp-cart" style="flex: 1; padding: 15px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; cursor: pointer; border: none;" onclick="addToCart('${escapeHTML(p.id)}')">
            <i data-lucide="shopping-cart"></i>
            ADD TO CART
          </button>
          <button class="btn-pdp btn-pdp-buynow" style="flex: 1; padding: 15px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; cursor: pointer; border: none;" onclick="directBuy('${escapeHTML(p.id)}')">
            <i data-lucide="lightning"></i>
            BUY NOW
          </button>
        </div>
      </div>
    </div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
}

// ── Render Related Products ──────────────────────────────────────
function renderRelatedProducts(p) {
  const grid = $('#related-product-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const related = products
    .filter(item => item.category === p.category && item.id !== p.id)
    .slice(0, 4);
    
  if (related.length === 0) {
    // Fallback to top products if category matches nothing else
    products.filter(item => item.id !== p.id).slice(0, 4).forEach(renderItem);
    return;
  }
  
  related.forEach(renderItem);
  
  function renderItem(item) {
    const card = document.createElement('a');
    card.href = `/product/${slugify(item.name)}`;
    card.className = 'product-card glass';
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';
    
    card.innerHTML = `
      ${item.badge ? `<span class="product-badge">${escapeHTML(item.badge)}</span>` : ''}
      <div class="product-img-wrap">
        <img class="product-img" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';">
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-cat">${escapeHTML(item.category)}</span>
          <span class="product-rating">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${escapeHTML(item.rating || '4.5')}
          </span>
        </div>
        <h3 class="product-name" style="font-size: 13px; font-weight: 600; margin: 4px 0;">${escapeHTML(item.name)}</h3>
        <div class="product-footer" style="margin-top: 8px;">
          <span class="product-price" style="font-size: 14px; font-weight: 700; color: var(--primary);">${formatPrice(item.price)}</span>
          <button class="cart-add-btn" title="Add to Cart" onclick="event.preventDefault(); event.stopPropagation(); addToCart('${escapeHTML(item.id)}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}

// ── Render Error State ───────────────────────────────────────────
function renderErrorState() {
  const container = $('#pdp-content-area');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);">
      <h2 style="font-size: 2rem; color: var(--text-main); margin-bottom: 10px;">Product Not Found</h2>
      <p style="color: var(--text-sub); margin-bottom: 2rem;">The premium item you are looking for does not exist or has been removed.</p>
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

window.directBuy = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const msg = `Hi! I want to order from DROPYMART:\n\n*Product:* ${p.name}\n*Price:* ₹${p.price.toLocaleString('en-IN')}\n\nPlease confirm availability!`;
  window.open(`https://wa.me/919895177154?text=${encodeURIComponent(msg)}`, '_blank');
};

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

  let scrollProgress = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      scrollProgress = scrollY / maxScroll;
    }
    draw();
  });

  // Define 3D wireframe geometries
  
  // 1. Box Model (open container, bottom center at y=0.3, size=0.6)
  const boxVertices = [
    [-0.3, 0.55, -0.3], [0.3, 0.55, -0.3], [0.3, 0.55, 0.3], [-0.3, 0.55, 0.3],
    [-0.3, 0.05, -0.3], [0.3, 0.05, -0.3], [0.3, 0.05, 0.3], [-0.3, 0.05, 0.3]
  ];
  const boxEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // bottom face
    [4, 5], [5, 6], [6, 7], [7, 4], // top rim
    [0, 4], [1, 5], [2, 6], [3, 7]  // vertical pillars
  ];

  // 2. Phone Model
  const phoneVertices = [
    [-0.08, -0.16, -0.012], [0.08, -0.16, -0.012], [0.08, 0.16, -0.012], [-0.08, 0.16, -0.012],
    [-0.08, -0.16, 0.012],  [0.08, -0.16, 0.012],  [0.08, 0.16, 0.012],  [-0.08, 0.16, 0.012]
  ];
  const phoneEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // back
    [4, 5], [5, 6], [6, 7], [7, 4], // front
    [0, 4], [1, 5], [2, 6], [3, 7]  // depths
  ];

  // 3. Watch Model
  const watchVertices = [];
  const watchEdges = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cosVal = Math.cos(angle) * 0.07;
    const sinVal = Math.sin(angle) * 0.07;
    watchVertices.push([cosVal, sinVal, -0.015]); // front
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cosVal = Math.cos(angle) * 0.07;
    const sinVal = Math.sin(angle) * 0.07;
    watchVertices.push([cosVal, sinVal, 0.015]);  // back
  }
  for (let i = 0; i < 8; i++) {
    watchEdges.push([i, (i + 1) % 8]);
    watchEdges.push([i + 8, ((i + 1) % 8) + 8]);
    watchEdges.push([i, i + 8]);
  }
  const baseIdx = watchVertices.length;
  watchVertices.push([-0.025, -0.07, 0], [0.025, -0.07, 0], [-0.025, -0.15, 0], [0.025, -0.15, 0]); // top strap
  watchVertices.push([-0.025, 0.07, 0], [0.025, 0.07, 0], [-0.025, 0.15, 0], [0.025, 0.15, 0]);  // bottom strap
  watchEdges.push(
    [baseIdx, baseIdx + 2], [baseIdx + 1, baseIdx + 3], [baseIdx + 2, baseIdx + 3],
    [baseIdx + 4, baseIdx + 6], [baseIdx + 5, baseIdx + 7], [baseIdx + 6, baseIdx + 7]
  );

  // 4. Earpods Model
  const podVertices = [
    [-0.02, -0.06, 0], [-0.02, 0.02, 0],
    [-0.04, -0.09, -0.02], [0.0, -0.09, -0.02], [0.0, -0.06, 0.02], [-0.04, -0.06, 0.02],
    [0.02, -0.04, -0.01], [0.02, 0.04, -0.01],
    [0.0, -0.07, -0.03], [0.04, -0.07, -0.03], [0.04, -0.04, 0.01], [0.0, -0.04, 0.01]
  ];
  const podEdges = [
    [0, 1],
    [2, 3], [3, 4], [4, 5], [5, 2], [0, 4], [1, 5],
    [6, 7],
    [8, 9], [9, 10], [10, 11], [11, 8], [6, 10], [7, 11]
  ];

  // 5. Game Controller Model
  const gamepadVertices = [
    [-0.14, -0.06, -0.02], [-0.06, -0.08, -0.02], [0.06, -0.08, -0.02], [0.14, -0.06, -0.02],
    [0.14, 0.04, -0.02],   [0.06, 0.06, -0.02],  [-0.06, 0.06, -0.02], [-0.14, 0.04, -0.02],
    [-0.14, -0.06, 0.02],  [-0.06, -0.08, 0.02],  [0.06, -0.08, 0.02],  [0.14, -0.06, 0.02],
    [0.14, 0.04, 0.02],    [0.06, 0.06, 0.02],   [-0.06, 0.06, 0.02],  [-0.14, 0.04, 0.02],
    [-0.12, 0.04, 0], [-0.16, 0.12, 0],
    [0.12, 0.04, 0],  [0.16, 0.12, 0]
  ];
  const gamepadEdges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
    [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 8],
    [0, 8], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 14], [7, 15],
    [16, 17], [18, 19]
  ];

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height) * 0.32;
    const cx = width / 2;
    const cy = height / 2;

    const lidProgress = Math.min(1, Math.max(0, scrollProgress * 2.5));
    const lidAngle = lidProgress * Math.PI * 0.75;

    const floatProgress = Math.min(1, Math.max(0, (scrollProgress - 0.2) / 0.8));
    const opacity = Math.min(1, floatProgress * 3);

    const globalAngleX = 0.5;
    const globalAngleY = scrollProgress * Math.PI * 1.5 + 0.4;

    const cosGX = Math.cos(globalAngleX), sinGX = Math.sin(globalAngleX);
    const cosGY = Math.cos(globalAngleY), sinGY = Math.sin(globalAngleY);

    function project(x, y, z, tx = 0, ty = 0, tz = 0, rotX = 0, rotY = 0) {
      let x1 = x, y1 = y, z1 = z;
      if (rotY !== 0) {
        const cosLY = Math.cos(rotY), sinLY = Math.sin(rotY);
        const rx = x1 * cosLY - z1 * sinLY;
        const rz = x1 * sinLY + z1 * cosLY;
        x1 = rx; z1 = rz;
      }
      if (rotX !== 0) {
        const cosLX = Math.cos(rotX), sinLX = Math.sin(rotX);
        const ry = y1 * cosLX - z1 * sinLX;
        const rz = y1 * sinLX + z1 * cosLX;
        y1 = ry; z1 = rz;
      }

      const gx = x1 + tx;
      const gy = y1 + ty;
      const gz = z1 + tz;

      const rx1 = gx * cosGY - gz * sinGY;
      const rz1 = gx * sinGY + gz * cosGY;

      const ry2 = gy * cosGX - rz1 * sinGX;
      const rz2 = gy * sinGX + rz1 * cosGX;

      const cameraDist = 3.2;
      const f = 2.0 / (cameraDist + rz2);

      return {
        x: rx1 * scale * f + cx,
        y: ry2 * scale * f + cy,
        z: rz2
      };
    }

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#fbc02d';

    function drawModel(pts, edges, modelOpacity, strokeStyle = primaryColor, lineWidth = 1.5) {
      ctx.lineWidth = lineWidth * window.devicePixelRatio;
      ctx.strokeStyle = strokeStyle;
      ctx.globalAlpha = modelOpacity;

      edges.forEach(edge => {
        const p1 = pts[edge[0]];
        const p2 = pts[edge[1]];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      ctx.globalAlpha = modelOpacity * 0.9;
      pts.forEach(p => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = strokeStyle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.globalAlpha = modelOpacity * 0.25;
        ctx.fill();
        ctx.globalAlpha = modelOpacity * 0.9;
      });
    }

    const projectedBox = boxVertices.map(v => project(v[0], v[1], v[2]));
    drawModel(projectedBox, boxEdges, 0.45);

    const leftLidVertices = [
      [-0.3, 0.05, 0.3],
      [-0.3, 0.05, -0.3],
      [-0.3 - 0.3 * Math.cos(lidAngle), 0.05 - 0.3 * Math.sin(lidAngle), 0.3],
      [-0.3 - 0.3 * Math.cos(lidAngle), 0.05 - 0.3 * Math.sin(lidAngle), -0.3]
    ];
    const lidEdges = [[0, 1], [1, 3], [3, 2], [2, 0]];
    const projectedLeftLid = leftLidVertices.map(v => project(v[0], v[1], v[2]));
    drawModel(projectedLeftLid, lidEdges, 0.45);

    const rightLidVertices = [
      [0.3, 0.05, 0.3],
      [0.3, 0.05, -0.3],
      [0.3 + 0.3 * Math.cos(lidAngle), 0.05 - 0.3 * Math.sin(lidAngle), 0.3],
      [0.3 + 0.3 * Math.cos(lidAngle), 0.05 - 0.3 * Math.sin(lidAngle), -0.3]
    ];
    const projectedRightLid = rightLidVertices.map(v => project(v[0], v[1], v[2]));
    drawModel(projectedRightLid, lidEdges, 0.45);

    if (floatProgress > 0) {
      const phoneTx = -0.08 - 0.38 * floatProgress;
      const phoneTy = 0.25 - 1.25 * floatProgress;
      const phoneTz = -0.05;
      const phoneRotY = floatProgress * Math.PI * 1.8;
      const phoneRotX = 0.2;
      const projectedPhone = phoneVertices.map(v => project(v[0], v[1], v[2], phoneTx, phoneTy, phoneTz, phoneRotX, phoneRotY));
      drawModel(projectedPhone, phoneEdges, opacity * 0.7);

      const watchTx = 0.08 + 0.38 * floatProgress;
      const watchTy = 0.25 - 0.95 * floatProgress;
      const watchTz = -0.05;
      const watchRotY = -floatProgress * Math.PI * 1.4;
      const watchRotX = -0.2;
      const projectedWatch = watchVertices.map(v => project(v[0], v[1], v[2], watchTx, watchTy, watchTz, watchRotX, watchRotY));
      drawModel(projectedWatch, watchEdges, opacity * 0.7);

      const podTx = -0.04 - 0.18 * floatProgress;
      const podTy = 0.25 - 1.55 * floatProgress;
      const podTz = 0.15;
      const podRotY = floatProgress * Math.PI * 2.5;
      const podRotX = 0.4;
      const projectedPods = podVertices.map(v => project(v[0], v[1], v[2], podTx, podTy, podTz, podRotX, podRotY));
      drawModel(projectedPods, podEdges, opacity * 0.7);

      const padTx = 0.04 + 0.18 * floatProgress;
      const padTy = 0.25 - 1.1 * floatProgress;
      const padTz = 0.15;
      const padRotY = -floatProgress * Math.PI * 2.0;
      const padRotX = 0.1;
      const projectedGamepad = gamepadVertices.map(v => project(v[0], v[1], v[2], padTx, padTy, padTz, padRotX, padRotY));
      drawModel(projectedGamepad, gamepadEdges, opacity * 0.7);
    }

    ctx.globalAlpha = 1.0;
  }

  draw();
}

  draw();
}

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initProductPage);
