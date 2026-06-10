// DROPYMART Admin Dashboard Javascript Logic

import { supabase, initSupabase } from "../supabase/client.js";

let adminProducts = [];
let adminBlogs = [];
let editingItemId = null;
let activeTab = "products";

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

// DOM Elements
const productsTbody = document.getElementById("products-tbody");
const blogsTbody = document.getElementById("blogs-tbody");
const statProducts = document.getElementById("stat-products");
const statBlogs = document.getElementById("stat-blogs");

// Sidebar & Tabs
const tabProducts = document.getElementById("tab-products");
const tabBlogs = document.getElementById("tab-blogs");
const tabSettings = document.getElementById("tab-settings");
const sectionProducts = document.getElementById("section-products");
const sectionBlogs = document.getElementById("section-blogs");
const sectionSettings = document.getElementById("section-settings");

// Forms & Modals
const productFormModal = document.getElementById("product-form-modal");
const blogFormModal = document.getElementById("blog-form-modal");
const productForm = document.getElementById("product-form");
const blogForm = document.getElementById("blog-form");
const settingsForm = document.getElementById("settings-form");
const prodFormTitle = document.getElementById("prod-form-title");
const blogFormTitle = document.getElementById("blog-form-title");
const signoutBtn = document.getElementById("signout-btn");

// Premium Visual Feedback Systems
function showLoadingOverlay(show, message = "Synchronizing database...") {
  const overlay = document.getElementById("admin-loading-overlay");
  const msgEl = document.getElementById("admin-loading-msg");
  if (!overlay) return;
  if (show) {
    if (msgEl) msgEl.textContent = message;
    overlay.style.display = "flex";
    setTimeout(() => overlay.classList.add("active"), 10);
  } else {
    overlay.classList.remove("active");
    setTimeout(() => overlay.style.display = "none", 300);
  }
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast glass ${type}`;
  
  let icon = "check-circle";
  if (type === "error") icon = "alert-circle";
  if (type === "warning") icon = "alert-triangle";
  
  toast.innerHTML = `
    <i data-lucide="${icon}" class="toast-icon"></i>
    <span class="toast-msg">${message}</span>
  `;
  
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  
  // Animate slide in
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

async function initAdmin() {
  try {
    showLoadingOverlay(true, "Loading database...");
    await initSupabase();
    if (typeof getProducts === "function") adminProducts = await getProducts();
    if (typeof getBlogs === "function") adminBlogs = await getBlogs();

    renderStats();
    renderProductsTable();
    renderBlogsTable();
    setupListeners();

    // Supabase realtime subscriptions for products and banners
    if (supabase) {
      supabase
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
          getProducts().then(p => {
            adminProducts = p;
            renderProductsTable();
            renderStats();
          }).catch(err => console.error('Realtime product update error:', err));
        })
        .subscribe();

      supabase
        .channel('public:banners')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, payload => {
          getBlogs().then(b => {
            adminBlogs = b;
            renderBlogsTable();
            renderStats();
          }).catch(err => console.error('Realtime banner update error:', err));
        })
        .subscribe();
    }
  } catch (err) {
    showToast("Failed to connect to database", "error");
    console.error(err);
  } finally {
    showLoadingOverlay(false);
  }
}

function renderStats() {
  if (statProducts) statProducts.textContent = adminProducts.length;
  if (statBlogs) statBlogs.textContent = adminBlogs.length;
}

function renderProductsTable() {
  if (!productsTbody) return;
  productsTbody.innerHTML = "";

  if (adminProducts.length === 0) {
    productsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No products found. Add one!</td></tr>`;
    return;
  }

  adminProducts.forEach(p => {
    const row = document.createElement("tr");
    const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.price);
    
    row.innerHTML = `
      <td>
        <div class="thumb-cell">
          <img class="thumb-img" src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80'">
          <div>
            <div class="thumb-name">${escapeHTML(p.name)}</div>
            <div class="thumb-id">${escapeHTML(p.id)}</div>
          </div>
        </div>
      </td>
      <td><span class="cat-tag">${escapeHTML(p.category)}</span></td>
      <td><span class="price-gold">${formattedPrice}</span></td>
      <td><span style="color:var(--primary); font-weight:700; font-size:11px;">${escapeHTML(p.badge || '-')}</span></td>
      <td>
        <div class="row-actions">
          <button class="mini-btn edit" onclick="editProduct('${escapeHTML(p.id)}')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="mini-btn del" onclick="deleteProduct('${escapeHTML(p.id)}')" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    productsTbody.appendChild(row);
  });
  if (window.lucide) lucide.createIcons();
}

function renderBlogsTable() {
  if (!blogsTbody) return;
  blogsTbody.innerHTML = "";

  if (adminBlogs.length === 0) {
    blogsTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">No banners found. Add one!</td></tr>`;
    return;
  }

  adminBlogs.forEach(b => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="thumb-cell">
          <img class="thumb-img" src="${escapeHTML(b.image)}" alt="${escapeHTML(b.title)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&q=80'">
          <div>
            <div class="thumb-name">${escapeHTML(b.title)}</div>
            <div class="thumb-id">${escapeHTML(b.author)}</div>
          </div>
        </div>
      </td>
      <td><span style="color:var(--text-secondary); font-size:12px;">${escapeHTML(b.date)}</span></td>
      <td><span style="color:var(--text-secondary); font-size:12px;">${escapeHTML(b.readTime)}</span></td>
      <td>
        <div class="row-actions">
          <button class="mini-btn edit" onclick="editBlog('${escapeHTML(b.id)}')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="mini-btn del" onclick="deleteBlog('${escapeHTML(b.id)}')" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    blogsTbody.appendChild(row);
  });
  if (window.lucide) lucide.createIcons();
}

