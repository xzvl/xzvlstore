// Imported by client components (HeroSlider, the /admin/content tab editors)
// as well as server code, so it must stay free of any import that pulls in
// lib/supabase.ts (the service-role client). The data-fetching function
// lives in lib/get-site-content.ts (server code only) instead.

// ─── Hero ───────────────────────────────────────────────────────────────────

export type HeroSlide = {
  id: string;
  /** Small mono line above the title, e.g. "XZVL.STORE // 2026". */
  tag: string;
  /** First title line, rendered in the slide's text color. */
  titleWhite: string;
  /** Second title line, rendered red. */
  titleRed: string;
  /** Short description under the title. */
  description: string;
  /** Empty label = no button. */
  buttonLabel: string;
  buttonLink: string;
  /** Foreground image shown on the right side (desktop). */
  image: string;
  /** Full-bleed background image behind the slide. Empty = none. */
  background: string;
  /**
   * Per theme mode: the solid color behind everything (and the fade that blends
   * the images in), and the color of the title's first line, description and controls.
   */
  colors: Record<ThemeMode, HeroSlideColors>;
};

export type HeroSlideColors = { background: string; text: string };

const DEFAULT_SLIDE_COLORS: Record<ThemeMode, HeroSlideColors> = {
  dark: { background: "#0e0e0e", text: "#e2e2e2" },
  light: { background: "#ececec", text: "#161616" },
};

export type HeroContent = {
  slides: HeroSlide[];
};

export const DEFAULT_HERO: HeroContent = {
  slides: [
    {
      id: "slide-1",
      tag: "XZVL.STORE // 2026",
      titleWhite: "Beyblade X",
      titleRed: "The Next Generation",
      description:
        "Discover the Beyblade X. Authentic products from Takara Tomy and Hasbro, delivered to your door across the Philippines.",
      buttonLabel: "Shop Now",
      buttonLink: "/collection/all",
      image: "/assets/shop-v2.webp",
      background: "",
      colors: DEFAULT_SLIDE_COLORS,
    },
    {
      id: "slide-2",
      tag: "EXCLUSIVE // PRE-ORDER",
      titleWhite: "Secure Your",
      titleRed: "Next Blade",
      description:
        "Pre-order the latest releases before they sell out. Lock in your price today and get your Beyblade delivered on release day.",
      buttonLabel: "Pre-Order Now",
      buttonLink: "/pre-order",
      image: "/assets/new-releases-v2.webp",
      background: "",
      colors: DEFAULT_SLIDE_COLORS,
    },
    {
      id: "slide-3",
      tag: "PREMIUM // COLLECTION",
      titleWhite: "Takara Tomy",
      titleRed: "Official Series",
      description:
        "The official Japanese Beyblade brand trusted by champions worldwide. Browse our full Takara Tomy collection featuring BX, CX, and limited editions.",
      buttonLabel: "Browse Collection",
      buttonLink: "/collection/takara-tomy",
      image: "/assets/takara-tomy-v2.webp",
      background: "",
      colors: DEFAULT_SLIDE_COLORS,
    },
  ],
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const isHexColor = (v: unknown): v is string => typeof v === "string" && HEX_COLOR.test(v);

// Links are rendered as <a href>, so only same-site paths/anchors and plain
// web/mail URLs are allowed (no `javascript:` etc.).
export const isSafeHref = (v: string) => /^(\/|#|https?:\/\/|mailto:)/i.test(v);

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

function normalizeSlide(raw: unknown, def: HeroSlide): HeroSlide {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const link = str(s.buttonLink, def.buttonLink).trim();
  return {
    id: def.id,
    tag: str(s.tag, def.tag),
    titleWhite: str(s.titleWhite, def.titleWhite),
    titleRed: str(s.titleRed, def.titleRed),
    description: str(s.description, def.description),
    buttonLabel: str(s.buttonLabel, def.buttonLabel),
    buttonLink: isSafeHref(link) ? link : def.buttonLink,
    image: str(s.image, def.image),
    background: str(s.background, def.background),
    colors: normalizeSlideColors(s, def.colors),
  };
}

function normalizeSlideColors(s: Record<string, unknown>, def: HeroSlide["colors"]): HeroSlide["colors"] {
  const c = (s.colors && typeof s.colors === "object" ? s.colors : {}) as Record<string, unknown>;
  const pick = (mode: ThemeMode): HeroSlideColors => {
    const m = (c[mode] && typeof c[mode] === "object" ? c[mode] : {}) as Record<string, unknown>;
    // Slides saved before per-mode colors had a single backgroundColor: keep it as the dark one.
    const legacyBg = mode === "dark" ? s.backgroundColor : undefined;
    return {
      background: isHexColor(m.background) ? m.background : isHexColor(legacyBg) ? legacyBg : def[mode].background,
      text: isHexColor(m.text) ? m.text : def[mode].text,
    };
  };
  return { dark: pick("dark"), light: pick("light") };
}

// Always yields exactly DEFAULT_HERO.slides.length slides, with any missing or
// malformed field falling back to the default for that slide — so a partial or
// hand-edited row can never break the homepage.
export function normalizeHero(raw: unknown): HeroContent {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { slides?: unknown }).slides)
    ? ((raw as { slides: unknown[] }).slides)
    : [];
  return { slides: DEFAULT_HERO.slides.map((def, i) => normalizeSlide(list[i], def)) };
}

