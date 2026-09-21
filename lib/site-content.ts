// Imported by client components (HeroSlider, the /admin/content tab editors)
// as well as server code, so it must stay free of any import that pulls in
// lib/supabase.ts (the service-role client). The data-fetching function
// lives in lib/get-site-content.ts (server code only) instead.

// ─── Hero ───────────────────────────────────────────────────────────────────

export type HeroSlide = {
  id: string;
  /** Small mono line above the title, e.g. "XZVL.STORE // 2026". */
  tag: string;
  /** First title line, rendered white. */
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
  /** Solid color behind everything (and the fade that blends the images in). */
  backgroundColor: string;
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
      backgroundColor: "#0e0e0e",
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
      backgroundColor: "#0e0e0e",
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
      backgroundColor: "#0e0e0e",
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
    backgroundColor: isHexColor(s.backgroundColor) ? s.backgroundColor : def.backgroundColor,
  };
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
    if (!isHexColor(s.backgroundColor)) {
      return { ok: false, error: `Slide ${n}: background color must be a hex value like #0e0e0e.` };
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
  /** Empty = the default /assets/favicon.webp. */
  faviconUrl: string;
};

export const DEFAULT_BRANDING: BrandingContent = { logoImageUrl: "", faviconUrl: "" };

const isImageUrl = (v: string) => v === "" || /^(\/|https?:\/\/)/i.test(v);

function normalizeBranding(raw: unknown): BrandingContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const logo = str(o.logoImageUrl, "").trim();
  const fav = str(o.faviconUrl, "").trim();
  return {
    logoImageUrl: isImageUrl(logo) ? logo : "",
    faviconUrl: isImageUrl(fav) ? fav : "",
  };
}

function validateBranding(raw: unknown): Validation<BrandingContent> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!isImageUrl(str(o.logoImageUrl, "").trim())) return { ok: false, error: "Logo must be an uploaded image." };
  if (!isImageUrl(str(o.faviconUrl, "").trim())) return { ok: false, error: "Favicon must be an uploaded image." };
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

// ─── Registry ───────────────────────────────────────────────────────────────

export type SiteContent = {
  branding: BrandingContent;
  header: HeaderContent;
  hero: HeroContent;
  footer: FooterContent;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  branding: DEFAULT_BRANDING,
  header: DEFAULT_HEADER,
  hero: DEFAULT_HERO,
  footer: DEFAULT_FOOTER,
};

export const SITE_CONTENT_KEYS = Object.keys(DEFAULT_SITE_CONTENT) as (keyof SiteContent)[];

// Turns whatever is stored for a section into a complete, safe value, falling
// back to the defaults for anything missing or malformed.
export const NORMALIZERS: { [K in keyof SiteContent]: (raw: unknown) => SiteContent[K] } = {
  branding: normalizeBranding,
  header: normalizeHeader,
  hero: normalizeHero,
  footer: normalizeFooter,
};

const VALIDATORS: { [K in keyof SiteContent]: (raw: unknown) => Validation<SiteContent[K]> } = {
  branding: validateBranding,
  header: validateHeader,
  hero: validateHero,
  footer: validateFooter,
};

export function validateSection(key: keyof SiteContent, raw: unknown): Validation<unknown> {
  return VALIDATORS[key](raw);
}