function setupListeners() {
  if (tabProducts && tabBlogs && tabSettings) {
    tabProducts.addEventListener("click", (e) => { e.preventDefault(); switchTab("products"); });
    tabBlogs.addEventListener("click", (e) => { e.preventDefault(); switchTab("blogs"); });
    tabSettings.addEventListener("click", (e) => { e.preventDefault(); switchTab("settings"); });
  }

  // CMS Sub-Tabs Navigation Inside Customize Site
  document.querySelectorAll(".cms-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cms-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetPanel = btn.dataset.cmsTab;
      document.querySelectorAll(".cms-panel").forEach(panel => {
        panel.style.display = "none";
        panel.classList.remove("active");
      });
      const actPanel = document.getElementById(`cms-panel-${targetPanel}`);
      if (actPanel) {
        actPanel.style.display = "block";
        actPanel.classList.add("active");
      }
    });
  });

  // Color Hex Synchronizers
  const bindColorSync = (pickerId, textId) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    if (picker && text) {
      picker.addEventListener("input", (e) => { text.value = e.target.value; });
      text.addEventListener("input", (e) => { picker.value = e.target.value; });
    }
  };
  bindColorSync("s-theme-primary", "s-theme-primary-hex");
  bindColorSync("s-theme-primary-hover", "s-theme-primary-hover-hex");
  bindColorSync("s-theme-bg-dark", "s-theme-bg-dark-hex");
  bindColorSync("s-theme-bg-surface", "s-theme-bg-surface-hex");
  bindColorSync("s-theme-text-primary", "s-theme-text-primary-hex");
  bindColorSync("s-theme-text-secondary", "s-theme-text-secondary-hex");

  if (productForm) productForm.addEventListener("submit", handleProductSubmit);
  if (blogForm) blogForm.addEventListener("submit", handleBlogSubmit);
  if (settingsForm) settingsForm.addEventListener("submit", handleSettingsSubmit);

  // Testimonials and Brands Submit Actions
  const testimonialForm = document.getElementById("testimonial-form");
  if (testimonialForm) testimonialForm.addEventListener("submit", handleTestimonialSubmit);
  
  const brandForm = document.getElementById("brand-form");
  if (brandForm) brandForm.addEventListener("submit", handleBrandSubmit);

  const testimonialBtn = document.getElementById("add-testimonial-btn");
  if (testimonialBtn) {
    testimonialBtn.addEventListener("click", () => {
      document.getElementById("testimonial-form").reset();
      document.getElementById("f-t-id").value = "";
      document.getElementById("t-form-title").textContent = "Add Testimonial";
      document.getElementById("testimonial-form-modal").style.display = "flex";
    });
  }

  const brandBtn = document.getElementById("add-brand-btn");
  if (brandBtn) {
    brandBtn.addEventListener("click", () => {
      document.getElementById("brand-form").reset();
      document.getElementById("f-b-id").value = "";
      document.getElementById("b-form-title").textContent = "Add Brand Logo";
      document.getElementById("brand-form-modal").style.display = "flex";
    });
  }

  // Media Library Upload Trigger
  const triggerMediaBtn = document.getElementById("trigger-media-upload");
  const mediaInput = document.getElementById("media-upload-input");
  if (triggerMediaBtn && mediaInput) {
    triggerMediaBtn.addEventListener("click", () => mediaInput.click());
    mediaInput.addEventListener("change", handleMediaUpload);
  }

  if (signoutBtn) {
    signoutBtn.addEventListener("click", () => {
      if (confirm("Sign out from Admin Panel?")) {
        sessionStorage.removeItem("dropymart_auth");
        window.location.href = "index.html";
      }
    });
  }

  const fImage = document.getElementById("f-image");
  if (fImage) {
    fImage.addEventListener("change", (e) => handleImageUpload(e, "f-image-preview", "f-image-data"));
  }

  const fbImage = document.getElementById("fb-image");
  if (fbImage) {
    fbImage.addEventListener("change", (e) => handleImageUpload(e, "fb-image-preview", "fb-image-data"));
  }

  const sHeroImage = document.getElementById("s-hero-image");
  if (sHeroImage) {
    sHeroImage.addEventListener("change", (e) => handleImageUpload(e, "s-hero-image-preview", "s-hero-image-data"));
  }

  const sPromoB1Image = document.getElementById("s-promo-b1-image");
  if (sPromoB1Image) {
    sPromoB1Image.addEventListener("change", (e) => handleImageUpload(e, "s-promo-b1-image-preview", "s-promo-b1-image-data"));
  }

  const sPromoB2Image = document.getElementById("s-promo-b2-image");
  if (sPromoB2Image) {
    sPromoB2Image.addEventListener("change", (e) => handleImageUpload(e, "s-promo-b2-image-preview", "s-promo-b2-image-data"));
  }

  const sNewsletterBg = document.getElementById("s-newsletter-bg");
  if (sNewsletterBg) {
    sNewsletterBg.addEventListener("change", (e) => handleImageUpload(e, "s-newsletter-bg-preview", "s-newsletter-bg-data"));
  }

  const fBrandLogoFile = document.getElementById("f-b-logo-file");
  if (fBrandLogoFile) {
    fBrandLogoFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        document.getElementById("f-b-logo").value = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}

