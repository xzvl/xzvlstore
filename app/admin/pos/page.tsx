"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { DbProduct, Taxonomy } from "@/lib/supabase";
import type { SiteContent } from "@/lib/site-content";
import { DEFAULT_CATEGORY_ICON } from "@/lib/site-content";
import { sizedImageUrl } from "@/lib/image-sizes";

type CartLine = { product: DbProduct; qty: number };
type CategoryNavOption = Taxonomy & { icon: string };

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const unitPrice = (p: DbProduct) => p.sale_price ?? p.price;
const thumbOf = (p: DbProduct) => p.main_image ?? (p.image || null);

const NAV_BTN =
  "flex flex-col items-center justify-center gap-1 flex-shrink-0 w-[70px] lg:w-full py-2.5 px-1 font-mono text-[9px] tracking-wide uppercase border transition-colors";
const NAV_BTN_ACTIVE = "border-primary bg-primary/10 text-primary";
const NAV_BTN_INACTIVE = "border-[#603e39]/30 text-[#ebbbb4]/50 hover:border-[#603e39]/60 hover:text-[#e2e2e2]";

const CHIP =
  "px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-colors flex-shrink-0";
const CHIP_ACTIVE = "border-primary bg-primary/10 text-primary";
const CHIP_INACTIVE = "border-[#603e39]/40 text-[#ebbbb4]/40 hover:border-[#ebbbb4]/30 hover:text-[#ebbbb4]/70";

// A product matches a filter/nav entry if the entry's taxonomy id shows up in
// whichever field applies to its type — brand, category or tag.
const matchesTaxonomy = (p: DbProduct, id: string) =>
  p.brand_id === id || !!p.category_ids?.includes(id) || !!p.tag_ids?.includes(id);

