import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Haarvest — Farm to Table Marketplace" },
      { name: "description", content: "Direct farm-to-consumer marketplace. Meet local farmers and order produce harvested just hours ago." },
      { property: "og:title", content: "Haarvest — Farm to Table Marketplace" },
      { property: "og:description", content: "Direct farm-to-consumer marketplace. Fresh produce, no middlemen." },
    ],
  }),
  component: Haarvest,
});

/* ---------- Types ---------- */
type Farmer = {
  id: string;
  name: string;
  location: string;
  avatar: string;
  phone: string;
  liveLocation: string; // e.g. google maps link or coords
};
type Product = {
  id: string;
  name: string;
  category: "Vegetables" | "Fruits" | "Dairy" | "Grains" | "Herbs";
  farmerId: string;
  price: number;
  unit: string;
  quantity: number;
  freshness: "Harvested Today" | "1 Day Ago" | "2 Days Ago";
  emoji: string;
};
type CartItem = { productId: string; qty: number };
type Toast = { id: number; msg: string; kind?: "success" | "info" | "error" };
type AdminAccount = { username: string; password: string; securityQ: string; securityA: string };

/* ---------- Defaults ---------- */
const DEFAULT_FARMERS: Farmer[] = [
  { id: "f1", name: "Emma Fields", location: "Green Valley", avatar: "👩‍🌾", phone: "+1 555-201-3344", liveLocation: "https://maps.google.com/?q=Green+Valley+Farm" },
  { id: "f2", name: "Ben Orchard", location: "Riverbend", avatar: "🧑‍🌾", phone: "+1 555-414-9920", liveLocation: "https://maps.google.com/?q=Riverbend+Orchard" },
  { id: "f3", name: "Maya Greens", location: "Oakridge", avatar: "👩🏽‍🌾", phone: "+1 555-778-1100", liveLocation: "https://maps.google.com/?q=Oakridge+Greens" },
  { id: "f4", name: "Lucas Harvest", location: "Sunfield", avatar: "👨‍🌾", phone: "+1 555-332-6677", liveLocation: "https://maps.google.com/?q=Sunfield+Farm" },
];

const DEFAULT_PRODUCTS: Product[] = [
  { id: "p1", name: "Tomatoes", category: "Vegetables", farmerId: "f1", price: 3.5, unit: "lb", quantity: 40, freshness: "Harvested Today", emoji: "🍅" },
  { id: "p2", name: "Carrots", category: "Vegetables", farmerId: "f3", price: 2.2, unit: "lb", quantity: 60, freshness: "1 Day Ago", emoji: "🥕" },
  { id: "p3", name: "Corn", category: "Grains", farmerId: "f4", price: 0.9, unit: "ear", quantity: 120, freshness: "Harvested Today", emoji: "🌽" },
  { id: "p4", name: "Lettuce", category: "Vegetables", farmerId: "f3", price: 2.0, unit: "head", quantity: 30, freshness: "Harvested Today", emoji: "🥬" },
  { id: "p5", name: "Apples", category: "Fruits", farmerId: "f2", price: 1.8, unit: "lb", quantity: 80, freshness: "1 Day Ago", emoji: "🍎" },
  { id: "p6", name: "Blueberries", category: "Fruits", farmerId: "f2", price: 5.5, unit: "pint", quantity: 25, freshness: "Harvested Today", emoji: "🫐" },
  { id: "p7", name: "Fresh Milk", category: "Dairy", farmerId: "f1", price: 4.0, unit: "gal", quantity: 18, freshness: "Harvested Today", emoji: "🥛" },
  { id: "p8", name: "Wheat", category: "Grains", farmerId: "f4", price: 1.2, unit: "lb", quantity: 200, freshness: "2 Days Ago", emoji: "🌾" },
  { id: "p9", name: "Basil", category: "Herbs", farmerId: "f3", price: 2.5, unit: "bunch", quantity: 22, freshness: "Harvested Today", emoji: "🌿" },
  { id: "p10", name: "Potatoes", category: "Vegetables", farmerId: "f4", price: 1.1, unit: "lb", quantity: 150, freshness: "2 Days Ago", emoji: "🥔" },
  { id: "p11", name: "Cucumbers", category: "Vegetables", farmerId: "f1", price: 1.5, unit: "lb", quantity: 35, freshness: "1 Day Ago", emoji: "🥒" },
  { id: "p12", name: "Strawberries", category: "Fruits", farmerId: "f2", price: 4.8, unit: "pint", quantity: 28, freshness: "Harvested Today", emoji: "🍓" },
];

const CATEGORIES = ["All", "Vegetables", "Fruits", "Dairy", "Grains", "Herbs"] as const;