function handleImageUpload(e, previewId, dataId) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById(dataId).value = evt.target.result;
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.src = evt.target.result;
      preview.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
}

function switchTab(tab) {
  activeTab = tab;
  tabProducts.classList.remove("active");
  tabBlogs.classList.remove("active");
  tabSettings.classList.remove("active");
  sectionProducts.classList.remove("active");
  sectionBlogs.classList.remove("active");
  sectionSettings.classList.remove("active");

  if (tab === "products") {
    tabProducts.classList.add("active");
    sectionProducts.classList.add("active");
  } else if (tab === "blogs") {
    tabBlogs.classList.add("active");
    sectionBlogs.classList.add("active");
  } else if (tab === "settings") {
    tabSettings.classList.add("active");
    sectionSettings.classList.add("active");
    loadSettingsIntoForm();
  }
}

window.openProductForm = function() {
  editingItemId = null;
  if (prodFormTitle) prodFormTitle.textContent = "Add New Product";
  if (productForm) productForm.reset();
  document.getElementById("f-image-data").value = "";
  const preview = document.getElementById("f-image-preview");
  if (preview) preview.style.display = "none";
  if (productFormModal) {
    productFormModal.style.display = "flex";
    setTimeout(() => productFormModal.classList.add("active"), 10);
  }
};

window.editProduct = function(id) {
  const p = adminProducts.find(x => x.id === id);
  if (!p) return;
  editingItemId = id;
  if (prodFormTitle) prodFormTitle.textContent = "Edit Product";
  
  document.getElementById("f-name").value = p.name;
  document.getElementById("f-cat").value = p.category;
  document.getElementById("f-price").value = p.price;
  document.getElementById("f-badge").value = p.badge || "";
  document.getElementById("f-desc").value = p.description;

  document.getElementById("f-sku").value = p.sku || "";
  document.getElementById("f-inventory").value = p.inventory || 0;
  document.getElementById("f-stock-status").value = p.stock_status || "";
  document.getElementById("f-rating").value = p.rating || 4.5;
  document.getElementById("f-reviews").value = p.reviews || 0;
  document.getElementById("f-gallery").value = p.gallery || "";
  document.getElementById("f-specs").value = p.specs || "";

  document.getElementById("f-image-data").value = p.image || "";
  const preview = document.getElementById("f-image-preview");
  if (preview) {
    if (p.image) {
      preview.src = p.image;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  }

  if (productFormModal) {
    productFormModal.style.display = "flex";
    setTimeout(() => productFormModal.classList.add("active"), 10);
  }
};

async function handleProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("f-name").value.trim();
  const category = document.getElementById("f-cat").value;
  const price = parseFloat(document.getElementById("f-price").value);
  let image = document.getElementById("f-image-data").value.trim();
  const badge = document.getElementById("f-badge").value.trim();
  const description = document.getElementById("f-desc").value.trim();

  const sku = document.getElementById("f-sku").value.trim();
  const inventory = Number(document.getElementById("f-inventory").value) || 0;
  const stock_status = document.getElementById("f-stock-status").value.trim();
  const rating = Number(document.getElementById("f-rating").value) || 4.5;
  const reviews = Number(document.getElementById("f-reviews").value) || 0;
  const gallery = document.getElementById("f-gallery").value.trim();
  const specs = document.getElementById("f-specs").value.trim();

  if (!image) {
    image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80";
  }

  showLoadingOverlay(true, "Saving product...");
  try {
    const updatedProducts = [...adminProducts];
    const payload = { name, category, price, image, badge, description, sku, inventory, stock_status, rating, reviews, gallery, specs };
    if (editingItemId) {
      const idx = updatedProducts.findIndex(p => p.id === editingItemId);
      if (idx > -1) {
        updatedProducts[idx] = { ...updatedProducts[idx], ...payload };
      }
      if (supabase) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingItemId);
        if (error) throw error;
      }
    } else {
      const id = "p_" + Date.now();
      const newProduct = { id, ...payload };
      updatedProducts.push(newProduct);
      if (supabase) {
        const { error } = await supabase.from('products').insert([newProduct]);
        if (error) throw error;
      }
    }
    if (typeof saveProducts === "function") {
      await saveProducts(updatedProducts);
    }
    const b = await getProducts();
    adminProducts = b;
    renderProductsTable();
    renderStats();
    closeForm("product-form-modal");
    showToast(editingItemId ? "Product updated successfully!" : "Product added successfully!", "success");
  } catch (err) {
    showToast("Error saving product: " + err.message, "error");
    console.error(err);
  } finally {
    showLoadingOverlay(false);
  }
}