// Strict check used when saving from /admin/content: rejects bad input with a
// message instead of silently correcting it.
export function validateHero(raw: unknown): { ok: true; value: HeroContent } | { ok: false; error: string } {
  const list = raw && typeof raw === "object" ? (raw as { slides?: unknown }).slides : undefined;
  if (!Array.isArray(list) || list.length !== DEFAULT_HERO.slides.length) {
    return { ok: false, error: `Expected ${DEFAULT_HERO.slides.length} slides.` };
  }
  for (let i = 0; i < list.length; i++) {
    const s = (list[i] && typeof list[i] === "object" ? list[i] : {}) as Record<string, unknown>;
    const n = i + 1;
    const colors = (s.colors && typeof s.colors === "object" ? s.colors : {}) as Record<string, unknown>;
    for (const mode of THEME_MODES) {
      const m = (colors[mode] && typeof colors[mode] === "object" ? colors[mode] : {}) as Record<string, unknown>;
      if (!isHexColor(m.background) || !isHexColor(m.text)) {
        return { ok: false, error: `Slide ${n}: ${mode} mode colors must be hex values like #0e0e0e.` };
      }
    }
    const label = str(s.buttonLabel, "").trim();
    if (label && !isSafeHref(str(s.buttonLink, "").trim())) {
      return { ok: false, error: `Slide ${n}: button link must start with "/", "#", "http://", "https://" or "mailto:".` };
    }
  }
  return { ok: true, value: normalizeHero(raw) };
}

// ─── Shared bits ────────────────────────────────────────────────────────────

export type NavLink = { label: string; href: string };

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

// External links (social profiles) must be absolute — same-site paths make no sense there.
export const isSafeExternalUrl = (v: string) => /^(https?:\/\/|mailto:)/i.test(v);

const MAX_LINKS = 20;

function normalizeNavLinks(raw: unknown, fallback: NavLink[]): NavLink[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.flatMap((l) => {
    const o = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    const label = str(o.label, "").trim();
    const href = str(o.href, "").trim();
    return label && isSafeHref(href) ? [{ label, href }] : [];
  });
}

function validateNavLinks(raw: unknown, where: string): string | null {
  if (!Array.isArray(raw)) return `${where}: links must be a list.`;
  if (raw.length > MAX_LINKS) return `${where}: at most ${MAX_LINKS} links.`;
  for (let i = 0; i < raw.length; i++) {
    const o = (raw[i] && typeof raw[i] === "object" ? raw[i] : {}) as Record<string, unknown>;
    if (!str(o.label, "").trim()) return `${where} link ${i + 1}: label is required.`;
    if (!isSafeHref(str(o.href, "").trim())) {
      return `${where} link ${i + 1}: link must start with "/", "#", "http://", "https://" or "mailto:".`;
    }
  }
  return null;
}

// ─── Branding ───────────────────────────────────────────────────────────────

export type BrandingContent = {
  /** Empty = the built-in "xzvl.store" text logo. */
  logoImageUrl: string;
  /** Shown instead of the one above when the storefront is in dark mode. Empty = always use logoImageUrl. */
  logoImageUrlDark: string;
  /** Empty = the default /assets/favicon.webp. */
  faviconUrl: string;
  /** Shown instead of the one above when /admin is in dark mode (set in Colors → Default mode). Empty = always use faviconUrl. */
  faviconUrlDark: string;
  /** "From" address for every email this store sends. Empty = the RESEND_FROM env var, then a built-in default. */
  systemEmail: string;
  /** Receives the "New Order"/"New Pre-Order" admin notifications. Empty = xzviel@gmail.com. */
  orderEmail: string;
  /** Shown as a contact email in the storefront footer. Empty = hidden. */
  websiteEmail: string;
};