export default function AdminPosPage() {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [activeBrand, setActiveBrand] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [cash, setCash] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [lastSale, setLastSale] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/taxonomy").then((r) => r.json()),
      fetch("/api/admin/site-content", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([productsData, taxonomyData, contentData]: [DbProduct[], Taxonomy[], SiteContent]) => {
        setProducts(productsData);
        setTaxonomy(taxonomyData);
        setContent(contentData);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter options (admin-configured order, falling back to "show everything") ──
  const brandOptions: Taxonomy[] = useMemo(() => {
    if (!content?.pos.brandFilters.length) {
      return taxonomy.filter((t) => t.type === "brand").sort((a, b) => a.name.localeCompare(b.name));
    }
    return content.pos.brandFilters.flatMap((f) => {
      const t = taxonomy.find((x) => x.id === f.taxonomyId);
      return t ? [t] : [];
    });
  }, [content, taxonomy]);

  const categoryOptions: CategoryNavOption[] = useMemo(() => {
    if (!content?.pos.categoryNav.length) {
      return taxonomy
        .filter((t) => t.type === "category")
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ ...c, icon: DEFAULT_CATEGORY_ICON }));
    }
    return content.pos.categoryNav.flatMap((n) => {
      const t = taxonomy.find((x) => x.id === n.taxonomyId);
      return t ? [{ ...t, icon: n.icon }] : [];
    });
  }, [content, taxonomy]);

  // ── Product grid ──────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (p.status !== "active") return false;
      if (p.pre_order || p.sneak_peek) return false;
      if (activeBrand !== "all" && !matchesTaxonomy(p, activeBrand)) return false;
      if (activeCategory !== "all" && !matchesTaxonomy(p, activeCategory)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeBrand, activeCategory]);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addToCart = (p: DbProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === p.id);
      if (idx === -1) return p.stock > 0 ? [...prev, { product: p, qty: 1 }] : prev;
      const line = prev[idx];
      if (line.qty >= p.stock) return prev;
      const next = [...prev];
      next[idx] = { ...line, qty: line.qty + 1 };
      return next;
    });
  };

  const incQty = (id: string) =>
    setCart((prev) => prev.map((l) => (l.product.id === id && l.qty < l.product.stock ? { ...l, qty: l.qty + 1 } : l)));

  const decQty = (id: string) =>
    setCart((prev) => prev.flatMap((l) => {
      if (l.product.id !== id) return [l];
      return l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }];
    }));

  const removeItem = (id: string) => setCart((prev) => prev.filter((l) => l.product.id !== id));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((s, l) => s + unitPrice(l.product) * l.qty, 0);
  const total = subtotal;
  const cashNum = parseFloat(cash) || 0;
  const change = cashNum - total;
  const canCheckout = cart.length > 0 && cashNum >= total && !checkingOut;

  const checkout = async () => {
    if (!canCheckout) return;
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const items = cart.map((l) => ({
        product_id: l.product.id,
        product: l.product.name,
        qty: l.qty,
        unit_price: unitPrice(l.product),
        subtotal: unitPrice(l.product) * l.qty,
      }));
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName.trim() || "Walk-in Customer",
          email: "",
          phone: "",
          location: "In-Store",
          status: "completed",
          payment_method: "Cash",
          delivery_method: "Pickup",
          discount: 0,
          down_payment: total,
          estimated_total: total,
          items,
          notes: ["POS sale"],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to complete sale.");

      setProducts((prev) =>
        prev.map((p) => {
          const line = cart.find((l) => l.product.id === p.id);
          return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
        })
      );
      setLastSale(json.order_number ? `#${json.order_number}` : "complete");
      setCart([]);
      setCash("");
      setCustomerName("");
      setTimeout(() => setLastSale(null), 6000);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loadError) {
    return <p className="font-mono text-[12px] text-primary py-8">Failed to load the Point of Sale.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-10">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">ADMIN // POINT OF SALE</p>
        <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Point of Sale</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Category side nav */}
        <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 w-full lg:w-[76px] flex-shrink-0 scrollbar-none">
          <button onClick={() => setActiveCategory("all")} className={`${NAV_BTN} ${activeCategory === "all" ? NAV_BTN_ACTIVE : NAV_BTN_INACTIVE}`}>
            <span className="material-symbols-outlined text-[20px]">apps</span>
            <span className="truncate max-w-[60px]">All</span>
          </button>
          {categoryOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              title={c.name}
              className={`${NAV_BTN} ${activeCategory === c.id ? NAV_BTN_ACTIVE : NAV_BTN_INACTIVE}`}
            >
              <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
              <span className="truncate max-w-[60px]">{c.name}</span>
            </button>
          ))}
        </nav>

        {/* Middle: customer / search / filters / grid */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#603e39]/40 focus-within:border-primary px-4 py-2.5 transition-colors flex-1">
              <span className="material-symbols-outlined text-[#ebbbb4]/30 text-[16px]">person</span>
              <input
                type="text"
                placeholder="Customer name (optional)…"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 bg-transparent text-[#e2e2e2] font-mono text-[12px] focus:outline-none placeholder:text-[#ebbbb4]/20"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#603e39]/40 focus-within:border-primary px-4 py-2.5 transition-colors flex-1">
              <span className="material-symbols-outlined text-[#ebbbb4]/30 text-[16px]">search</span>
              <input
                type="text"
                placeholder="Search product by name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[#e2e2e2] font-mono text-[12px] focus:outline-none placeholder:text-[#ebbbb4]/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-[#ebbbb4]/30 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button onClick={() => setActiveBrand("all")} className={`${CHIP} ${activeBrand === "all" ? CHIP_ACTIVE : CHIP_INACTIVE}`}>
              All
            </button>
            {brandOptions.map((b) => (
              <button key={b.id} onClick={() => setActiveBrand(b.id)} className={`${CHIP} ${activeBrand === b.id ? CHIP_ACTIVE : CHIP_INACTIVE}`}>
                {b.name}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 font-mono text-[12px] text-[#ebbbb4]/30">No products match the current filters.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const line = cart.find((l) => l.product.id === p.id);
                const outOfStock = p.stock <= 0;
                const atLimit = !!line && line.qty >= p.stock;
                const thumb = thumbOf(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock || atLimit}
                    className={`group relative flex flex-col bg-[#1a1a1a] border text-left transition-colors ${
                      line ? "border-primary/60" : "border-[#603e39]/30 hover:border-[#603e39]/60"
                    } ${outOfStock || atLimit ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="relative w-full aspect-square bg-[#111] border-b border-[#603e39]/20 overflow-hidden">
                      {thumb ? (
                        <Image
                          src={sizedImageUrl(thumb, "thumbnail") ?? thumb}
                          alt={p.name}
                          fill
                          sizes="160px"
                          className="object-cover"
                          onError={(e) => {
                            if (e.currentTarget.src !== thumb) e.currentTarget.src = thumb;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[28px] text-[#ebbbb4]/20">image</span>
                        </div>
                      )}
                      {line && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center bg-primary text-white font-mono text-[10px] font-bold rounded-full">
                          {line.qty}
                        </span>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <span className="font-mono text-[9px] tracking-widest uppercase text-primary">Out of stock</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="font-inter font-bold text-[11px] text-[#e2e2e2] leading-tight line-clamp-2 min-h-[28px]">{p.name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono text-[12px] font-bold text-primary">₱{unitPrice(p).toLocaleString()}</p>
                        {p.sale_price && <p className="font-mono text-[10px] text-[#ebbbb4]/30 line-through">₱{p.price.toLocaleString()}</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <aside className="w-full lg:w-[340px] flex-shrink-0 bg-[#1a1a1a] border border-[#603e39]/30 flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#603e39]/30">
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
              Cart {cart.length > 0 && <span className="text-[#ebbbb4]/40">({cart.length})</span>}
            </p>
            {cart.length > 0 && (
              <button onClick={clearCart} className="font-mono text-[10px] text-[#ebbbb4]/30 hover:text-primary transition-colors">
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#603e39]/15 min-h-[120px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="material-symbols-outlined text-[28px] text-[#ebbbb4]/15">shopping_cart</span>
                <p className="font-mono text-[11px] text-[#ebbbb4]/30">Tap a product to add it to the cart.</p>
              </div>
            ) : (
              cart.map((l) => {
                const thumb = thumbOf(l.product);
                return (
                  <div key={l.product.id} className="flex items-center gap-2.5 px-4 py-3">
                    <div className="relative w-10 h-10 flex-shrink-0 bg-[#111] border border-[#603e39]/20 overflow-hidden">
                      {thumb ? (
                        <Image
                          src={sizedImageUrl(thumb, "small") ?? thumb}
                          alt={l.product.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                          onError={(e) => {
                            if (e.currentTarget.src !== thumb) e.currentTarget.src = thumb;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] text-[#ebbbb4]/20">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter font-bold text-[11px] text-[#e2e2e2] leading-tight truncate">{l.product.name}</p>
                      <p className="font-mono text-[11px] text-primary font-bold">₱{unitPrice(l.product).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => decQty(l.product.id)}
                        className="w-6 h-6 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/60 hover:border-primary hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px]">remove</span>
                      </button>
                      <span className="font-mono text-[12px] text-[#e2e2e2] w-5 text-center">{l.qty}</span>
                      <button
                        onClick={() => incQty(l.product.id)}
                        disabled={l.qty >= l.product.stock}
                        className="w-6 h-6 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/60 hover:border-primary hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[13px]">add</span>
                      </button>
                    </div>
                    <button onClick={() => removeItem(l.product.id)} className="flex-shrink-0 text-[#ebbbb4]/30 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-[#603e39]/30 p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[12px]">
                <span className="text-[#ebbbb4]/50">Subtotal</span>
                <span className="text-[#e2e2e2]">{peso(subtotal)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1.5 border-t border-[#603e39]/20">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#ebbbb4]/50">Total</span>
                <span className="font-inter font-black text-[22px] text-primary">{peso(total)}</span>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">Cash</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
                />
                <button
                  type="button"
                  onClick={() => setCash(total > 0 ? String(total) : "")}
                  disabled={total <= 0}
                  className="px-3 py-2.5 font-mono text-[10px] tracking-widest uppercase border border-[#603e39]/40 text-[#ebbbb4]/50 hover:border-primary hover:text-primary transition-colors disabled:opacity-30"
                >
                  Exact
                </button>
              </div>
            </div>

            <div className="flex justify-between font-mono text-[12px]">
              <span className="text-[#ebbbb4]/50">Change</span>
              <span className={`font-bold ${change < 0 ? "text-primary" : "text-green-400"}`}>{peso(Math.max(0, change))}</span>
            </div>

            {checkoutError && <p className="font-mono text-[11px] text-red-400">{checkoutError}</p>}
            {lastSale && (
              <p className="font-mono text-[11px] text-green-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Sale {lastSale} completed.
              </p>
            )}

            <button
              onClick={checkout}
              disabled={!canCheckout}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {checkingOut ? (
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              )}
              {checkingOut ? "Processing…" : "Checkout"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