window.deleteProduct = async function(id) {
  if (confirm("Delete this product?")) {
    showLoadingOverlay(true, "Deleting product...");
    try {
      const updatedProducts = adminProducts.filter(p => p.id !== id);
      if (supabase) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } else if (typeof deleteProductFromStorage === "function") {
        await deleteProductFromStorage(id, updatedProducts);
      } else if (typeof saveProducts === "function") {
        await saveProducts(updatedProducts);
      }
      adminProducts = updatedProducts;
      renderProductsTable();
      renderStats();
      showToast("Product deleted successfully!", "success");
    } catch (err) {
      showToast("Error deleting product: " + err.message, "error");
      console.error(err);
    } finally {
      showLoadingOverlay(false);
    }
  }
};

window.openBlogForm = function() {
  editingItemId = null;
  if (blogFormTitle) blogFormTitle.textContent = "Add Carousel Slide";
  if (blogForm) blogForm.reset();
  document.getElementById("fb-image-data").value = "";
  const preview = document.getElementById("fb-image-preview");
  if (preview) preview.style.display = "none";
  if (blogFormModal) {
    blogFormModal.style.display = "flex";
    setTimeout(() => blogFormModal.classList.add("active"), 10);
  }
};

window.editBlog = function(id) {
  const b = adminBlogs.find(x => x.id === id);
  if (!b) return;
  editingItemId = id;
  if (blogFormTitle) blogFormTitle.textContent = "Edit Slide";
  
  document.getElementById("fb-title").value = b.title;
  document.getElementById("fb-author").value = b.author;
  document.getElementById("fb-time").value = b.readTime;
  document.getElementById("fb-summary").value = b.summary;
  document.getElementById("fb-content").value = b.content || "";

  document.getElementById("fb-image-data").value = b.image || "";
  const preview = document.getElementById("fb-image-preview");
  if (preview) {
    if (b.image) {
      preview.src = b.image;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  }

  if (blogFormModal) {
    blogFormModal.style.display = "flex";
    setTimeout(() => blogFormModal.classList.add("active"), 10);
  }
};

async function handleBlogSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("fb-title").value.trim();
  const author = document.getElementById("fb-author").value.trim();
  const readTime = document.getElementById("fb-time").value.trim() || "4 min read";
  let image = document.getElementById("fb-image-data").value.trim();
  const summary = document.getElementById("fb-summary").value.trim();
  const content = document.getElementById("fb-content").value.trim();

  if (!image) {
    image = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80";
  }

  showLoadingOverlay(true, "Saving banner slide...");
  try {
    if (editingItemId) {
      const idx = adminBlogs.findIndex(x => x.id === editingItemId);
      if (idx > -1) {
        adminBlogs[idx] = { ...adminBlogs[idx], title, author, readTime, image, summary, content };
      }
    } else {
      adminBlogs.push({
        id: "b_" + Date.now(),
        title, author, readTime, image, summary, content,
        date: new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: '2-digit' })
      });
    }

    if (typeof saveBlogs === "function") await saveBlogs(adminBlogs);
    renderBlogsTable();
    renderStats();
    closeForm("blog-form-modal");
    showToast(editingItemId ? "Banner slide updated!" : "Banner slide published!", "success");
  } catch (err) {
    showToast("Error saving banner: " + err.message, "error");
    console.error(err);
  } finally {
    showLoadingOverlay(false);
  }
}

window.deleteBlog = async function(id) {
  if (confirm("Delete this slide?")) {
    showLoadingOverlay(true, "Deleting banner slide...");
    try {
      const updatedBlogs = adminBlogs.filter(b => b.id !== id);
      
      if (typeof deleteBlogFromStorage === "function") {
        await deleteBlogFromStorage(id, updatedBlogs);
      } else if (typeof saveBlogs === "function") {
        await saveBlogs(updatedBlogs);
      }
      
      adminBlogs = updatedBlogs;
      renderBlogsTable();
      renderStats();
      showToast("Banner slide deleted successfully!", "success");
    } catch (err) {
      showToast("Error deleting banner: " + err.message, "error");
      console.error(err);
    } finally {
      showLoadingOverlay(false);
    }
  }
};