export const DEFAULT_BRANDING: BrandingContent = {
  logoImageUrl: "", logoImageUrlDark: "", faviconUrl: "", faviconUrlDark: "",
  systemEmail: "", orderEmail: "", websiteEmail: "",
};

const isImageUrl = (v: string) => v === "" || /^(\/|https?:\/\/)/i.test(v);
export const isEmailOrEmpty = (v: string) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function normalizeBranding(raw: unknown): BrandingContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const logo = str(o.logoImageUrl, "").trim();
  const logoDark = str(o.logoImageUrlDark, "").trim();
  const fav = str(o.faviconUrl, "").trim();
  const favDark = str(o.faviconUrlDark, "").trim();
  const systemEmail = str(o.systemEmail, "").trim();
  const orderEmail = str(o.orderEmail, "").trim();
  const websiteEmail = str(o.websiteEmail, "").trim();
  return {
    logoImageUrl: isImageUrl(logo) ? logo : "",
    logoImageUrlDark: isImageUrl(logoDark) ? logoDark : "",
    faviconUrl: isImageUrl(fav) ? fav : "",
    faviconUrlDark: isImageUrl(favDark) ? favDark : "",
    systemEmail: isEmailOrEmpty(systemEmail) ? systemEmail : "",
    orderEmail: isEmailOrEmpty(orderEmail) ? orderEmail : "",
    websiteEmail: isEmailOrEmpty(websiteEmail) ? websiteEmail : "",
  };
}

function validateBranding(raw: unknown): Validation<BrandingContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!isImageUrl(str(o.logoImageUrl, "").trim())) return { ok: false, error: "Logo must be an uploaded image." };
  if (!isImageUrl(str(o.logoImageUrlDark, "").trim())) return { ok: false, error: "Alternative logo must be an uploaded image." };
  if (!isImageUrl(str(o.faviconUrl, "").trim())) return { ok: false, error: "Favicon must be an uploaded image." };
  if (!isImageUrl(str(o.faviconUrlDark, "").trim())) return { ok: false, error: "Alternative favicon must be an uploaded image." };
  if (!isEmailOrEmpty(str(o.systemEmail, "").trim())) return { ok: false, error: "System email must be a valid email address." };
  if (!isEmailOrEmpty(str(o.orderEmail, "").trim())) return { ok: false, error: "Order email must be a valid email address." };
  if (!isEmailOrEmpty(str(o.websiteEmail, "").trim())) return { ok: false, error: "Website email must be a valid email address." };
  return { ok: true, value: normalizeBranding(raw) };
}

// ─── Header ─────────────────────────────────────────────────────────────────

export type HeaderContent = {
  navLinks: NavLink[];
};

export const DEFAULT_HEADER: HeaderContent = {
  navLinks: [
    { href: "/collection/all", label: "All Products" },
    { href: "/collection/new-releases", label: "New Arrivals" },
    { href: "/collection/takara-tomy", label: "Takara Tomy" },
    { href: "/collection/hasbro", label: "Hasbro" },
    { href: "/pre-order", label: "Pre-Order" },
  ],
};

function normalizeHeader(raw: unknown): HeaderContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { navLinks: normalizeNavLinks(o.navLinks, DEFAULT_HEADER.navLinks) };
}

function validateHeader(raw: unknown): Validation<HeaderContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const err = validateNavLinks(o.navLinks, "Header");
  return err ? { ok: false, error: err } : { ok: true, value: normalizeHeader(raw) };
}

// ─── Footer ─────────────────────────────────────────────────────────────────

