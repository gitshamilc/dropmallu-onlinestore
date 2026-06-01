// DROPMALLU Store Storage Manager

const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "AeroChron Titanium Chronograph",
    category: "watch",
    price: 14999,
    description: "Premium surgical titanium case with automatic mechanical movement. True 100m water resistance, scratch-resistant sapphire crystal glass, and custom glowing dial markers.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    badge: "Trending",
    rating: 4.9,
    reviews: 124
  },
  {
    id: "p2",
    name: "VoltCore Pro 30000mAh Powerbank",
    category: "powerbank",
    price: 3499,
    description: "Equipped with 100W PD ultra-fast charging capability. Features triple output ports (Dual USB-C, Single USB-A) and an LED smart status display tracking power health.",
    image: "https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?auto=format&fit=crop&w=600&q=80",
    badge: "Hot Seller",
    rating: 4.8,
    reviews: 98
  },
  {
    id: "p3",
    name: "Lumina CineMax 4K Laser Projector",
    category: "projector",
    price: 38999,
    description: "Transform your living space into a high-fidelity home theater. 3200 ANSI Lumens, 4K UHD native resolution, integrated Dolby Digital audio system, and fully motorized automatic focus.",
    image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=600&q=80",
    badge: "Premium Choice",
    rating: 5.0,
    reviews: 42
  },
  {
    id: "p4",
    name: "VeloGlide Carbon Fiber Sneakers",
    category: "shoe",
    price: 6499,
    description: "Engineered mesh upper paired with high-rebound Nitrogen-infused foam soles and a responsive carbon fiber shank. Maximizes step recovery and active foot ventilation.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    badge: "New Release",
    rating: 4.7,
    reviews: 156
  },
  {
    id: "p5",
    name: "Chronos Stealth Digital Smartwatch",
    category: "watch",
    price: 7999,
    description: "Sleek AMOLED always-on display wrapped in matte carbon steel. Features advanced heart tracking, blood oxygen monitors, 20+ workout modes, and a robust 12-day battery cycle.",
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80",
    badge: "Most Popular",
    rating: 4.8,
    reviews: 211
  },
  {
    id: "p6",
    name: "NeoSphere RGB Levitating Globe Speaker",
    category: "gadgets",
    price: 4999,
    description: "A breathtaking levitating 3D orb that floats above a magnetic base, blasting premium 360° audio. Synchronizes its addressable RGB layout with your favorite music beats.",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
    badge: "Trending",
    rating: 4.6,
    reviews: 67
  },
  {
    id: "p7",
    name: "PocketCharge Mini 10000mAh",
    category: "powerbank",
    price: 1899,
    description: "Incredibly compact design that fits in your wallet. Delivers fast 22.5W output charging with integrated retracting USB-C and Lightning cables.",
    image: "https://images.unsplash.com/photo-1619134593450-410a514d3f5e?auto=format&fit=crop&w=600&q=80",
    badge: "Essential",
    rating: 4.5,
    reviews: 145
  },
  {
    id: "p8",
    name: "Lumina Portable Cylinder Projector",
    category: "projector",
    price: 17499,
    description: "Features a unique 270-degree rotating cylinder, allowing instant projection onto ceilings or walls. Built-in Android TV allows seamless streaming of movies.",
    image: "https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?auto=format&fit=crop&w=600&q=80",
    badge: "Portable",
    rating: 4.7,
    reviews: 31
  },
  {
    id: "p9",
    name: "ZenWalk Knit Running Shoes",
    category: "shoe",
    price: 4299,
    description: "Crafted with dynamic elastic knit material for a glove-like contour. Built on flexible lightweight rubber treads designed to mimic native walking postures.",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=600&q=80",
    badge: "Comfort Fit",
    rating: 4.9,
    reviews: 88
  },
  {
    id: "p10",
    name: "Iris-Glow Smart Sleep Mask",
    category: "gadgets",
    price: 5499,
    description: "Blocks out 100% of light while utilizing bone conduction sound to play soothing ambient layers. Features custom wake-up lighting that mimics morning sun rays.",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
    badge: "Exclusive",
    rating: 4.4,
    reviews: 29
  },
  {
    id: "p11",
    name: "AquaDepth Pro Diver Watch",
    category: "watch",
    price: 12499,
    description: "Built for extreme pressure with 500m water resistance, helium escape valve, and ultra-luminous hands. The ultimate companion for deep sea explorers.",
    image: "https://images.unsplash.com/photo-1548171915-e7afaca00c37?auto=format&fit=crop&w=600&q=80",
    badge: "New Release",
    rating: 4.8,
    reviews: 87
  },
  {
    id: "p12",
    name: "HyperCharge 20000mAh Powerbank",
    category: "powerbank",
    price: 2199,
    description: "A solid middle-ground powerbank with QuickCharge 3.0 and dual 18W outputs. Perfect for flights and weekend getaways.",
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80",
    badge: "",
    rating: 4.6,
    reviews: 240
  },
  {
    id: "p13",
    name: "AeroKnit Urban Runners",
    category: "shoe",
    price: 3999,
    description: "Ultra-breathable slip-on runners designed for the concrete jungle. Features shock-absorbing memory foam and a zero-drop heel.",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80",
    badge: "Trending",
    rating: 4.5,
    reviews: 412
  },
  {
    id: "p14",
    name: "MiniBeam Portable 1080p Projector",
    category: "projector",
    price: 8999,
    description: "Crystal clear 1080p projection in a device the size of a soda can. Perfect for camping trips or outdoor movie nights.",
    image: "https://images.unsplash.com/photo-1616423641402-998858a7f13b?auto=format&fit=crop&w=600&q=80",
    badge: "Portable",
    rating: 4.3,
    reviews: 188
  },
  {
    id: "p15",
    name: "Smart Posture Corrector",
    category: "gadgets",
    price: 1499,
    description: "Wearable tech that gently vibrates when you slouch. Connects to your phone to track spinal alignment improvements over time.",
    image: "https://images.unsplash.com/photo-1576633587382-13ddf37a1cb1?auto=format&fit=crop&w=600&q=80",
    badge: "Health",
    rating: 4.2,
    reviews: 350
  },
  {
    id: "p16",
    name: "Obsidian Minimalist Watch",
    category: "watch",
    price: 4499,
    description: "An elegant, pitch-black dial with rose gold accents and a genuine leather strap. The perfect dress watch for formal occasions.",
    image: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=600&q=80",
    badge: "Classic",
    rating: 4.7,
    reviews: 89
  },
  {
    id: "p17",
    name: "SolarBoost 15000mAh Powerbank",
    category: "powerbank",
    price: 2999,
    description: "Rugged exterior with built-in solar panels for emergency charging. Includes an ultra-bright LED flashlight and carabiner clip.",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80",
    badge: "Outdoor",
    rating: 4.5,
    reviews: 132
  },
  {
    id: "p18",
    name: "TrekMaster All-Terrain Boots",
    category: "shoe",
    price: 5999,
    description: "Waterproof Gore-Tex lining with aggressive Vibram outsoles. Provides unbeatable ankle support and grip on wet, rocky trails.",
    image: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=600&q=80",
    badge: "Tough",
    rating: 4.9,
    reviews: 320
  },
  {
    id: "p19",
    name: "Aura 8K Ultra-Short Throw Laser",
    category: "projector",
    price: 145000,
    description: "The absolute pinnacle of home cinema. Delivers true 8K resolution from just 4 inches away from the wall. Includes built-in Harman Kardon soundbar.",
    image: "https://images.unsplash.com/photo-1621360144686-2a7e78d91c13?auto=format&fit=crop&w=600&q=80",
    badge: "Flagship",
    rating: 5.0,
    reviews: 14
  },
  {
    id: "p20",
    name: "MagStation Wireless Dock",
    category: "gadgets",
    price: 2499,
    description: "Simultaneously fast-charge your phone, watch, and earbuds with this sleek magnetic levitating dock station. Keeps your desk completely wire-free.",
    image: "https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?auto=format&fit=crop&w=600&q=80",
    badge: "Essential",
    rating: 4.8,
    reviews: 512
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
  const currentProducts = JSON.parse(localStorage.getItem("dropmallu_products"));
  // Force update if missing the new items
  if (!currentProducts || currentProducts.length < 20 || currentProducts[10]?.id !== "p11") {
    localStorage.setItem("dropmallu_products", JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem("dropmallu_blogs")) {
    localStorage.setItem("dropmallu_blogs", JSON.stringify(DEFAULT_BLOGS));
  }
}

// Product Storage Accessors
async function getProducts() {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products?select=*&order=created_at.asc`, {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch products from database");
      const data = await res.json();
      // If database is empty, seed it with defaults
      if (data.length === 0) {
        await saveProducts(DEFAULT_PRODUCTS);
        return DEFAULT_PRODUCTS;
      }
      return data;
    } catch (err) {
      console.error("Database error, falling back to LocalStorage:", err);
    }
  }
  
  initializeStorage();
  return JSON.parse(localStorage.getItem("dropmallu_products"));
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

  localStorage.setItem("dropmallu_products", JSON.stringify(products));
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
  localStorage.setItem("dropmallu_products", JSON.stringify(updatedProducts));
}

// Blog Storage Accessors
async function getBlogs() {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/banners?select=*&order=created_at.asc`, {
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
  return JSON.parse(localStorage.getItem("dropmallu_blogs"));
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

  localStorage.setItem("dropmallu_blogs", JSON.stringify(blogs));
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
  localStorage.setItem("dropmallu_blogs", JSON.stringify(updatedBlogs));
}

// Initialize on script load
initializeStorage();