window.closeForm = function(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.remove("active");
    setTimeout(() => m.style.display = "none", 300);
  }
};

// ── Customize Site / CMS Forms Logic ──────────────────────────────
async function loadSettingsIntoForm() {
  try {
    showLoadingOverlay(true, "Loading storefront settings...");
    const s = (typeof getSettings === "function" ? await getSettings() : null) || window.DEFAULT_SETTINGS;
    
    if (s) {
      // Theme colors
      document.getElementById("s-theme-primary").value = s.theme_primary || "#fbc02d";
      document.getElementById("s-theme-primary-hex").value = s.theme_primary || "#fbc02d";
      document.getElementById("s-theme-primary-hover").value = s.theme_primary_hover || "#f9a825";
      document.getElementById("s-theme-primary-hover-hex").value = s.theme_primary_hover || "#f9a825";
      document.getElementById("s-theme-bg-dark").value = s.theme_bg_dark || "#f3f5f8";
      document.getElementById("s-theme-bg-dark-hex").value = s.theme_bg_dark || "#f3f5f8";
      document.getElementById("s-theme-bg-surface").value = s.theme_bg_surface || "#ffffff";
      document.getElementById("s-theme-bg-surface-hex").value = s.theme_bg_surface || "#ffffff";
      document.getElementById("s-theme-text-primary").value = s.theme_text_primary || "#1f2937";
      document.getElementById("s-theme-text-primary-hex").value = s.theme_text_primary || "#1f2937";
      document.getElementById("s-theme-text-secondary").value = s.theme_text_secondary || "#4b5563";
      document.getElementById("s-theme-text-secondary-hex").value = s.theme_text_secondary || "#4b5563";
      document.getElementById("s-theme-border-radius").value = s.theme_border_radius || "14px";
      document.getElementById("s-theme-shadows").value = s.theme_shadows || "";

      // SEO
      document.getElementById("s-seo-home-title").value = s.seo_home_title || "";
      document.getElementById("s-seo-home-desc").value = s.seo_home_desc || "";
      document.getElementById("s-seo-home-canonical").value = s.seo_home_canonical || "";
      document.getElementById("s-seo-home-og-image").value = s.seo_home_og_image || "";

      // Hero
      document.getElementById("s-hero-badge").value = s.hero_badge || "";
      document.getElementById("s-hero-title").value = s.hero_title || "";
      document.getElementById("s-hero-subtitle").value = s.hero_subtitle || "";
      document.getElementById("s-hero-image-data").value = s.hero_image || "";
      const hPreview = document.getElementById("s-hero-image-preview");
      if (hPreview && s.hero_image) {
        hPreview.src = s.hero_image;
        hPreview.style.display = "block";
      }

      // Deals Countdown & Promos
      document.getElementById("s-timer-title").value = s.timer_title || "";
      document.getElementById("s-timer-hours").value = s.timer_hours || 12;
      document.getElementById("s-timer-subtitle").value = s.timer_subtitle || "";

      document.getElementById("s-promo-b1-title").value = s.promo_b1_title || "";
      document.getElementById("s-promo-b1-subtitle").value = s.promo_b1_subtitle || "";
      document.getElementById("s-promo-b1-cat").value = s.promo_b1_cat || "watch";
      document.getElementById("s-promo-b1-image-data").value = s.promo_b1_image || "";
      const b1Preview = document.getElementById("s-promo-b1-image-preview");
      if (b1Preview && s.promo_b1_image) {
        b1Preview.src = s.promo_b1_image;
        b1Preview.style.display = "block";
      }

      document.getElementById("s-promo-b2-title").value = s.promo_b2_title || "";
      document.getElementById("s-promo-b2-subtitle").value = s.promo_b2_subtitle || "";
      document.getElementById("s-promo-b2-cat").value = s.promo_b2_cat || "shoe";
      document.getElementById("s-promo-b2-image-data").value = s.promo_b2_image || "";
      const b2Preview = document.getElementById("s-promo-b2-image-preview");
      if (b2Preview && s.promo_b2_image) {
        b2Preview.src = s.promo_b2_image;
        b2Preview.style.display = "block";
      }

      // Newsletter
      document.getElementById("s-newsletter-heading").value = s.newsletter_heading || "";
      document.getElementById("s-newsletter-desc").value = s.newsletter_desc || "";
      document.getElementById("s-newsletter-success-msg").value = s.newsletter_success_msg || "";
      document.getElementById("s-newsletter-bg-data").value = s.newsletter_bg || "";
      const nBgPreview = document.getElementById("s-newsletter-bg-preview");
      if (nBgPreview && s.newsletter_bg) {
        nBgPreview.src = s.newsletter_bg;
        nBgPreview.style.display = "block";
      }

      // Footer
      document.getElementById("s-footer-logo-text").value = s.footer_logo_text || "";
      document.getElementById("s-footer-about-content").value = s.footer_about_content || "";
      document.getElementById("s-footer-social-facebook").value = s.footer_social_facebook || "";
      document.getElementById("s-footer-social-instagram").value = s.footer_social_instagram || "";
      document.getElementById("s-footer-social-twitter").value = s.footer_social_twitter || "";
      document.getElementById("s-footer-social-youtube").value = s.footer_social_youtube || "";
      document.getElementById("s-footer-contact-phone").value = s.footer_contact_phone || "";
      document.getElementById("s-footer-contact-email").value = s.footer_contact_email || "";
      document.getElementById("s-footer-contact-address").value = s.footer_contact_address || "";

      // Hydrate CMS sub sections
      renderCmsSectionsOrder();
      renderTestimonialsCMS();
      renderBrandsCMS();
      renderMediaLibraryGrid();
    }
  } catch (err) {
    showToast("Error loading settings: " + err.message, "error");
    console.error(err);
  } finally {
    showLoadingOverlay(false);
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  showLoadingOverlay(true, "Saving storefront settings...");
  try {
    const updatedSettings = {
      theme_primary: document.getElementById("s-theme-primary-hex").value.trim(),
      theme_primary_hover: document.getElementById("s-theme-primary-hover-hex").value.trim(),
      theme_bg_dark: document.getElementById("s-theme-bg-dark-hex").value.trim(),
      theme_bg_surface: document.getElementById("s-theme-bg-surface-hex").value.trim(),
      theme_text_primary: document.getElementById("s-theme-text-primary-hex").value.trim(),
      theme_text_secondary: document.getElementById("s-theme-text-secondary-hex").value.trim(),
      theme_border_radius: document.getElementById("s-theme-border-radius").value.trim(),
      theme_shadows: document.getElementById("s-theme-shadows").value.trim(),

      seo_home_title: document.getElementById("s-seo-home-title").value.trim(),
      seo_home_desc: document.getElementById("s-seo-home-desc").value.trim(),
      seo_home_canonical: document.getElementById("s-seo-home-canonical").value.trim(),
      seo_home_og_image: document.getElementById("s-seo-home-og-image").value.trim(),

      hero_badge: document.getElementById("s-hero-badge").value.trim(),
      hero_title: document.getElementById("s-hero-title").value.trim(),
      hero_subtitle: document.getElementById("s-hero-subtitle").value.trim(),
      hero_image: document.getElementById("s-hero-image-data").value.trim(),

      timer_title: document.getElementById("s-timer-title").value.trim(),
      timer_hours: Number(document.getElementById("s-timer-hours").value) || 12,
      timer_subtitle: document.getElementById("s-timer-subtitle").value.trim(),

      promo_b1_title: document.getElementById("s-promo-b1-title").value.trim(),
      promo_b1_subtitle: document.getElementById("s-promo-b1-subtitle").value.trim(),
      promo_b1_cat: document.getElementById("s-promo-b1-cat").value,
      promo_b1_image: document.getElementById("s-promo-b1-image-data").value.trim(),

      promo_b2_title: document.getElementById("s-promo-b2-title").value.trim(),
      promo_b2_subtitle: document.getElementById("s-promo-b2-subtitle").value.trim(),
      promo_b2_cat: document.getElementById("s-promo-b2-cat").value,
      promo_b2_image: document.getElementById("s-promo-b2-image-data").value.trim(),

      newsletter_heading: document.getElementById("s-newsletter-heading").value.trim(),
      newsletter_desc: document.getElementById("s-newsletter-desc").value.trim(),
      newsletter_success_msg: document.getElementById("s-newsletter-success-msg").value.trim(),
      newsletter_bg: document.getElementById("s-newsletter-bg-data").value.trim(),

      footer_logo_text: document.getElementById("s-footer-logo-text").value.trim(),
      footer_about_content: document.getElementById("s-footer-about-content").value.trim(),
      footer_social_facebook: document.getElementById("s-footer-social-facebook").value.trim(),
      footer_social_instagram: document.getElementById("s-footer-social-instagram").value.trim(),
      footer_social_twitter: document.getElementById("s-footer-social-twitter").value.trim(),
      footer_social_youtube: document.getElementById("s-footer-social-youtube").value.trim(),
      footer_contact_phone: document.getElementById("s-footer-contact-phone").value.trim(),
      footer_contact_email: document.getElementById("s-footer-contact-email").value.trim(),
      footer_contact_address: document.getElementById("s-footer-contact-address").value.trim()
    };

    if (typeof saveSettings === "function") {
      await saveSettings(updatedSettings);
    }
    
    localStorage.removeItem('dropymart_countdown_target');
    showToast("Storefront & Theme CMS settings saved successfully!", "success");
  } catch (err) {
    showToast("Error saving settings: " + err.message, "error");
    console.error(err);
  } finally {
    showLoadingOverlay(false);
  }
}

// ── CMS Homepage Sections Builder ────────────────────────────────
async function renderCmsSectionsOrder() {
  const container = document.getElementById("homepage-sections-sorting-list");
  if (!container) return;
  const sections = await getHomepageSections();
  container.innerHTML = "";

  sections.forEach((sec, idx) => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:6px;";
    
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="checkbox" id="chk-sec-${sec.id}" ${sec.enabled ? 'checked' : ''} style="width:16px; height:16px;">
        <label for="chk-sec-${sec.id}" style="font-weight:600; font-size:13px; cursor:pointer;">${sec.name}</label>
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" class="mini-btn" onclick="moveCmsSection('${sec.id}', -1)" ${idx === 0 ? 'disabled' : ''} style="padding:4px;"><i data-lucide="arrow-up" style="width:14px; height:14px;"></i></button>
        <button type="button" class="mini-btn" onclick="moveCmsSection('${sec.id}', 1)" ${idx === sections.length - 1 ? 'disabled' : ''} style="padding:4px;"><i data-lucide="arrow-down" style="width:14px; height:14px;"></i></button>
      </div>
    `;
    container.appendChild(item);

    const chk = item.querySelector(`#chk-sec-${sec.id}`);
    chk.addEventListener("change", (e) => {
      sec.enabled = e.target.checked;
      saveHomepageSections(sections);
      showToast(`${sec.name} ${sec.enabled ? 'enabled' : 'disabled'}!`, "success");
    });
  });

  if (window.lucide) lucide.createIcons();
}