export const SOCIAL_PLATFORMS = ["facebook", "youtube", "instagram", "tiktok", "other"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLink = { platform: SocialPlatform; url: string };

export type FooterContent = {
  description: string;
  navLinks: NavLink[];
  socialLinks: SocialLink[];
  /** Small line under the social icons. */
  socialNote: string;
  /** Bottom bar: copyright text on the left… */
  bottomText: string;
  /** …and the tagline (with the pulsing dot) on the right. */
  bottomTagline: string;
};

export const DEFAULT_FOOTER: FooterContent = {
  description:
    "Your go-to source for authentic Beyblade products in the Philippines. Pre-order the latest releases and get them delivered to your door.",
  navLinks: [
    { href: "/collection/new-releases", label: "New Arrivals" },
    { href: "/collection/takara-tomy", label: "Takara Tomy" },
    { href: "/collection/hasbro", label: "Hasbro" },
    { href: "/pre-order", label: "Pre-Order" },
    { href: "/account", label: "My Account" },
  ],
  socialLinks: [
    { platform: "facebook", url: "https://www.facebook.com/xzviel/" },
    { platform: "youtube", url: "https://www.youtube.com/@xzviel" },
    { platform: "instagram", url: "https://www.instagram.com/xzviel/" },
    { platform: "tiktok", url: "https://www.tiktok.com/@xzvl4324" },
  ],
  socialNote: "For inquiries, reach us via our social media channels.",
  bottomText: "© 2026 xzvl.store — All rights reserved",
  bottomTagline: "Philippines",
};

function normalizeSocialLinks(raw: unknown, fallback: SocialLink[]): SocialLink[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.flatMap((l) => {
    const o = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    const url = str(o.url, "").trim();
    if (!isSafeExternalUrl(url)) return [];
    const platform = SOCIAL_PLATFORMS.includes(o.platform as SocialPlatform) ? (o.platform as SocialPlatform) : "other";
    return [{ platform, url }];
  });
}

function normalizeFooter(raw: unknown): FooterContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    description: str(o.description, DEFAULT_FOOTER.description),
    navLinks: normalizeNavLinks(o.navLinks, DEFAULT_FOOTER.navLinks),
    socialLinks: normalizeSocialLinks(o.socialLinks, DEFAULT_FOOTER.socialLinks),
    socialNote: str(o.socialNote, DEFAULT_FOOTER.socialNote),
    bottomText: str(o.bottomText, DEFAULT_FOOTER.bottomText),
    bottomTagline: str(o.bottomTagline, DEFAULT_FOOTER.bottomTagline),
  };
}

function validateFooter(raw: unknown): Validation<FooterContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const navErr = validateNavLinks(o.navLinks, "Footer");
  if (navErr) return { ok: false, error: navErr };

  if (!Array.isArray(o.socialLinks)) return { ok: false, error: "Social links must be a list." };
  if (o.socialLinks.length > MAX_LINKS) return { ok: false, error: `Social links: at most ${MAX_LINKS}.` };
  for (let i = 0; i < o.socialLinks.length; i++) {
    const l = (o.socialLinks[i] && typeof o.socialLinks[i] === "object" ? o.socialLinks[i] : {}) as Record<string, unknown>;
    if (!isSafeExternalUrl(str(l.url, "").trim())) {
      return { ok: false, error: `Social link ${i + 1}: URL must start with "https://", "http://" or "mailto:".` };
    }
  }
  return { ok: true, value: normalizeFooter(raw) };
}

// ─── Point of Sale ──────────────────────────────────────────────────────────
// References taxonomy rows by id only (never a copied name), so renaming an
// entry in /admin/taxonomy is reflected in the POS automatically. Each entry
// can be a brand, category or tag — a product matches a filter chip/nav item
// if its brand_id, category_ids or tag_ids contains that id, whichever applies.

/** A taxonomy entry (any type) shown as a quick-filter chip in the POS, in order. */
export type PosBrandFilter = { taxonomyId: string };
/** A taxonomy entry (any type) shown in the POS side nav, with its icon. */
export type PosCategoryNavItem = { taxonomyId: string; icon: string };

export type PosContent = {
  /** Empty = fall back to showing every brand, alphabetically. */
  brandFilters: PosBrandFilter[];
  /** Empty = fall back to showing every category with a default icon. */
  categoryNav: PosCategoryNavItem[];
};

export const DEFAULT_POS: PosContent = { brandFilters: [], categoryNav: [] };

export const DEFAULT_CATEGORY_ICON = "category";
// Material Symbols names are lowercase letters/digits/underscores only.
const ICON_NAME = /^[a-z0-9_]+$/;

function normalizePos(raw: unknown): PosContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const brandFilters = Array.isArray(o.brandFilters)
    ? o.brandFilters.flatMap((b) => {
        const id = str((b && typeof b === "object" ? (b as Record<string, unknown>).taxonomyId : ""), "").trim();
        return id ? [{ taxonomyId: id }] : [];
      })
    : [];
  const categoryNav = Array.isArray(o.categoryNav)
    ? o.categoryNav.flatMap((c) => {
        const r = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
        const id = str(r.taxonomyId, "").trim();
        if (!id) return [];
        const icon = str(r.icon, "").trim();
        return [{ taxonomyId: id, icon: ICON_NAME.test(icon) ? icon : DEFAULT_CATEGORY_ICON }];
      })
    : [];
  return { brandFilters, categoryNav };
}

