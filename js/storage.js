// DROPMALLU Store Storage Manager

const CONFIG = window.CONFIG;

const DEFAULT_PRODUCTS = [
  {
    id: "p_1780592772172",
    name: "watch test 20",
    category: "watch",
    price: 100,
    description: "test description",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80",
    badge: "Trending",
    rating: 4.5,
    reviews: 0,
    inventory: 0,
    stock_status: "",
    gallery: "",
    specs: ""
  }
];

const DEFAULT_BLOGS = [
  {
    id: "b1",
    title: "Why 4K Laser Projectors are Replacing Traditional TVs",
    author: "Rahul Sharma",
    date: "June 01, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
    summary: "Discover how portable high-resolution laser projectors are reshaping dynamic home theaters, offering screens of up to 150 inches that fit in small drawers.",
    content: "The landscape of home entertainment is shifting rapidly. For decades, the standard television was the centerpiece of the living room, growing larger and heavier year by year. However, standard panels hit a physical and aesthetic limit. This is where advanced 4K laser projectors step in. Offering display areas up to 150 inches while maintaining zero footprint when powered off, they represent the next standard. With ultra-short-throw technology, these compact devices sit just inches from your wall, delivering extremely sharp contrast and vibrant colors that rival premium OLED systems."
  },
  {
    // A powerbank blog
    id: "b2",
    title: "Understanding Power Delivery (PD) in Fast-Charging Powerbanks",
    author: "Anita Raj",
    date: "May 25, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1600541519463-ee100e3ad498?auto=format&fit=crop&w=600&q=80",
    summary: "Not all chargers are built equal. We simplify Power Delivery (PD) protocols and explain how fast external batteries keep modern laptops and phones safe.",
    content: "We live in a multi-device world. Carrying custom power adapters for laptops, tablets, and phones is a relic of the past. Modern fast-charging banks use 'Power Delivery' (PD), a smart protocol communicating between chargers and products to negotiate safe, optimized wattage levels. A premium powerbank like the VoltCore Pro can supply up to 100W of electricity via USB-C, meaning it can recharge your Apple Macbook or dynamic laptop at full speed while running smart safety mechanisms to prevent overheating."
  },
  {
    // A shoe/style blog
    id: "b3",
    title: "The Dynamic Tech Inside Your Daily Sneakers",
    author: "Midhun C.",
    date: "May 18, 2026",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=600&q=80",
    summary: "Streetwear meets aerospace engineering. We dive into carbon fiber shanks, nitrogen infusions, and why modern shoe design is a high-tech discipline.",
    content: "Sneaker design has transformed from basic aesthetic sketches to pure science. Today's premium footwear utilizes concepts borrowed directly from athletic track records and industrial aerospace frameworks. Dynamic carbon fiber plates inserted inside rubber midsoles act as springs, conserving kinetic energy with every step. Additionally, nitrogen-infusion processes expand foam material, creating ultra-light cushions that absorb impacts better and stay flexible for years."
  }
];

// Check if Supabase is configured
const isSupabaseConfigured = typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY;

// Base headers for Supabase
const getSupabaseHeaders = () => ({
  'apikey': CONFIG.SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
});

// Initialize LocalStorage Data
function initializeStorage() {
  let needProductsReset = false;
  try {
    const local = localStorage.getItem("dropmallu_products");
    if (!local) {
      needProductsReset = true;
    } else {
      const currentProducts = JSON.parse(local);
      const containsOldDefaults = currentProducts.some(p => p && p.id === 'p1');
      if (!Array.isArray(currentProducts) || currentProducts.length === 0 || containsOldDefaults) {
        needProductsReset = true;
      }
    }
  } catch (e) {
    needProductsReset = true;
  }

  if (needProductsReset) {
    try {
      localStorage.setItem("dropmallu_products", JSON.stringify(DEFAULT_PRODUCTS));
      console.log("DROPMALLU: Initialized products catalog in localStorage.");
    } catch (e) {
      console.warn("LocalStorage write error for products:", e);
    }
  }

  let needBlogsReset = false;
  try {
    const local = localStorage.getItem("dropmallu_blogs");
    if (!local) {
      needBlogsReset = true;
    } else {
      const currentBlogs = JSON.parse(local);
      if (!Array.isArray(currentBlogs) || currentBlogs.length === 0) {
        needBlogsReset = true;
      }
    }
  } catch (e) {
    needBlogsReset = true;
  }

  if (needBlogsReset) {
    try {
      localStorage.setItem("dropmallu_blogs", JSON.stringify(DEFAULT_BLOGS));
      console.log("DROPMALLU: Initialized banners catalog in localStorage.");
    } catch (e) {
      console.warn("LocalStorage write error for blogs:", e);
    }
  }
}