window.moveCmsSection = async function(id, dir) {
  const sections = await getHomepageSections();
  const idx = sections.findIndex(s => s.id === id);
  if (idx === -1) return;
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= sections.length) return;

  const temp = sections[idx];
  sections[idx] = sections[targetIdx];
  sections[targetIdx] = temp;

  await saveHomepageSections(sections);
  renderCmsSectionsOrder();
};

// ── CMS Testimonials CMS ─────────────────────────────────────────
async function renderTestimonialsCMS() {
  const container = document.getElementById("testimonials-cms-list");
  if (!container) return;
  const list = await getTestimonials();
  container.innerHTML = "";

  list.forEach(t => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px; background:rgba(0,0,0,0.2); border:1px solid var(--border-glass); border-radius:8px;";
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${escapeHTML(t.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80')}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80';" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
        <div>
          <div style="font-weight:600; font-size:13px; color:var(--text-primary);">${escapeHTML(t.name)}</div>
          <div style="font-size:11px; color:var(--text-muted); max-width: 250px; white-space: nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(t.review)}</div>
        </div>
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" class="mini-btn edit" onclick="editTestimonial('${escapeHTML(t.id)}')" style="padding:4px;"><i data-lucide="edit" style="width:14px; height:14px;"></i></button>
        <button type="button" class="mini-btn del" onclick="deleteTestimonial('${escapeHTML(t.id)}')" style="padding:4px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
      </div>
    `;
    container.appendChild(item);
  });
  if (window.lucide) lucide.createIcons();
}

window.editTestimonial = async function(id) {
  const list = await getTestimonials();
  const t = list.find(x => x.id === id);
  if (!t) return;
  document.getElementById("f-t-id").value = t.id;
  document.getElementById("f-t-name").value = t.name;
  document.getElementById("f-t-photo").value = t.photo || "";
  document.getElementById("f-t-rating").value = t.rating || 5;
  document.getElementById("f-t-review").value = t.review;
  document.getElementById("t-form-title").textContent = "Edit Testimonial";
  document.getElementById("testimonial-form-modal").style.display = "flex";
};

async function handleTestimonialSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("f-t-id").value;
  const name = document.getElementById("f-t-name").value.trim();
  const photo = document.getElementById("f-t-photo").value.trim();
  const rating = Number(document.getElementById("f-t-rating").value) || 5;
  const review = document.getElementById("f-t-review").value.trim();

  const list = await getTestimonials();
  if (id) {
    const idx = list.findIndex(x => x.id === id);
    if (idx > -1) list[idx] = { id, name, photo, rating, review };
  } else {
    list.push({ id: "t_" + Date.now(), name, photo, rating, review });
  }

  await saveTestimonials(list);
  closeForm("testimonial-form-modal");
  renderTestimonialsCMS();
  showToast("Testimonial saved!", "success");
}

window.deleteTestimonial = async function(id) {
  if (confirm("Delete this review?")) {
    const list = await getTestimonials();
    const updated = list.filter(x => x.id !== id);
    await saveTestimonials(updated);
    renderTestimonialsCMS();
    showToast("Testimonial removed!", "success");
  }
};

// ── CMS Brand Logos CMS ──────────────────────────────────────────
async function renderBrandsCMS() {
  const container = document.getElementById("brands-cms-list");
  if (!container) return;
  const list = await getBrands();
  container.innerHTML = "";

  list.forEach(b => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px; background:rgba(0,0,0,0.2); border:1px solid var(--border-glass); border-radius:8px;";
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        ${b.logo ? `<img src="${escapeHTML(b.logo)}" onerror="this.onerror=null;this.style.display='none';" style="max-height:24px; max-width:60px; object-fit:contain;">` : `<div style="font-weight:700; font-size:11px;">[TXT]</div>`}
        <div>
          <div style="font-weight:600; font-size:13px;">${escapeHTML(b.name)}</div>
          <div style="font-size:10px; color:var(--text-muted);">${escapeHTML(b.link || '#')}</div>
        </div>
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" class="mini-btn edit" onclick="editBrand('${escapeHTML(b.id)}')" style="padding:4px;"><i data-lucide="edit" style="width:14px; height:14px;"></i></button>
        <button type="button" class="mini-btn del" onclick="deleteBrand('${escapeHTML(b.id)}')" style="padding:4px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
      </div>
    `;
    container.appendChild(item);
  });
  if (window.lucide) lucide.createIcons();
}

window.editBrand = async function(id) {
  const list = await getBrands();
  const b = list.find(x => x.id === id);
  if (!b) return;
  document.getElementById("f-b-id").value = b.id;
  document.getElementById("f-b-name").value = b.name;
  document.getElementById("f-b-logo").value = b.logo || "";
  document.getElementById("f-b-link").value = b.link || "#explore";
  document.getElementById("b-form-title").textContent = "Edit Brand Logo";
  document.getElementById("brand-form-modal").style.display = "flex";
};

async function handleBrandSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("f-b-id").value;
  const name = document.getElementById("f-b-name").value.trim();
  const logo = document.getElementById("f-b-logo").value.trim();
  const link = document.getElementById("f-b-link").value.trim();

  const list = await getBrands();
  if (id) {
    const idx = list.findIndex(x => x.id === id);
    if (idx > -1) list[idx] = { id, name, logo, link };
  } else {
    list.push({ id: "br_" + Date.now(), name, logo, link });
  }

  await saveBrands(list);
  closeForm("brand-form-modal");
  renderBrandsCMS();
  showToast("Brand saved!", "success");
}