function validatePos(raw: unknown): Validation<PosContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!Array.isArray(o.brandFilters)) return { ok: false, error: "Brand filters must be a list." };
  if (!Array.isArray(o.categoryNav)) return { ok: false, error: "Category nav must be a list." };
  for (let i = 0; i < o.categoryNav.length; i++) {
    const r = (o.categoryNav[i] && typeof o.categoryNav[i] === "object" ? o.categoryNav[i] : {}) as Record<string, unknown>;
    const icon = str(r.icon, "").trim();
    if (icon && !ICON_NAME.test(icon)) {
      return { ok: false, error: `Category ${i + 1}: icon must be a Material Symbols name (lowercase letters, numbers, underscores).` };
    }
  }
  return { ok: true, value: normalizePos(raw) };
}

// ─── Maintenance ────────────────────────────────────────────────────────────
// When enabled, every storefront page renders the maintenance screen instead
// (see components/MaintenanceGate.tsx). /admin is never affected.

export type MaintenanceContent = {
  enabled: boolean;
  /** Small mono line above the title. */
  tag: string;
  title: string;
  message: string;
  /** Optional image shown above the text. Empty = none. */
  image: string;
  /** Show the footer's social links under the message. */
  showSocialLinks: boolean;
};

export const DEFAULT_MAINTENANCE: MaintenanceContent = {
  enabled: false,
  tag: "// System Maintenance",
  title: "We'll Be Right Back",
  message: "xzvl.store is currently undergoing scheduled maintenance. Please check back soon.",
  image: "",
  showSocialLinks: true,
};

function normalizeMaintenance(raw: unknown): MaintenanceContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const image = str(o.image, "").trim();
  return {
    enabled: o.enabled === true,
    tag: str(o.tag, DEFAULT_MAINTENANCE.tag),
    title: str(o.title, DEFAULT_MAINTENANCE.title),
    message: str(o.message, DEFAULT_MAINTENANCE.message),
    image: isImageUrl(image) ? image : "",
    showSocialLinks: typeof o.showSocialLinks === "boolean" ? o.showSocialLinks : DEFAULT_MAINTENANCE.showSocialLinks,
  };
}

function validateMaintenance(raw: unknown): Validation<MaintenanceContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") return { ok: false, error: "Maintenance mode must be on or off." };
  if (!str(o.title, "").trim()) return { ok: false, error: "Title is required." };
  if (!isImageUrl(str(o.image, "").trim())) return { ok: false, error: "Image must be an uploaded image." };
  return { ok: true, value: normalizeMaintenance(raw) };
}

// ─── Payment ────────────────────────────────────────────────────────────────
// Payment methods offered at /checkout and on the pre-order form. The default
// method is the one shown first on the pre-order form when a product requires
// a down payment. Only enabled methods are shown on the storefront.

export type PaymentMethod = {
  id: string;
  enabled: boolean;
  isDefault: boolean;
  /** e.g. "GCash", "BDO", "Maya". Also stored as the order's payment_method. */
  company: string;
  accountNumber: string;
  accountName: string;
  /** Uploaded QR code image. Empty = none. */
  qrCode: string;
};

/** Copy shown on the /pre-order form, editable in /admin/content → Payment. */
export type PreOrderContent = {
  /** Heading of the policy box. */
  policyTitle: string;
  /** Rich-text (HTML) body of the policy box. */
  policy: string;
};

export type PaymentContent = { methods: PaymentMethod[]; preOrder: PreOrderContent };

export const DEFAULT_PRE_ORDER: PreOrderContent = {
  policyTitle: "Pre-Order Policy",
  policy:
    "<p>Pre-orders <strong>cannot be cancelled</strong> once placed. Your reservation will only be voided if the total number of pre-orders does not meet the required allocation.</p>",
};

export const DEFAULT_PAYMENT: PaymentContent = { methods: [], preOrder: DEFAULT_PRE_ORDER };

const MAX_PAYMENT_METHODS = 20;