/* ---------- localStorage helpers ---------- */
const LS = {
  get<T>(k: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const v = window.localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
};

function freshnessColor(f: Product["freshness"]) {
  if (f === "Harvested Today") return "var(--leaf)";
  if (f === "1 Day Ago") return "var(--gold)";
  return "var(--sage)";
}

/* ---------- Main App ---------- */
function Haarvest() {
  const [farmers, setFarmers] = useState<Farmer[]>(DEFAULT_FARMERS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [activeFarmer, setActiveFarmer] = useState<string>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [freshness, setFreshness] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [farmerNotifs, setFarmerNotifs] = useState<Record<string, number>>({});
  const toastId = useRef(0);

  /* hydrate from localStorage */
  useEffect(() => {
    setFarmers(LS.get("hv_farmers", DEFAULT_FARMERS));
    setProducts(LS.get("hv_products", DEFAULT_PRODUCTS));
    setCart(LS.get<CartItem[]>("hv_cart", []));
    setAdminAccount(LS.get<AdminAccount | null>("hv_admin", null));
    setLoggedIn(LS.get<boolean>("hv_session", false));
    setFarmerNotifs(LS.get<Record<string, number>>("hv_notifs", {}));
  }, []);

  useEffect(() => LS.set("hv_farmers", farmers), [farmers]);
  useEffect(() => LS.set("hv_products", products), [products]);
  useEffect(() => LS.set("hv_cart", cart), [cart]);
  useEffect(() => { if (adminAccount) LS.set("hv_admin", adminAccount); }, [adminAccount]);
  useEffect(() => LS.set("hv_session", loggedIn), [loggedIn]);
  useEffect(() => LS.set("hv_notifs", farmerNotifs), [farmerNotifs]);

  /* freshness meter */
  useEffect(() => {
    let v = 0;
    const t = setInterval(() => {
      v += 2;
      setFreshness(v);
      if (v >= 92) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, []);

  /* sticky nav */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------- Toast ---------- */
  function toast(msg: string, kind: Toast["kind"] = "success") {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }

  /* ---------- Filtering ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const farmer = farmers.find((f) => f.id === p.farmerId);
      if (category !== "All" && p.category !== category) return false;
      if (activeFarmer !== "all" && p.farmerId !== activeFarmer) return false;
      if (q) {
        const inName = p.name.toLowerCase().includes(q);
        const inFarmer = farmer?.name.toLowerCase().includes(q);
        if (!inName && !inFarmer) return false;
      }
      return true;
    });
  }, [products, farmers, search, category, activeFarmer]);

  /* ---------- Cart ---------- */
  const cartItems = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId)! })).filter((x) => x.product);
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cartItems.reduce((s, c) => s + c.product.price * c.qty, 0);

  function addToCart(p: Product) {
    setCart((c) => {
      const e = c.find((x) => x.productId === p.id);
      if (e) return c.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { productId: p.id, qty: 1 }];
    });
    toast(`Added ${p.name} to cart`);
  }
  function inc(id: string) { setCart((c) => c.map((x) => (x.productId === id ? { ...x, qty: x.qty + 1 } : x))); }
  function dec(id: string) { setCart((c) => c.flatMap((x) => (x.productId === id ? (x.qty <= 1 ? [] : [{ ...x, qty: x.qty - 1 }]) : [x]))); }
  function removeItem(id: string) { setCart((c) => c.filter((x) => x.productId !== id)); }

  function requestOrder() {
    if (cartItems.length === 0) { toast("Your cart is empty", "error"); return; }
    // notify farmers
    const notifs = { ...farmerNotifs };
    const messages: string[] = [];
    cartItems.forEach((ci) => {
      notifs[ci.product.farmerId] = (notifs[ci.product.farmerId] || 0) + ci.qty;
      const f = farmers.find((x) => x.id === ci.product.farmerId);
      if (f) messages.push(`📞 Notified ${f.name} (${f.phone}) — ${ci.qty} × ${ci.product.name}`);
    });
    setFarmerNotifs(notifs);
    messages.slice(0, 3).forEach((m, i) => setTimeout(() => toast(m, "info"), (i + 1) * 600));
    setCart([]);
    setCartOpen(false);
    toast("Order request sent to farmers successfully!");
  }

  /* ---------- Admin ---------- */
  function openAdmin() { setAdminOpen(true); }
  function logout() { setLoggedIn(false); toast("Logged out"); }

  return (
    <div className="hv-root">
      <StyleTag />
      <Ticker />
      <Nav
        scrolled={scrolled}
        cartCount={totalItems}
        onCart={() => setCartOpen(true)}
        onAdmin={openAdmin}
        loggedIn={loggedIn}
        onLogout={logout}
        onSearch={setSearch}
        search={search}
      />
      <Hero search={search} setSearch={setSearch} category={category} setCategory={setCategory} freshness={freshness} />
      <FarmersStrip farmers={farmers} active={activeFarmer} setActive={setActiveFarmer} notifs={farmerNotifs} />
      <Marketplace products={filtered} farmers={farmers} onAdd={addToCart} />
      <Footer />

      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        inc={inc}
        dec={dec}
        remove={removeItem}
        subtotal={subtotal}
        totalItems={totalItems}
        onOrder={requestOrder}
      />

      {adminOpen && (
        <AdminModal
          onClose={() => setAdminOpen(false)}
          account={adminAccount}
          setAccount={setAdminAccount}
          loggedIn={loggedIn}
          setLoggedIn={setLoggedIn}
          toast={toast}
          farmers={farmers}
          setFarmers={setFarmers}
          products={products}
          setProducts={setProducts}
          notifs={farmerNotifs}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

/* ---------- Ticker ---------- */
function Ticker() {
  const items = [
    "🌽 Corn season",
    "🍅 Tomatoes at peak",
    "🫐 Blueberries arriving Friday",
    "🥬 Fresh greens harvested this morning",
    "🍓 Strawberries just picked",
    "🥛 Morning milk delivered",
  ];
  const line = items.join("   ·   ");
  return (
    <div className="ticker">
      <div className="ticker-track">
        <span>{line}</span>
        <span aria-hidden>{line}</span>
      </div>
    </div>
  );
}

/* ---------- Nav ---------- */
function Nav({ scrolled, cartCount, onCart, onAdmin, loggedIn, onLogout, onSearch, search }: any) {
  const [open, setOpen] = useState(false);
  return (
    <nav className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#" className="logo">
          <span className="logo-mark">🌾</span>
          <span className="logo-text">Haarvest</span>
        </a>
        <div className={`nav-search ${open ? "open" : ""}`}>
          <input
            placeholder="Search produce or farmer…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="nav-actions">
          <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Search">🔍</button>
          <button className="icon-btn cart-btn" onClick={onCart} aria-label="Cart">
            🧺
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          {loggedIn ? (
            <button className="btn-ghost" onClick={onLogout}>Logout</button>
          ) : (
            <button className="btn-admin" onClick={onAdmin}>Admin</button>
          )}
          {loggedIn && <button className="btn-admin" onClick={onAdmin}>Dashboard</button>}
        </div>
      </div>
    </nav>
  );
}

/* ---------- Hero ---------- */
function Hero({ search, setSearch, category, setCategory, freshness }: any) {
  return (
    <header className="hero">
      <div className="hero-grain" />
      <div className="hero-inner">
        <div className="hero-tag">est. local · seasonal · honest</div>
        <h1 className="hero-title">
          From their soil. <em>To your table.</em>
        </h1>
        <p className="hero-sub">Meet local farmers and order produce harvested just hours ago.</p>

        <div className="hero-search">
          <span>🔎</span>
          <input
            placeholder="Search tomatoes, basil, Emma Fields…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "chip-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="freshness">
          <div className="freshness-label">
            <span>🌱 Harvested Today</span>
            <span className="mono">{freshness}%</span>
          </div>
          <div className="freshness-bar"><div className="freshness-fill" style={{ width: `${freshness}%` }} /></div>
        </div>
      </div>
      <div className="hero-crate" aria-hidden>🥕🍅🌽🥬🍎🫐🌿</div>
    </header>
  );
}

/* ---------- Farmers Strip ---------- */
function FarmersStrip({ farmers, active, setActive, notifs }: any) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Meet the Farmers</h2>
        <p>Pick a farm and shop their harvest.</p>
      </div>
      <div className="farmers-strip">
        <button
          className={`farmer-card ${active === "all" ? "selected" : ""}`}
          onClick={() => setActive("all")}
        >
          <div className="farmer-avatar">🌾</div>
          <div className="farmer-name">All Farmers</div>
          <div className="farmer-loc">Every harvest</div>
        </button>
        {farmers.map((f: Farmer) => (
          <button
            key={f.id}
            className={`farmer-card ${active === f.id ? "selected" : ""}`}
            onClick={() => setActive(f.id)}
          >
            <div className="farmer-avatar">{f.avatar}</div>
            <div className="farmer-name">{f.name}</div>
            <div className="farmer-loc">{f.location}</div>
            <div className="farmer-meta mono">📞 {f.phone}</div>
            <a className="farmer-meta link" href={f.liveLocation} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>📍 Live location</a>
            {notifs[f.id] ? <div className="farmer-notif">🔔 {notifs[f.id]} pending</div> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Marketplace ---------- */
function Marketplace({ products, farmers, onAdd }: any) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Today's Market</h2>
        <p>{products.length} fresh {products.length === 1 ? "pick" : "picks"} from the field.</p>
      </div>
      {products.length === 0 ? (
        <div className="empty">No produce matches your filters yet. Try a different farmer or category.</div>
      ) : (
        <div className="product-grid">
          {products.map((p: Product) => {
            const farmer = farmers.find((f: Farmer) => f.id === p.farmerId);
            return <ProductCard key={p.id} p={p} farmer={farmer} onAdd={onAdd} />;
          })}
        </div>
      )}
    </section>
  );
}

function ProductCard({ p, farmer, onAdd }: { p: Product; farmer?: Farmer; onAdd: (p: Product) => void }) {
  const [pop, setPop] = useState(false);
  return (
    <article className="product">
      <div className="product-img">{p.emoji}</div>
      <div className="product-body">
        <div className="product-head">
          <h3>{p.name}</h3>
          <span className="freshness-badge" style={{ background: freshnessColor(p.freshness) }}>{p.freshness}</span>
        </div>
        <div className="product-farm">{farmer ? `from ${farmer.name} · ${farmer.location}` : "Local farm"}</div>
        <div className="product-meta">
          <span className="price mono">₹{p.price.toFixed(2)}<small>/{p.unit}</small></span>
          <span className="stock mono">{p.quantity} {p.unit} left</span>
        </div>
        <button
          className={`add-btn ${pop ? "pop" : ""}`}
          onClick={() => { onAdd(p); setPop(true); setTimeout(() => setPop(false), 280); }}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}

/* ---------- Cart Sidebar ---------- */
function CartSidebar({ open, onClose, items, inc, dec, remove, subtotal, totalItems, onOrder }: any) {
  return (
    <>
      <div className={`cart-overlay ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`cart ${open ? "open" : ""}`}>
        <div className="cart-head">
          <h3>Your Basket</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="cart-body">
          {items.length === 0 && <div className="empty">Your basket is empty. Go find something fresh!</div>}
          {items.map((ci: any) => (
            <div key={ci.productId} className="cart-item">
              <div className="cart-emoji">{ci.product.emoji}</div>
              <div className="cart-info">
                <div className="cart-name">{ci.product.name}</div>
                <div className="cart-price mono">₹{ci.product.price.toFixed(2)}/{ci.product.unit}</div>
                <div className="qty">
                  <button onClick={() => dec(ci.productId)}>−</button>
                  <span className="mono">{ci.qty}</span>
                  <button onClick={() => inc(ci.productId)}>+</button>
                  <button className="remove" onClick={() => remove(ci.productId)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-foot">
          <div className="cart-totals">
            <div><span>Items</span><span className="mono">{totalItems}</span></div>
            <div className="cart-sub"><span>Subtotal</span><span className="mono">₹{subtotal.toFixed(2)}</span></div>
          </div>
          <button className="order-btn" onClick={onOrder}>Request Order</button>
        </div>
      </aside>
    </>
  );
}

/* ---------- Admin Modal ---------- */
function AdminModal({ onClose, account, setAccount, loggedIn, setLoggedIn, toast, farmers, setFarmers, products, setProducts, notifs }: any) {
  const [mode, setMode] = useState<"setup" | "login" | "forgot" | "dash">(
    loggedIn ? "dash" : account ? "login" : "setup"
  );
  useEffect(() => {
    setMode(loggedIn ? "dash" : account ? "login" : "setup");
  }, [loggedIn, account]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${mode === "dash" ? "modal-lg" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>
            {mode === "setup" && "Create Admin Account"}
            {mode === "login" && "Admin Login"}
            {mode === "forgot" && "Reset Password"}
            {mode === "dash" && "Admin Dashboard"}
          </h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {mode === "setup" && <SetupForm onCreate={(a) => { setAccount(a); setLoggedIn(true); toast("Admin account created"); }} />}
        {mode === "login" && (
          <LoginForm
            account={account}
            onLogin={() => { setLoggedIn(true); toast("Welcome back, admin"); }}
            onForgot={() => setMode("forgot")}
            toast={toast}
          />
        )}
        {mode === "forgot" && (
          <ForgotForm
            account={account}
            onReset={(newPw: string) => {
              setAccount({ ...account, password: newPw });
              toast("Password updated. Please log in.");
              setMode("login");
            }}
            onBack={() => setMode("login")}
            toast={toast}
          />
        )}
        {mode === "dash" && (
          <Dashboard
            farmers={farmers} setFarmers={setFarmers}
            products={products} setProducts={setProducts}
            toast={toast} notifs={notifs}
          />
        )}
      </div>
    </div>
  );
}

function SetupForm({ onCreate }: { onCreate: (a: AdminAccount) => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [c, setC] = useState("");
  const [q, setQ] = useState("What is your favorite crop?"); const [a, setA] = useState("");
  const [err, setErr] = useState("");
  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault();
      if (!u || !p) return setErr("Username and password required");
      if (p.length < 4) return setErr("Password must be at least 4 characters");
      if (p !== c) return setErr("Passwords do not match");
      if (!a.trim()) return setErr("Security answer is required for password recovery");
      onCreate({ username: u.trim(), password: p, securityQ: q, securityA: a.trim().toLowerCase() });
    }}>
      <p className="form-hint">You're setting up your own admin account. Nothing is preset.</p>
      <label>Username<input value={u} onChange={(e) => setU(e.target.value)} /></label>
      <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} /></label>
      <label>Confirm Password<input type="password" value={c} onChange={(e) => setC(e.target.value)} /></label>
      <label>Security Question
        <select value={q} onChange={(e) => setQ(e.target.value)}>
          <option>What is your favorite crop?</option>
          <option>What is the name of your first pet?</option>
          <option>What city were you born in?</option>
        </select>
      </label>
      <label>Security Answer<input value={a} onChange={(e) => setA(e.target.value)} /></label>
      {err && <div className="form-err">{err}</div>}
      <button className="order-btn" type="submit">Create Account</button>
    </form>
  );
}

function LoginForm({ account, onLogin, onForgot, toast }: any) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [tries, setTries] = useState(0);
  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault();
      if (u.trim() === account.username && p === account.password) onLogin();
      else {
        const n = tries + 1; setTries(n);
        toast("Invalid credentials", "error");
        if (n >= 2) toast("Forgot password? Use the reset link below.", "info");
      }
    }}>
      <label>Username<input value={u} onChange={(e) => setU(e.target.value)} /></label>
      <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} /></label>
      <button className="order-btn" type="submit">Login</button>
      <button type="button" className="btn-link" onClick={onForgot}>Forgot password?</button>
    </form>
  );
}

function ForgotForm({ account, onReset, onBack, toast }: any) {
  const [a, setA] = useState(""); const [np, setNp] = useState(""); const [cp, setCp] = useState("");
  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault();
      if (a.trim().toLowerCase() !== account.securityA) { toast("Security answer is incorrect", "error"); return; }
      if (np.length < 4) { toast("Password too short", "error"); return; }
      if (np !== cp) { toast("Passwords do not match", "error"); return; }
      onReset(np);
    }}>
      <p className="form-hint">Answer your security question to reset the password.</p>
      <label>{account?.securityQ}<input value={a} onChange={(e) => setA(e.target.value)} /></label>
      <label>New Password<input type="password" value={np} onChange={(e) => setNp(e.target.value)} /></label>
      <label>Confirm New Password<input type="password" value={cp} onChange={(e) => setCp(e.target.value)} /></label>
      <button className="order-btn" type="submit">Reset Password</button>
      <button type="button" className="btn-link" onClick={onBack}>Back to login</button>
    </form>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ farmers, setFarmers, products, setProducts, toast, notifs }: any) {
  const [tab, setTab] = useState<"farmers" | "products">("farmers");
  return (
    <div className="dash">
      <div className="dash-tabs">
        <button className={tab === "farmers" ? "active" : ""} onClick={() => setTab("farmers")}>Farmers</button>
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
      </div>
      {tab === "farmers" ? (
        <FarmerCRUD farmers={farmers} setFarmers={setFarmers} toast={toast} notifs={notifs} products={products} setProducts={setProducts} />
      ) : (
        <ProductCRUD farmers={farmers} products={products} setProducts={setProducts} toast={toast} />
      )}
    </div>
  );
}

function FarmerCRUD({ farmers, setFarmers, toast, notifs, products, setProducts }: any) {
  const empty: Farmer = { id: "", name: "", location: "", avatar: "👩‍🌾", phone: "", liveLocation: "" };
  const [form, setForm] = useState<Farmer>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.location) { toast("Name and location required", "error"); return; }
    if (editing) {
      setFarmers(farmers.map((f: Farmer) => f.id === editing ? { ...form, id: editing } : f));
      toast("Farmer updated");
    } else {
      setFarmers([...farmers, { ...form, id: "f" + Date.now() }]);
      toast("Farmer added");
    }
    setForm(empty); setEditing(null);
  }
  function edit(f: Farmer) { setForm(f); setEditing(f.id); }
  function remove(id: string) {
    setFarmers(farmers.filter((f: Farmer) => f.id !== id));
    setProducts(products.filter((p: Product) => p.farmerId !== id));
    toast("Farmer removed");
  }

  return (
    <div className="crud">
      <form className="form crud-form" onSubmit={submit}>
        <h4>{editing ? "Edit farmer" : "Add farmer"}</h4>
        <div className="row2">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        </div>
        <div className="row2">
          <label>Avatar emoji<input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        </div>
        <label>Live Location (link)<input value={form.liveLocation} onChange={(e) => setForm({ ...form, liveLocation: e.target.value })} placeholder="https://maps.google.com/?q=…" /></label>
        <div className="row2">
          <button className="order-btn" type="submit">{editing ? "Save" : "Add"}</button>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setForm(empty); setEditing(null); }}>Cancel</button>}
        </div>
      </form>
      <div className="crud-list">
        {farmers.map((f: Farmer) => (
          <div key={f.id} className="crud-row">
            <div className="crud-cell"><span className="big">{f.avatar}</span></div>
            <div className="crud-cell grow">
              <div className="crud-title">{f.name}</div>
              <div className="crud-sub">{f.location} · 📞 {f.phone || "—"}</div>
              {notifs[f.id] ? <div className="crud-sub">🔔 {notifs[f.id]} pending sales</div> : null}
            </div>
            <div className="crud-actions">
              <button onClick={() => edit(f)}>Edit</button>
              <button className="danger" onClick={() => remove(f.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCRUD({ farmers, products, setProducts, toast }: any) {
  const empty: Product = { id: "", name: "", category: "Vegetables", farmerId: farmers[0]?.id || "", price: 0, unit: "lb", quantity: 0, freshness: "Harvested Today", emoji: "🍅" };
  const [form, setForm] = useState<Product>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.farmerId) { toast("Name and farmer required", "error"); return; }
    if (editing) {
      setProducts(products.map((p: Product) => p.id === editing ? { ...form, id: editing } : p));
      toast("Product updated");
    } else {
      setProducts([...products, { ...form, id: "p" + Date.now() }]);
      toast("Product added");
    }
    setForm(empty); setEditing(null);
  }
  function edit(p: Product) { setForm(p); setEditing(p.id); }
  function remove(id: string) { setProducts(products.filter((p: Product) => p.id !== id)); toast("Product removed"); }

  return (
    <div className="crud">
      <form className="form crud-form" onSubmit={submit}>
        <h4>{editing ? "Edit product" : "Add product"}</h4>
        <div className="row2">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Emoji<input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></label>
        </div>
        <div className="row2">
          <label>Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product["category"] })}>
              {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Farmer
            <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })}>
              {farmers.map((f: Farmer) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        </div>
        <div className="row2">
          <label>Price<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></label>
          <label>Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
        </div>
        <div className="row2">
          <label>Quantity<input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} /></label>
          <label>Freshness
            <select value={form.freshness} onChange={(e) => setForm({ ...form, freshness: e.target.value as Product["freshness"] })}>
              <option>Harvested Today</option>
              <option>1 Day Ago</option>
              <option>2 Days Ago</option>
            </select>
          </label>
        </div>
        <div className="row2">
          <button className="order-btn" type="submit">{editing ? "Save" : "Add"}</button>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setForm(empty); setEditing(null); }}>Cancel</button>}
        </div>
      </form>
      <div className="crud-list">
        {products.map((p: Product) => {
          const f = farmers.find((x: Farmer) => x.id === p.farmerId);
          return (
            <div key={p.id} className="crud-row">
              <div className="crud-cell"><span className="big">{p.emoji}</span></div>
              <div className="crud-cell grow">
                <div className="crud-title">{p.name} <span className="tag mono">₹{p.price.toFixed(2)}/{p.unit}</span></div>
                <div className="crud-sub">{p.category} · {f?.name || "—"} · {p.quantity} in stock · {p.freshness}</div>
              </div>
              <div className="crud-actions">
                <button onClick={() => edit(p)}>Edit</button>
                <button className="danger" onClick={() => remove(p.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind || "success"}`}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="footer">
      <div>🌾 Haarvest — From their soil. To your table.</div>
      <div className="muted">Local farms. Honest food. No middlemen.</div>
    </footer>
  );
}

/* ---------- Styles ---------- */
function StyleTag() {
  return (
    <style>{`
:root{
  --soil:#2C1A0E;
  --leaf:#4A7C59;
  --gold:#D4A847;
  --parchment:#F5F0E8;
  --sage:#8FAF8A;
  --soil-2:#3a2415;
  --shadow: 0 10px 30px -10px rgba(44,26,14,.25);
  --shadow-sm: 0 4px 14px -6px rgba(44,26,14,.2);
  --r: 14px;
  --font-display: 'Playfair Display', 'Georgia', serif;
  --font-body: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
*{box-sizing:border-box}
html,body,#root{margin:0;padding:0}
.hv-root{
  font-family:var(--font-body);
  color:var(--soil);
  background:
    radial-gradient(circle at 10% 0%, rgba(212,168,71,.10), transparent 40%),
    radial-gradient(circle at 90% 20%, rgba(74,124,89,.10), transparent 45%),
    var(--parchment);
  min-height:100vh;
}
.mono{font-family:var(--font-mono)}
button{font-family:inherit; cursor:pointer; border:none; background:none; color:inherit}
input,select{font-family:inherit; font-size:14px; padding:10px 12px; border:1px solid rgba(44,26,14,.15); border-radius:10px; background:#fff; color:var(--soil); width:100%}
input:focus,select:focus{outline:2px solid var(--leaf); outline-offset:1px}

/* Ticker */
.ticker{background:var(--soil); color:var(--parchment); overflow:hidden; font-size:13px; letter-spacing:.04em}
.ticker-track{display:flex; gap:48px; white-space:nowrap; padding:8px 0; animation:tick 38s linear infinite}
.ticker-track span{padding-right:48px}
@keyframes tick{from{transform:translateX(0)} to{transform:translateX(-50%)}}

/* Nav */
.nav{position:sticky; top:0; z-index:50; background:rgba(245,240,232,.85); backdrop-filter:blur(10px); border-bottom:1px solid transparent; transition:all .25s ease}
.nav-scrolled{background:rgba(245,240,232,.95); border-bottom-color:rgba(44,26,14,.08); box-shadow:var(--shadow-sm)}
.nav-inner{max-width:1200px; margin:0 auto; padding:14px 22px; display:flex; align-items:center; gap:16px}
.logo{display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--soil)}
.logo-mark{font-size:26px; filter:drop-shadow(0 2px 0 rgba(0,0,0,.05))}
.logo-text{font-family:var(--font-display); font-size:24px; font-weight:700; letter-spacing:.5px}
.nav-search{flex:1; max-width:480px; margin:0 auto; display:none}
.nav-search.open{display:block}
.nav-search input{background:#fff; border:1px solid rgba(44,26,14,.12); border-radius:999px; padding:10px 16px}
.nav-actions{margin-left:auto; display:flex; align-items:center; gap:8px}
.icon-btn{font-size:18px; padding:8px 10px; border-radius:10px; transition:background .2s}
.icon-btn:hover{background:rgba(44,26,14,.08)}
.cart-btn{position:relative}
.cart-badge{position:absolute; top:0; right:0; background:var(--leaf); color:#fff; font-size:11px; font-family:var(--font-mono); border-radius:999px; min-width:18px; height:18px; padding:0 5px; display:grid; place-items:center}
.btn-admin{background:var(--soil); color:var(--parchment); padding:8px 14px; border-radius:999px; font-weight:600; font-size:13px; transition:transform .15s, background .2s}
.btn-admin:hover{background:var(--soil-2); transform:translateY(-1px)}
.btn-ghost{padding:8px 14px; border-radius:999px; font-weight:600; font-size:13px; border:1px solid rgba(44,26,14,.18)}
.btn-ghost:hover{background:rgba(44,26,14,.06)}

/* Hero */
.hero{position:relative; padding:60px 22px 80px; overflow:hidden}
.hero-grain{position:absolute; inset:0; opacity:.35; pointer-events:none;
  background-image: radial-gradient(rgba(44,26,14,.08) 1px, transparent 1px);
  background-size: 6px 6px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,1), rgba(0,0,0,0));
}
.hero-inner{max-width:880px; margin:0 auto; position:relative; text-align:center}
.hero-tag{display:inline-block; font-size:11px; text-transform:uppercase; letter-spacing:.3em; color:var(--leaf); border:1px solid rgba(74,124,89,.3); padding:6px 14px; border-radius:999px; background:rgba(255,255,255,.5); margin-bottom:20px}
.hero-title{font-family:var(--font-display); font-size:clamp(40px,7vw,76px); margin:0 0 14px; line-height:1.05; font-weight:700; letter-spacing:-.02em}
.hero-title em{font-style:italic; color:var(--leaf)}
.hero-sub{font-size:18px; color:rgba(44,26,14,.7); margin:0 auto 28px; max-width:560px}
.hero-search{display:flex; align-items:center; gap:10px; background:#fff; padding:8px 8px 8px 18px; border-radius:999px; box-shadow:var(--shadow); max-width:560px; margin:0 auto}
.hero-search span{font-size:18px}
.hero-search input{border:none; padding:12px 4px; box-shadow:none}
.hero-search input:focus{outline:none}
.chips{display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin:24px 0 32px}
.chip{padding:8px 16px; border-radius:999px; background:#fff; border:1px solid rgba(44,26,14,.12); font-size:13px; font-weight:600; color:var(--soil); transition:all .2s ease}
.chip:hover{transform:translateY(-1px); border-color:var(--leaf)}
.chip-active{background:var(--soil); color:var(--parchment); border-color:var(--soil)}
.freshness{max-width:480px; margin:0 auto; background:#fff; border-radius:14px; padding:14px 18px; box-shadow:var(--shadow-sm)}
.freshness-label{display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:8px}
.freshness-bar{height:8px; background:rgba(44,26,14,.08); border-radius:999px; overflow:hidden}
.freshness-fill{height:100%; background:linear-gradient(90deg, var(--leaf), var(--gold)); border-radius:999px; transition:width .35s ease}
.hero-crate{position:absolute; bottom:10px; right:-20px; font-size:90px; opacity:.07; transform:rotate(-8deg); letter-spacing:8px; pointer-events:none}

/* Section */
.section{max-width:1200px; margin:0 auto; padding:40px 22px}
.section-head{margin-bottom:22px}
.section-head h2{font-family:var(--font-display); font-size:32px; margin:0 0 6px; font-weight:700}
.section-head p{margin:0; color:rgba(44,26,14,.6); font-size:14px}

/* Farmers strip */
.farmers-strip{display:flex; gap:14px; overflow-x:auto; padding:4px 2px 16px; scroll-snap-type:x mandatory; scrollbar-width:thin}
.farmers-strip::-webkit-scrollbar{height:6px}
.farmers-strip::-webkit-scrollbar-thumb{background:rgba(44,26,14,.2); border-radius:999px}
.farmer-card{flex:0 0 200px; scroll-snap-align:start; background:#fff; border-radius:16px; padding:18px; text-align:left; box-shadow:var(--shadow-sm); border:2px solid transparent; transition:transform .2s, border-color .2s, box-shadow .2s; display:flex; flex-direction:column; gap:4px}
.farmer-card:hover{transform:translateY(-4px); box-shadow:var(--shadow)}
.farmer-card.selected{border-color:var(--leaf); background:linear-gradient(180deg,#fff,rgba(74,124,89,.06))}
.farmer-avatar{font-size:42px; margin-bottom:6px}
.farmer-name{font-weight:700; font-family:var(--font-display); font-size:18px}
.farmer-loc{font-size:13px; color:rgba(44,26,14,.6)}
.farmer-meta{font-size:12px; color:rgba(44,26,14,.65); margin-top:4px}
.farmer-meta.link{color:var(--leaf); text-decoration:none}
.farmer-meta.link:hover{text-decoration:underline}
.farmer-notif{margin-top:6px; font-size:12px; background:var(--gold); color:var(--soil); padding:3px 8px; border-radius:999px; align-self:flex-start; font-weight:600}

/* Products */
.product-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:18px}
.product{background:#fff; border-radius:18px; overflow:hidden; box-shadow:var(--shadow-sm); transition:transform .25s ease, box-shadow .25s ease; display:flex; flex-direction:column; border:1px solid rgba(44,26,14,.05)}
.product:hover{transform:translateY(-6px); box-shadow:var(--shadow)}
.product-img{font-size:72px; text-align:center; padding:30px 0 14px; background:linear-gradient(180deg, rgba(212,168,71,.12), rgba(74,124,89,.08))}
.product-body{padding:16px 16px 18px; display:flex; flex-direction:column; gap:8px}
.product-head{display:flex; align-items:flex-start; justify-content:space-between; gap:8px}
.product-head h3{margin:0; font-family:var(--font-display); font-size:20px; font-weight:700}
.freshness-badge{font-size:10px; color:#fff; padding:4px 8px; border-radius:999px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap}
.product-farm{font-size:12px; color:rgba(44,26,14,.6)}
.product-meta{display:flex; justify-content:space-between; align-items:center; margin:4px 0 8px}
.price{font-size:18px; font-weight:700}
.price small{font-size:11px; font-weight:500; color:rgba(44,26,14,.5); margin-left:2px}
.stock{font-size:11px; color:rgba(44,26,14,.55)}
.add-btn{background:var(--leaf); color:#fff; padding:10px 14px; border-radius:10px; font-weight:600; font-size:13px; transition:transform .15s, background .2s, box-shadow .2s}
.add-btn:hover{background:#3e6b4c; box-shadow:0 6px 18px -6px rgba(74,124,89,.5)}
.add-btn.pop{animation:pop .28s ease}
@keyframes pop{0%{transform:scale(1)} 40%{transform:scale(.94)} 100%{transform:scale(1)}}

.empty{text-align:center; padding:36px; color:rgba(44,26,14,.55); background:#fff; border-radius:14px; border:1px dashed rgba(44,26,14,.15)}

/* Cart */
.cart-overlay{position:fixed; inset:0; background:rgba(44,26,14,.4); opacity:0; pointer-events:none; transition:opacity .25s; z-index:60}
.cart-overlay.show{opacity:1; pointer-events:auto}
.cart{position:fixed; top:0; right:0; height:100vh; width:min(420px,100%); background:var(--parchment); z-index:70; transform:translateX(100%); transition:transform .35s cubic-bezier(.2,.8,.2,1); display:flex; flex-direction:column; box-shadow:-20px 0 60px -20px rgba(44,26,14,.3)}
.cart.open{transform:translateX(0)}
.cart-head{display:flex; align-items:center; justify-content:space-between; padding:18px 20px; border-bottom:1px solid rgba(44,26,14,.08)}
.cart-head h3{margin:0; font-family:var(--font-display); font-size:22px}
.cart-body{flex:1; overflow-y:auto; padding:18px 20px; display:flex; flex-direction:column; gap:12px}
.cart-item{display:flex; gap:12px; background:#fff; border-radius:12px; padding:12px; box-shadow:var(--shadow-sm)}
.cart-emoji{font-size:34px; align-self:center}
.cart-info{flex:1}
.cart-name{font-weight:700; font-family:var(--font-display); font-size:16px}
.cart-price{font-size:12px; color:rgba(44,26,14,.6); margin:2px 0 8px}
.qty{display:flex; align-items:center; gap:8px}
.qty button{width:28px; height:28px; border-radius:8px; background:rgba(44,26,14,.08); font-weight:700; font-size:14px; transition:background .2s}
.qty button:hover{background:rgba(44,26,14,.15)}
.qty .remove{width:auto; padding:0 10px; font-size:12px; color:rgba(44,26,14,.6); background:transparent; margin-left:auto}
.qty .remove:hover{color:#a94442; background:rgba(169,68,66,.08)}
.cart-foot{padding:18px 20px; border-top:1px solid rgba(44,26,14,.08); background:#fff}
.cart-totals{display:flex; flex-direction:column; gap:6px; margin-bottom:12px}
.cart-totals>div{display:flex; justify-content:space-between; font-size:13px}
.cart-sub{font-size:16px !important; font-weight:700; font-family:var(--font-display)}
.order-btn{width:100%; background:var(--soil); color:var(--parchment); padding:14px; border-radius:12px; font-weight:700; font-size:14px; letter-spacing:.04em; text-transform:uppercase; transition:transform .15s, background .2s}
.order-btn:hover{background:var(--soil-2); transform:translateY(-1px)}

/* Modal */
.modal-overlay{position:fixed; inset:0; background:rgba(44,26,14,.45); z-index:80; display:grid; place-items:center; padding:20px; animation:fade .25s ease}
@keyframes fade{from{opacity:0} to{opacity:1}}
.modal{background:var(--parchment); border-radius:18px; width:100%; max-width:440px; max-height:90vh; overflow:auto; box-shadow:var(--shadow); animation:rise .3s cubic-bezier(.2,.8,.2,1)}
.modal-lg{max-width:880px}
@keyframes rise{from{transform:translateY(20px); opacity:0} to{transform:translateY(0); opacity:1}}
.modal-head{display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border-bottom:1px solid rgba(44,26,14,.08)}
.modal-head h3{margin:0; font-family:var(--font-display); font-size:22px}
.form{padding:22px; display:flex; flex-direction:column; gap:12px}
.form label{display:flex; flex-direction:column; gap:6px; font-size:12px; font-weight:600; color:rgba(44,26,14,.7); text-transform:uppercase; letter-spacing:.05em}
.form-hint{margin:0 0 6px; font-size:13px; color:rgba(44,26,14,.65); background:rgba(212,168,71,.15); padding:10px 12px; border-radius:10px; text-transform:none; letter-spacing:0; font-weight:500}
.form-err{color:#a94442; font-size:13px; background:rgba(169,68,66,.08); padding:8px 12px; border-radius:8px}
.btn-link{align-self:center; font-size:13px; color:var(--leaf); text-decoration:underline; padding:6px}
.row2{display:grid; grid-template-columns:1fr 1fr; gap:12px}

/* Dashboard */
.dash{padding:18px 22px 24px}
.dash-tabs{display:flex; gap:8px; margin-bottom:16px}
.dash-tabs button{padding:10px 16px; border-radius:10px; font-weight:600; font-size:13px; background:rgba(44,26,14,.06); transition:all .2s}
.dash-tabs button.active{background:var(--soil); color:var(--parchment)}
.crud{display:grid; grid-template-columns:340px 1fr; gap:18px}
.crud-form{padding:18px; background:#fff; border-radius:14px; box-shadow:var(--shadow-sm)}
.crud-form h4{margin:0 0 10px; font-family:var(--font-display); font-size:18px}
.crud-list{display:flex; flex-direction:column; gap:8px; max-height:60vh; overflow:auto}
.crud-row{display:flex; align-items:center; gap:12px; padding:12px 14px; background:#fff; border-radius:12px; box-shadow:var(--shadow-sm)}
.crud-cell.grow{flex:1; min-width:0}
.big{font-size:32px}
.crud-title{font-weight:700; font-family:var(--font-display); font-size:16px; display:flex; align-items:center; gap:8px}
.crud-sub{font-size:12px; color:rgba(44,26,14,.6)}
.tag{font-size:11px; background:rgba(74,124,89,.12); color:var(--leaf); padding:2px 8px; border-radius:999px; font-weight:600}
.crud-actions{display:flex; gap:6px}
.crud-actions button{padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; background:rgba(44,26,14,.08); transition:background .2s}
.crud-actions button:hover{background:rgba(44,26,14,.15)}
.crud-actions .danger{background:rgba(169,68,66,.1); color:#a94442}
.crud-actions .danger:hover{background:rgba(169,68,66,.2)}

/* Toasts */
.toast-stack{position:fixed; top:80px; right:24px; z-index:100; display:flex; flex-direction:column; gap:10px; max-width:340px}
.toast{background:var(--soil); color:var(--parchment); padding:12px 16px; border-radius:12px; font-size:13px; box-shadow:var(--shadow); animation:slideIn .25s ease; border-left:4px solid var(--leaf)}
.toast-error{border-left-color:#a94442}
.toast-info{border-left-color:var(--gold)}
@keyframes slideIn{from{transform:translateX(20px); opacity:0} to{transform:translateX(0); opacity:1}}

/* Footer */
.footer{max-width:1200px; margin:40px auto 0; padding:30px 22px; border-top:1px solid rgba(44,26,14,.1); text-align:center; font-family:var(--font-display); font-size:16px}
.footer .muted{font-family:var(--font-body); font-size:12px; color:rgba(44,26,14,.5); margin-top:6px}

/* Responsive */
@media (max-width: 820px){
  .crud{grid-template-columns:1fr}
  .hero-crate{display:none}
  .nav-search{display:block; order:3; flex-basis:100%; margin:8px 0 0}
  .nav-search input{padding:8px 14px}
}
@media (max-width: 540px){
  .cart{width:100%}
  .hero{padding:36px 18px 56px}
  .row2{grid-template-columns:1fr}
  .toast-stack{right:12px; left:12px; max-width:none}
  .farmer-card{flex-basis:170px}
  .section-head h2{font-size:24px}
}
`}</style>
  );
}