window.deleteBrand = async function(id) {
  if (confirm("Delete this brand logo?")) {
    const list = await getBrands();
    const updated = list.filter(x => x.id !== id);
    await saveBrands(updated);
    renderBrandsCMS();
    showToast("Brand removed!", "success");
  }
};

// ── WordPress Media Library Grid ─────────────────────────────────
async function renderMediaLibraryGrid() {
  const container = document.getElementById("media-library-grid");
  if (!container) return;
  const items = await getMediaItems();
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.style.cssText = "position:relative; border-radius:6px; border:1px solid var(--border-glass); background:rgba(0,0,0,0.3); overflow:hidden; aspect-ratio: 1; display:flex; align-items:center; justify-content:center; cursor:pointer;";
    
    card.innerHTML = `
      <img src="${escapeHTML(item.url)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';" style="width:100%; height:100%; object-fit:cover;">
      <div style="position:absolute; top:2px; right:2px; display:flex; gap:2px;">
        <button type="button" class="mini-btn del" onclick="event.stopPropagation(); deleteMedia('${escapeHTML(item.id)}')" style="padding:2px; background:rgba(220,38,38,0.85);"><i data-lucide="x" style="width:10px; height:10px; color:#fff;"></i></button>
      </div>
    `;
    container.appendChild(card);

    card.addEventListener("click", () => {
      navigator.clipboard.writeText(item.url).then(() => {
        showToast("Image source URL copied to clipboard!", "success");
      });
    });
  });

  if (window.lucide) lucide.createIcons();
}

async function handleMediaUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  showLoadingOverlay(true, "Uploading image to media library...");
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const items = await getMediaItems();
      const id = "m_" + Date.now();
      const name = file.name;
      const url = evt.target.result;
      const size = (file.size / 1024).toFixed(1) + " KB";
      const type = file.type;

      items.unshift({ id, name, url, size, type });
      await saveMediaItems(items);
      renderMediaLibraryGrid();
      showToast("Uploaded successfully! Click item to copy URL source path.", "success");
    } catch(err) {
      showToast("Media upload error: " + err.message, "error");
    } finally {
      showLoadingOverlay(false);
    }
  };
  reader.readAsDataURL(file);
}

window.deleteMedia = async function(id) {
  if (confirm("Delete this file from library?")) {
    const items = await getMediaItems();
    const updated = items.filter(x => x.id !== id);
    await saveMediaItems(updated);
    renderMediaLibraryGrid();
    showToast("File removed from media library.", "success");
  }
};

document.addEventListener("DOMContentLoaded", initAdmin);