export const newPaymentMethodId = () => `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function normalizePreOrder(raw: unknown): PreOrderContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    policyTitle: str(o.policyTitle, DEFAULT_PRE_ORDER.policyTitle).trim() || DEFAULT_PRE_ORDER.policyTitle,
    policy: typeof o.policy === "string" ? o.policy : DEFAULT_PRE_ORDER.policy,
  };
}

function normalizePayment(raw: unknown): PaymentContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const methods: PaymentMethod[] = Array.isArray(o.methods)
    ? o.methods.flatMap((m, i) => {
        const r = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
        const company = str(r.company, "").trim();
        if (!company) return [];
        const qr = str(r.qrCode, "").trim();
        return [{
          id: str(r.id, "").trim() || `pm-${i}`,
          enabled: r.enabled !== false,
          isDefault: r.isDefault === true,
          company,
          accountNumber: str(r.accountNumber, "").trim(),
          accountName: str(r.accountName, "").trim(),
          qrCode: isImageUrl(qr) ? qr : "",
        }];
      })
    : [];
  // At most one default — keep the first one flagged.
  const firstDefault = methods.findIndex((m) => m.isDefault);
  return {
    methods: methods.map((m, i) => ({ ...m, isDefault: i === firstDefault })),
    preOrder: normalizePreOrder(o.preOrder),
  };
}

function validatePayment(raw: unknown): Validation<PaymentContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!Array.isArray(o.methods)) return { ok: false, error: "Payment methods must be a list." };
  if (o.methods.length > MAX_PAYMENT_METHODS) return { ok: false, error: `At most ${MAX_PAYMENT_METHODS} payment methods.` };
  for (let i = 0; i < o.methods.length; i++) {
    const r = (o.methods[i] && typeof o.methods[i] === "object" ? o.methods[i] : {}) as Record<string, unknown>;
    if (!str(r.company, "").trim()) return { ok: false, error: `Payment method ${i + 1}: company is required.` };
    if (!isImageUrl(str(r.qrCode, "").trim())) return { ok: false, error: `Payment method ${i + 1}: QR code must be an uploaded image.` };
  }
  return { ok: true, value: normalizePayment(raw) };
}

/** Enabled methods, with the default one first. */
export function activePaymentMethods(payment: PaymentContent): PaymentMethod[] {
  const enabled = payment.methods.filter((m) => m.enabled);
  return [...enabled.filter((m) => m.isDefault), ...enabled.filter((m) => !m.isDefault)];
}

// ─── Shipping ───────────────────────────────────────────────────────────────
// J&T Express settings used by /checkout and /pre-order: the province/city
// pickers read {jntApiEndpoint}/website/base/info/area and the shipping fee is
// quoted from {jntApiEndpoint}/website/fee/findRates (see lib/jnt.ts).

export type ShippingContent = {
  /** Base URL of the J&T Express website API, e.g. https://ylofficialjw.jtexpress.ph */
  jntApiEndpoint: string;
  /** J&T area name the parcels ship from, e.g. "PAMPANGA-SAN-FERNANDO-CITY". */
  senderAddr: string;
  /** J&T service type sent as productType ("EZ" = standard). */
  productType: string;
  /** Shown to customers who choose pickup (where/when to pick up). */
  pickupNote: string;
};

export const DEFAULT_SHIPPING: ShippingContent = {
  jntApiEndpoint: "https://ylofficialjw.jtexpress.ph",
  senderAddr: "PAMPANGA-SAN-FERNANDO-CITY",
  productType: "EZ",
  pickupNote: "We'll message you with the pickup location and schedule once your order is ready.",
};

const isHttpUrl = (v: string) => /^https?:\/\/[^\s]+$/i.test(v);

function normalizeShipping(raw: unknown): ShippingContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const endpoint = str(o.jntApiEndpoint, "").trim().replace(/\/+$/, "");
  return {
    jntApiEndpoint: isHttpUrl(endpoint) ? endpoint : DEFAULT_SHIPPING.jntApiEndpoint,
    senderAddr: str(o.senderAddr, "").trim().toUpperCase() || DEFAULT_SHIPPING.senderAddr,
    productType: str(o.productType, "").trim() || DEFAULT_SHIPPING.productType,
    pickupNote: str(o.pickupNote, DEFAULT_SHIPPING.pickupNote),
  };
}

function validateShipping(raw: unknown): Validation<ShippingContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!isHttpUrl(str(o.jntApiEndpoint, "").trim())) {
    return { ok: false, error: 'J&T Express API endpoint must start with "https://" (or "http://").' };
  }
  if (!str(o.senderAddr, "").trim()) return { ok: false, error: "Sender address is required." };
  return { ok: true, value: normalizeShipping(raw) };
}

// ─── Email ──────────────────────────────────────────────────────────────────
// Colors + text for the transactional emails sent from app/api/pre-order/route.ts
// (the admin "New Order"/"New Pre-Order" notifications and the customer "Thank
// You" email). Email clients strip <style> blocks and CSS variables, so these
// are plain hex values read server-side and inlined into each email's HTML —
// unlike the storefront's Colors tab, there's no light/dark mode here.

export type EmailColors = {
  /** Outer <body> background, just visible as a thin margin around the card. */
  background: string;
  /** The email's card background. */
  panel: string;
  /** Background of the boxed sections inside the card (Customer Info, Order Items). */
  panelAccent: string;
  /** Border around the card, its sections, and the line between order items. */
  border: string;
  /** Headings, totals, the button background and the "XZVL_STORE" kicker. */
  primary: string;
  /** Body text. */
  text: string;
  /** Labels and secondary text (e.g. "Name", "Qty"). */
  muted: string;
};

export type EmailTextContent = {
  /** Small kicker line above the heading, e.g. "XZVL_STORE". */
  tag: string;
  /** Intro paragraph in the customer email after a checkout order. */
  greetingCheckout: string;
  /** Intro paragraph in the customer email after a pre-order. */
  greetingPreOrder: string;
  /** Button label in the customer email, linking to /account/orders. */
  buttonLabel: string;
};

export type EmailContent = { colors: EmailColors; text: EmailTextContent };

export const DEFAULT_EMAIL: EmailContent = {
  colors: {
    background: "#0e0e0e",
    panel: "#131313",
    panelAccent: "#1a1a1a",
    border: "#1f1f1f",
    primary: "#ed0d11",
    text: "#e2e2e2",
    muted: "#ebbbb4",
  },
  text: {
    tag: "XZVL_STORE",
    greetingCheckout: "We've received your order and we're getting it ready. We'll notify you once it ships.",
    greetingPreOrder: "We've received your pre-order request. We'll reach out once your item is confirmed and ready.",
    buttonLabel: "View My Orders",
  },
};

const EMAIL_COLOR_KEYS = ["background", "panel", "panelAccent", "border", "primary", "text", "muted"] as const;

function normalizeEmail(raw: unknown): EmailContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const c = (o.colors && typeof o.colors === "object" ? o.colors : {}) as Record<string, unknown>;
  const t = (o.text && typeof o.text === "object" ? o.text : {}) as Record<string, unknown>;
  return {
    colors: Object.fromEntries(
      EMAIL_COLOR_KEYS.map((k) => [k, isHexColor(c[k]) ? c[k] : DEFAULT_EMAIL.colors[k]])
    ) as EmailColors,
    text: {
      tag: str(t.tag, DEFAULT_EMAIL.text.tag).trim() || DEFAULT_EMAIL.text.tag,
      greetingCheckout: str(t.greetingCheckout, DEFAULT_EMAIL.text.greetingCheckout).trim() || DEFAULT_EMAIL.text.greetingCheckout,
      greetingPreOrder: str(t.greetingPreOrder, DEFAULT_EMAIL.text.greetingPreOrder).trim() || DEFAULT_EMAIL.text.greetingPreOrder,
      buttonLabel: str(t.buttonLabel, DEFAULT_EMAIL.text.buttonLabel).trim() || DEFAULT_EMAIL.text.buttonLabel,
    },
  };
}

function validateEmail(raw: unknown): Validation<EmailContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const c = (o.colors && typeof o.colors === "object" ? o.colors : {}) as Record<string, unknown>;
  const t = (o.text && typeof o.text === "object" ? o.text : {}) as Record<string, unknown>;
  for (const k of EMAIL_COLOR_KEYS) {
    if (!isHexColor(c[k])) return { ok: false, error: `Email colors: ${k} must be a hex value like #131313.` };
  }
  if (!str(t.tag, "").trim()) return { ok: false, error: "Email tag is required." };
  if (!str(t.greetingCheckout, "").trim()) return { ok: false, error: "The checkout greeting is required." };
  if (!str(t.greetingPreOrder, "").trim()) return { ok: false, error: "The pre-order greeting is required." };
  if (!str(t.buttonLabel, "").trim()) return { ok: false, error: "The button label is required." };
  return { ok: true, value: normalizeEmail(raw) };
}

