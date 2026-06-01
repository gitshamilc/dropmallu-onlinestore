// DROPMALLU Admin Dashboard Javascript Logic

let adminProducts = [];
let adminBlogs = [];
let editingItemId = null;
let activeTab = "products";

// DOM Elements
const productsTbody = document.getElementById("products-tbody");
const blogsTbody = document.getElementById("blogs-tbody");
const statProducts = document.getElementById("stat-products");
const statBlogs = document.getElementById("stat-blogs");

// Sidebar & Tabs
const tabProducts = document.getElementById("tab-products");
const tabBlogs = document.getElementById("tab-blogs");
const sectionProducts = document.getElementById("section-products");
const sectionBlogs = document.getElementById("section-blogs");

// Forms & Modals
const productFormModal = document.getElementById("product-form-modal");
const blogFormModal = document.getElementById("blog-form-modal");
const productForm = document.getElementById("product-form");
const blogForm = document.getElementById("blog-form");
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
  showLoadingOverlay(true, "Loading database...");
  try {
    if (typeof getProducts === "function") adminProducts = await getProducts();
    if (typeof getBlogs === "function") adminBlogs = await getBlogs();

    renderStats();
    renderProductsTable();
    renderBlogsTable();
    setupListeners();
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
          <img class="thumb-img" src="${p.image}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80'">
          <div>
            <div class="thumb-name">${p.name}</div>
            <div class="thumb-id">${p.id}</div>
          </div>
        </div>
      </td>
      <td><span class="cat-tag">${p.category}</span></td>
      <td><span class="price-gold">${formattedPrice}</span></td>
      <td><span style="color:var(--primary); font-weight:700; font-size:11px;">${p.badge || '-'}</span></td>
      <td>
        <div class="row-actions">
          <button class="mini-btn edit" onclick="editProduct('${p.id}')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="mini-btn del" onclick="deleteProduct('${p.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
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
          <img class="thumb-img" src="${b.image}" alt="${b.title}" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&q=80'">
          <div>
            <div class="thumb-name">${b.title}</div>
            <div class="thumb-id">${b.author}</div>
          </div>
        </div>
      </td>
      <td><span style="color:var(--text-secondary); font-size:12px;">${b.date}</span></td>
      <td><span style="color:var(--text-secondary); font-size:12px;">${b.readTime}</span></td>
      <td>
        <div class="row-actions">
          <button class="mini-btn edit" onclick="editBlog('${b.id}')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="mini-btn del" onclick="deleteBlog('${b.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    blogsTbody.appendChild(row);
  });
  if (window.lucide) lucide.createIcons();
}

function setupListeners() {
  if (tabProducts && tabBlogs) {
    tabProducts.addEventListener("click", (e) => { e.preventDefault(); switchTab("products"); });
    tabBlogs.addEventListener("click", (e) => { e.preventDefault(); switchTab("blogs"); });
  }

  if (productForm) productForm.addEventListener("submit", handleProductSubmit);
  if (blogForm) blogForm.addEventListener("submit", handleBlogSubmit);

  if (signoutBtn) {
    signoutBtn.addEventListener("click", () => {
      if (confirm("Sign out from Admin Panel?")) {
        sessionStorage.removeItem("dropmallu_auth");
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
  if (tab === "products") {
    tabProducts.classList.add("active");
    tabBlogs.classList.remove("active");
    sectionProducts.classList.add("active");
    sectionBlogs.classList.remove("active");
  } else {
    tabProducts.classList.remove("active");
    tabBlogs.classList.add("active");
    sectionProducts.classList.remove("active");
    sectionBlogs.classList.add("active");
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

  if (!image) {
    image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80";
  }

  showLoadingOverlay(true, "Saving product...");
  try {
    if (editingItemId) {
      const idx = adminProducts.findIndex(x => x.id === editingItemId);
      if (idx > -1) {
        adminProducts[idx] = { ...adminProducts[idx], name, category, price, image, badge, description };
      }
    } else {
      adminProducts.push({
        id: "p_" + Date.now(),
        name, category, price, image, badge, description, rating: 4.5, reviews: 0
      });
    }

    if (typeof saveProducts === "function") await saveProducts(adminProducts);
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
      
      if (typeof deleteProductFromStorage === "function") {
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

document.addEventListener("DOMContentLoaded", initAdmin);
