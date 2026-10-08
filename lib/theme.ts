import { PALETTE_KEYS, THEME_MODES, type ColorsContent, type Palette, type PaletteKey } from "@/lib/site-content";

// CSS variable for each palette color. Values are "r g b" channel triplets so
// Tailwind opacity modifiers (bg-canvas/95, text-fg/55…) keep working — see the
// colors in tailwind.config.ts.
export const PALETTE_VARS: Record<PaletteKey, string> = {
  primary: "--c-primary",
  accent: "--c-accent",
  text: "--c-fg",
  background: "--c-canvas",
  surface: "--c-panel",
  surfaceDeep: "--c-deep",
  border: "--c-line",
  header: "--c-header",
  headerText: "--c-header-fg",
};

export const THEME_STORAGE_KEY = "theme";

// "#rrggbb" → "r g b". Colors are validated as hex when saved.
export const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

const paletteDecls = (p: Palette) => PALETTE_KEYS.map((k) => `${PALETTE_VARS[k]}:${channels(p[k])};`).join("");

/**
 * The storefront's two palettes as CSS, keyed off <html data-theme>. The admin
 * panel (.admin-theme) always uses the dark palette, whatever mode is active.
 */
export function themeCss(colors: ColorsContent): string {
  return [
    ...THEME_MODES.map((mode) => `:root[data-theme="${mode}"]{color-scheme:${mode};${paletteDecls(colors[mode])}}`),
    `:root .admin-theme{color-scheme:dark;${paletteDecls(colors.dark)}}`,
  ].join("\n");
}

/**
 * Runs in <head> before first paint: applies the visitor's saved mode (from the
 * header toggle) so they never see a flash of the default mode, which the
 * server renders as <html data-theme>. /admin is always dark.
 */
export const THEME_INIT_SCRIPT = `try{var t=location.pathname.split("/")[1]==="admin"?"dark":localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