// Product Storage Accessors
async function getProducts() {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products?select=*`, {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch products from database");
      const data = await res.json();
      // If database is empty, seed it with defaults and cache defaults
      if (data.length === 0) {
        await saveProducts(DEFAULT_PRODUCTS);
        try {
          localStorage.setItem('dropmallu_products', JSON.stringify(DEFAULT_PRODUCTS));
        } catch (e) {}
        return DEFAULT_PRODUCTS;
      }
      try {
        localStorage.setItem('dropmallu_products', JSON.stringify(data));
      } catch (e) {}
      return data;
    } catch (err) {
      console.error("Database error, falling back to LocalStorage:", err);
    }
  }
  
  initializeStorage();
  try {
    const local = localStorage.getItem("dropmallu_products");
    return (local ? JSON.parse(local) : DEFAULT_PRODUCTS) || DEFAULT_PRODUCTS;
  } catch (err) {
    console.error("LocalStorage load error, returning default constants:", err);
    return DEFAULT_PRODUCTS;
  }
}

async function saveProducts(products) {
  if (isSupabaseConfigured) {
    try {
      const sanitized = products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        description: p.description,
        image: p.image,
        badge: p.badge || '',
        rating: Number(p.rating || 4.5),
        reviews: Number(p.reviews || 0)
      }));

      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: {
          ...getSupabaseHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(sanitized)
      });
      if (!res.ok) throw new Error("Failed to save products to database");
      return;
    } catch (err) {
      console.error("Database save error:", err);
      throw err;
    }
  }

  try {
    localStorage.setItem("dropmallu_products", JSON.stringify(products));
  } catch (err) {
    console.error("LocalStorage save error:", err);
  }
}

async function deleteProductFromStorage(id, updatedProducts) {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete product from database");
      return;
    } catch (err) {
      console.error("Database delete error:", err);
      throw err;
    }
  }
  try {
    localStorage.setItem("dropmallu_products", JSON.stringify(updatedProducts));
  } catch (err) {
    console.error("LocalStorage delete update error:", err);
  }
}

// Blog Storage Accessors
async function getBlogs() {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/banners?select=*`, {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch banners from database");
      const data = await res.json();
      if (data.length === 0) {
        await saveBlogs(DEFAULT_BLOGS);
        return DEFAULT_BLOGS;
      }
      return data;
    } catch (err) {
      console.error("Database error, falling back to LocalStorage:", err);
    }
  }

  initializeStorage();
  try {
    const local = localStorage.getItem("dropmallu_blogs");
    return (local ? JSON.parse(local) : DEFAULT_BLOGS) || DEFAULT_BLOGS;
  } catch (err) {
    console.error("LocalStorage load error for blogs, returning defaults:", err);
    return DEFAULT_BLOGS;
  }
}