// ─── Colors ─────────────────────────────────────────────────────────────────
// One palette per mode. The root layout turns these into CSS variables
// (lib/theme.ts), which the Tailwind theme tokens (primary, fg, canvas…) read,
// so the storefront follows whichever mode the visitor picked in the header.

export const THEME_MODES = ["dark", "light"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const PALETTE_KEYS = [
  "primary",
  "accent",
  "text",
  "background",
  "surface",
  "surfaceDeep",
  "border",
  "header",
  "headerText",
] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;

export type ColorsContent = {
  /** Mode shown to visitors who haven't picked one with the header toggle. */
  defaultMode: ThemeMode;
  dark: Palette;
  light: Palette;
};

export const DEFAULT_COLORS: ColorsContent = {
  defaultMode: "dark",
  dark: {
    primary: "#ed0d11",
    accent: "#ebbbb4",
    text: "#e2e2e2",
    background: "#131313",
    surface: "#1a1a1a",
    surfaceDeep: "#0e0e0e",
    border: "#603e39",
    header: "#131313",
    headerText: "#e2e2e2",
  },
  light: {
    primary: "#d90b0f",
    accent: "#7a4f49",
    text: "#161616",
    background: "#f4f4f4",
    surface: "#ffffff",
    surfaceDeep: "#e9e9e9",
    border: "#d9c6c3",
    header: "#ffffff",
    headerText: "#161616",
  },
};

function normalizePalette(raw: unknown, def: Palette): Palette {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(PALETTE_KEYS.map((k) => [k, isHexColor(o[k]) ? o[k] : def[k]])) as Palette;
}

function normalizeColors(raw: unknown): ColorsContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    defaultMode: THEME_MODES.includes(o.defaultMode as ThemeMode) ? (o.defaultMode as ThemeMode) : DEFAULT_COLORS.defaultMode,
    dark: normalizePalette(o.dark, DEFAULT_COLORS.dark),
    light: normalizePalette(o.light, DEFAULT_COLORS.light),
  };
}

