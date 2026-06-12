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

    // Meta Pixel ViewContent event
    if (typeof window.trackMetaEvent === 'function') {
      window.trackMetaEvent('ViewContent', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        value: product.price,
        currency: 'INR'
      });
    }
    
    // 6. Setup general interactions
    createScrollProgressBar();
    initDynamicScrollBackground();
    initLogoInteractions();
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
  const canonicalUrl = `https://www.dropymart.store/product/${slugify(p.name)}`;
  
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
        "url": "https://www.dropymart.store/"
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
        "item": "https://www.dropymart.store/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": p.category.charAt(0).toUpperCase() + p.category.slice(1),
        "item": `https://www.dropymart.store/category/${p.category}`
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

  const originalPriceVal = Math.round(p.price * 1.35);
  const originalPriceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(originalPriceVal);

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
        
        <div class="pdp-price-container" style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; background: rgba(255,255,255,0.02); padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <span class="pdp-price" style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">${price}</span>
          <span class="pdp-compare-price" style="font-size: 1.2rem; text-decoration: line-through; color: var(--text-sub); margin-left: 8px;">${originalPriceFormatted}</span>
          <span class="pdp-discount-badge" style="font-size: 0.85rem; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 3px 8px; border-radius: 4px; margin-left: 8px;">26% OFF</span>
        </div>
        
        <div class="pdp-urgency-box" style="margin-top:5px; margin-bottom:15px;">
          <span class="pdp-stock-warning" style="${stockStyle}">${escapeHTML(stockText)}</span>
        </div>

        <div class="pdp-trust-indicators" style="display: flex; gap: 15px; margin-bottom: 20px; font-size: 12px; color: var(--text-sub); flex-wrap: wrap; border-bottom: 1px solid var(--border-glass); padding-bottom: 15px;">
          <span style="display: flex; align-items: center; gap: 6px;"><i data-lucide="shield-check" style="color: #10b981; width: 14px; height: 14px;"></i> 100% Secure Checkout</span>
          <span style="display: flex; align-items: center; gap: 6px;"><i data-lucide="truck" style="color: #10b981; width: 14px; height: 14px;"></i> Free & Fast Delivery</span>
          <span style="display: flex; align-items: center; gap: 6px;"><i data-lucide="refresh-cw" style="color: #10b981; width: 14px; height: 14px;"></i> 7-Day Replacement Policy</span>
        </div>
 
        <div class="pdp-actions-container" style="display: flex; gap: 15px; margin-top: 5px; margin-bottom: 25px;">
          <button class="btn-pdp btn-pdp-cart" style="flex: 1; padding: 15px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; cursor: pointer; border: none;" onclick="addToCart('${escapeHTML(p.id)}')">
            <i data-lucide="shopping-cart"></i>
            ADD TO CART
          </button>
          <button class="btn-pdp btn-pdp-buynow" style="flex: 1; padding: 15px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; cursor: pointer; border: none;" onclick="directBuy('${escapeHTML(p.id)}')">
            <svg width="18" height="18" viewBox="0 0 448 512" fill="currentColor" style="margin-right: 4px;"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5.1-3.9-10.6-6.9z"/></svg>
            ORDER ON WHATSAPP
          </button>
        </div>

        <p class="pdp-desc" style="line-height:1.6; font-size:14px; color:var(--text-sub); margin-bottom: 20px;">${escapeHTML(p.description)}</p>
        
        ${specsHtml}

        <div class="pdp-trust-accordion" style="margin-top: 30px; border-top: 1px solid var(--border-glass); padding-top: 20px;">
          <div class="accordion-item" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 10px; margin-bottom: 10px;">
            <div class="accordion-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:600; color:var(--text-main); font-size:14px;" onclick="const content=this.nextElementSibling; const icon=this.querySelector('.arrow'); if(content.style.display==='none'){content.style.display='block'; icon.style.transform='rotate(180deg)';}else{content.style.display='none'; icon.style.transform='rotate(0deg)';}">
              <span>📦 Shipping & Delivery Details</span>
              <i class="arrow" data-lucide="chevron-down" style="width:16px; height:16px; transition: transform 0.2s;"></i>
            </div>
            <div class="accordion-content" style="display:none; margin-top:8px; font-size:13px; color:var(--text-sub); line-height:1.5;">
              We offer <strong>Free Fast Delivery</strong> across India. Orders are processed within 24 hours and shipped via premium courier services. Delivery usually takes 2-3 business days.
            </div>
          </div>

          <div class="accordion-item" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 10px; margin-bottom: 10px;">
            <div class="accordion-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:600; color:var(--text-main); font-size:14px;" onclick="const content=this.nextElementSibling; const icon=this.querySelector('.arrow'); if(content.style.display==='none'){content.style.display='block'; icon.style.transform='rotate(180deg)';}else{content.style.display='none'; icon.style.transform='rotate(0deg)';}">
              <span>🔄 7-Day Replacement Policy</span>
              <i class="arrow" data-lucide="chevron-down" style="width:16px; height:16px; transition: transform 0.2s;"></i>
            </div>
            <div class="accordion-content" style="display:none; margin-top:8px; font-size:13px; color:var(--text-sub); line-height:1.5;">
              Customer satisfaction is our priority. If you receive a damaged, defective, or incorrect product, you can request a replacement within 7 days of delivery.
            </div>
          </div>

          <div class="accordion-item" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 10px; margin-bottom: 10px;">
            <div class="accordion-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:600; color:var(--text-main); font-size:14px;" onclick="const content=this.nextElementSibling; const icon=this.querySelector('.arrow'); if(content.style.display==='none'){content.style.display='block'; icon.style.transform='rotate(180deg)';}else{content.style.display='none'; icon.style.transform='rotate(0deg)';}">
              <span>❓ How to Order?</span>
              <i class="arrow" data-lucide="chevron-down" style="width:16px; height:16px; transition: transform 0.2s;"></i>
            </div>
            <div class="accordion-content" style="display:none; margin-top:8px; font-size:13px; color:var(--text-sub); line-height:1.5;">
              1. Click the <strong>"ORDER ON WHATSAPP"</strong> button above.<br>
              2. It will open WhatsApp with a pre-filled message of the product.<br>
              3. Send the message. Our support team will respond instantly to collect your shipping address and confirm your payment method (UPI, NetBanking, or Cash on Delivery).
            </div>
          </div>
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

  // Meta Pixel AddToCart event
  if (typeof window.trackMetaEvent === 'function') {
    window.trackMetaEvent('AddToCart', {
      content_name: item.name,
      content_category: item.category,
      content_ids: [item.id],
      value: item.price,
      currency: 'INR'
    });
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
  const msg = `Hi, I'm interested in ordering ${p.name}. Please share complete details.`;

  // Meta Pixel Lead event for direct purchases
  if (typeof window.trackMetaEvent === 'function') {
    window.trackMetaEvent('Lead', {
      content_name: p.name,
      content_category: p.category,
      content_ids: [p.id],
      value: p.price,
      currency: 'INR'
    });
  }

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

  // Meta Pixel InitiateCheckout event for cart purchases
  if (typeof window.trackMetaEvent === 'function') {
    window.trackMetaEvent('InitiateCheckout', {
      num_items: cart.length,
      value: total,
      currency: 'INR'
    });
  }

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
document.addEventListener('DOMContentLoaded', initProductPage);