async function saveBlogs(blogs) {
  if (isSupabaseConfigured) {
    try {
      const sanitized = blogs.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        date: b.date,
        readTime: b.readTime,
        image: b.image,
        summary: b.summary,
        content: b.content || ''
      }));

      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/banners`, {
        method: 'POST',
        headers: {
          ...getSupabaseHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(sanitized)
      });
      if (!res.ok) throw new Error("Failed to save banners to database");
      return;
    } catch (err) {
      console.error("Database save error:", err);
      throw err;
    }
  }

  try {
    localStorage.setItem("dropmallu_blogs", JSON.stringify(blogs));
  } catch (err) {
    console.error("LocalStorage save error for blogs:", err);
  }
}

async function deleteBlogFromStorage(id, updatedBlogs) {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/banners?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete banner from database");
      return;
    } catch (err) {
      console.error("Database delete error:", err);
      throw err;
    }
  }
  try {
    localStorage.setItem("dropmallu_blogs", JSON.stringify(updatedBlogs));
  } catch (err) {
    console.error("LocalStorage delete update error for blogs:", err);
  }
}

const DEFAULT_SETTINGS = {
  theme_primary: "#fbc02d",
  theme_primary_hover: "#f9a825",
  theme_bg_dark: "#f3f5f8",
  theme_bg_surface: "#ffffff",
  theme_text_primary: "#1f2937",
  theme_text_secondary: "#4b5563",
  theme_border_radius: "14px",
  theme_shadows: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",

  hero_badge: "Premium Collection",
  hero_title: "Shop Trending <br><span>Products Online</span>",
  hero_subtitle: "Discover the best trending products, luxury watches, tech gadgets, and lifestyle essentials online.",
  hero_image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
  hero_image_tablet: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80",
  hero_image_mobile: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
  hero_auto_slide: true,
  hero_transition_speed: 5500,
  
  timer_hours: 12,
  timer_title: "⚡ Deal of the Day",
  timer_subtitle: "Limited time offer, don't miss out!",

  promo_b1_title: "Smart Watches",
  promo_b1_subtitle: "Starting at ₹100",
  promo_b1_cat: "watch",
  promo_b1_image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=300&q=80",

  promo_b2_title: "Best Selling Shoes",
  promo_b2_subtitle: "Up to 50% Off",
  promo_b2_cat: "shoe",
  promo_b2_image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80",

  newsletter_heading: "Join the DROPMALLU Club",
  newsletter_desc: "Subscribe to receive dynamic updates on exclusive tech arrivals and discount drops.",
  newsletter_bg: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80",
  newsletter_success_msg: "Thank you for subscribing! Check WhatsApp for welcome offers.",
  newsletter_provider: "mailchimp",

  footer_logo_text: "DROPMALLU",
  footer_about_content: "Curated premium lifestyle boutique offering direct-to-consumer tech accessories, custom project displays, and smart gadgets.",
  footer_social_facebook: "https://facebook.com",
  footer_social_instagram: "https://www.instagram.com/dropmallu?igsh=N204dTdiMjFlMHds&utm_source=qr",
  footer_social_twitter: "https://twitter.com",
  footer_social_youtube: "https://youtube.com",
  footer_contact_phone: "+91 98951 77154",
  footer_contact_email: "support@dropmallu.xyz",
  footer_contact_address: "Kochi, Kerala, India",

  seo_home_title: "DropMallu – Discover Trending Products, Gadgets & Everyday Essentials",
  seo_home_desc: "Shop the latest trending products, smart gadgets, home essentials, lifestyle accessories, and viral finds at DropMallu. Enjoy secure payments, fast delivery, and unbeatable value on every order.",
  seo_home_og_image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  seo_home_canonical: "https://dropmallu.xyz"
};

const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: "hero", name: "Hero Showcase Area", enabled: true },
  { id: "categories", name: "Circular Quick Categories", enabled: true },
  { id: "promo_banners", name: "Promotional Banner Cards", enabled: true },
  { id: "deals", name: "Deal of the Day Timer", enabled: true },
  { id: "products", name: "Products Catalog Explorer", enabled: true },
  { id: "brands", name: "Brands Logo Strip", enabled: true },
  { id: "testimonials", name: "Customer Testimonials Slider", enabled: true },
  { id: "newsletter", name: "Newsletter Signup Card", enabled: true }
];

const DEFAULT_TESTIMONIALS = [
  { id: "t1", name: "Rahul S. Nair", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", rating: 5, review: "Excellent product quality. The AeroChron watch looks and feels exceptionally premium!" },
  { id: "t2", name: "Anjali Krishna", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80", rating: 5, review: "Ordered VoltCore powerbank and got fast delivery in Kochi. Highly recommended." }
];

const DEFAULT_BRANDS = [
  { id: "br1", name: "Noise", logo: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=80&q=80", link: "#explore" },
  { id: "br2", name: "boAt", logo: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=80&q=80", link: "#explore" },
  { id: "br3", name: "Puma", logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&q=80", link: "#explore" }
];

const DEFAULT_FLASH_SALES = {
  enabled: false,
  name: "Midnight Flash Madness",
  banner: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80",
  start_time: "",
  end_time: "",
  discount_percent: 15,
  products: []
};

const DEFAULT_MEDIA = [
  { id: "m1", name: "Default Watch Showcase", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", size: "45 KB", type: "image/jpeg" },
  { id: "m2", name: "Stealth Smartwatch Banner", url: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80", size: "38 KB", type: "image/jpeg" }
];

async function getSettings() {
  try {
    const local = localStorage.getItem("dropmallu_settings");
    if (local) {
      const parsed = JSON.parse(local);
      // Auto-migration for new SEO defaults
      if (parsed.seo_home_title === "DROPMALLU — Premium Boutique Storefront" || parsed.seo_home_title === "DROPMALLU — Shop Trending Products Online" || !parsed.seo_home_title) {
        parsed.seo_home_title = "DropMallu – Discover Trending Products, Gadgets & Everyday Essentials";
        parsed.seo_home_desc = "Shop the latest trending products, smart gadgets, home essentials, lifestyle accessories, and viral finds at DropMallu. Enjoy secure payments, fast delivery, and unbeatable value on every order.";
        parsed.hero_title = "Shop Trending <br><span>Products Online</span>";
        parsed.hero_subtitle = "Discover the best trending products, luxury watches, tech gadgets, and lifestyle essentials online.";
        localStorage.setItem("dropmallu_settings", JSON.stringify(parsed));
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {}
  
  try {
    localStorage.setItem("dropmallu_settings", JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

async function saveSettings(settings) {
  try {
    localStorage.setItem("dropmallu_settings", JSON.stringify(settings));
  } catch (err) {
    console.error("LocalStorage settings save error:", err);
  }
}

async function getHomepageSections() {
  try {
    const local = localStorage.getItem("dropmallu_sections");
    return local ? JSON.parse(local) : DEFAULT_HOMEPAGE_SECTIONS;
  } catch (e) {
    return DEFAULT_HOMEPAGE_SECTIONS;
  }
}

async function saveHomepageSections(sections) {
  try {
    localStorage.setItem("dropmallu_sections", JSON.stringify(sections));
  } catch (e) {}
}

async function getTestimonials() {
  try {
    const local = localStorage.getItem("dropmallu_testimonials");
    return local ? JSON.parse(local) : DEFAULT_TESTIMONIALS;
  } catch (e) {
    return DEFAULT_TESTIMONIALS;
  }
}

async function saveTestimonials(t) {
  try {
    localStorage.setItem("dropmallu_testimonials", JSON.stringify(t));
  } catch (e) {}
}

async function getBrands() {
  try {
    const local = localStorage.getItem("dropmallu_brands");
    return local ? JSON.parse(local) : DEFAULT_BRANDS;
  } catch (e) {
    return DEFAULT_BRANDS;
  }
}

async function saveBrands(b) {
  try {
    localStorage.setItem("dropmallu_brands", JSON.stringify(b));
  } catch (e) {}
}

async function getFlashSales() {
  try {
    const local = localStorage.getItem("dropmallu_flash");
    return local ? JSON.parse(local) : DEFAULT_FLASH_SALES;
  } catch (e) {
    return DEFAULT_FLASH_SALES;
  }
}

async function saveFlashSales(f) {
  try {
    localStorage.setItem("dropmallu_flash", JSON.stringify(f));
  } catch (e) {}
}

async function getMediaItems() {
  try {
    const local = localStorage.getItem("dropmallu_media");
    return local ? JSON.parse(local) : DEFAULT_MEDIA;
  } catch (e) {
    return DEFAULT_MEDIA;
  }
}

async function saveMediaItems(m) {
  try {
    localStorage.setItem("dropmallu_media", JSON.stringify(m));
  } catch (e) {}
}

// Initialize on script load
initializeStorage();

// Export to window for access in module scripts (like app.js)
window.DEFAULT_PRODUCTS = DEFAULT_PRODUCTS;
window.DEFAULT_BLOGS = DEFAULT_BLOGS;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.DEFAULT_HOMEPAGE_SECTIONS = DEFAULT_HOMEPAGE_SECTIONS;
window.DEFAULT_TESTIMONIALS = DEFAULT_TESTIMONIALS;
window.DEFAULT_BRANDS = DEFAULT_BRANDS;
window.DEFAULT_FLASH_SALES = DEFAULT_FLASH_SALES;
window.DEFAULT_MEDIA = DEFAULT_MEDIA;

window.getProducts = getProducts;
window.saveProducts = saveProducts;
window.getBlogs = getBlogs;
window.getSettings = getSettings;
window.saveSettings = saveSettings;
window.getHomepageSections = getHomepageSections;
window.saveHomepageSections = saveHomepageSections;
window.getTestimonials = getTestimonials;
window.saveTestimonials = saveTestimonials;
window.getBrands = getBrands;
window.saveBrands = saveBrands;
window.getFlashSales = getFlashSales;
window.saveFlashSales = saveFlashSales;
window.getMediaItems = getMediaItems;
window.saveMediaItems = saveMediaItems;
window.initializeStorage = initializeStorage;