function validateColors(raw: unknown): Validation<ColorsContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!THEME_MODES.includes(o.defaultMode as ThemeMode)) return { ok: false, error: "Default mode must be dark or light." };
  for (const mode of THEME_MODES) {
    const p = (o[mode] && typeof o[mode] === "object" ? o[mode] : {}) as Record<string, unknown>;
    for (const k of PALETTE_KEYS) {
      if (!isHexColor(p[k])) return { ok: false, error: `${mode} mode: ${k} must be a hex value like #131313.` };
    }
  }
  return { ok: true, value: normalizeColors(raw) };
}

// ─── Registry ───────────────────────────────────────────────────────────────

export type SiteContent = {
  branding: BrandingContent;
  header: HeaderContent;
  hero: HeroContent;
  footer: FooterContent;
  pos: PosContent;
  maintenance: MaintenanceContent;
  payment: PaymentContent;
  shipping: ShippingContent;
  email: EmailContent;
  colors: ColorsContent;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  branding: DEFAULT_BRANDING,
  header: DEFAULT_HEADER,
  hero: DEFAULT_HERO,
  footer: DEFAULT_FOOTER,
  pos: DEFAULT_POS,
  maintenance: DEFAULT_MAINTENANCE,
  payment: DEFAULT_PAYMENT,
  shipping: DEFAULT_SHIPPING,
  email: DEFAULT_EMAIL,
  colors: DEFAULT_COLORS,
};

export const SITE_CONTENT_KEYS = Object.keys(DEFAULT_SITE_CONTENT) as (keyof SiteContent)[];

// Turns whatever is stored for a section into a complete, safe value, falling
// back to the defaults for anything missing or malformed.
export const NORMALIZERS: { [K in keyof SiteContent]: (raw: unknown) => SiteContent[K] } = {
  branding: normalizeBranding,
  header: normalizeHeader,
  hero: normalizeHero,
  footer: normalizeFooter,
  pos: normalizePos,
  maintenance: normalizeMaintenance,
  payment: normalizePayment,
  shipping: normalizeShipping,
  email: normalizeEmail,
  colors: normalizeColors,
};

const VALIDATORS: { [K in keyof SiteContent]: (raw: unknown) => Validation<SiteContent[K]> } = {
  branding: validateBranding,
  header: validateHeader,
  hero: validateHero,
  footer: validateFooter,
  pos: validatePos,
  maintenance: validateMaintenance,
  payment: validatePayment,
  shipping: validateShipping,
  email: validateEmail,
  colors: validateColors,
};

export function validateSection(key: keyof SiteContent, raw: unknown): Validation<unknown> {
  return VALIDATORS[key](raw);
}
