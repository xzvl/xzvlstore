import type { NextConfig } from "next";

const TESSERACT_FILES = [
  "tesseract.js",
  "tesseract.js-core",
  "regenerator-runtime",
  "is-url",
  "wasm-feature-detect",
  "bmp-js",
  "zlibjs",
  "node-fetch",
  "whatwg-url",
  "tr46",
  "webidl-conversions",
].map((pkg) => `./node_modules/${pkg}/**/*`);

// sharp's Linux binary loads libvips (libvips-cpp.so) from a sibling package
// at runtime, which file tracing can't see. Without it sharp fails with
// ERR_DLOPEN_FAILED on Vercel. (Nothing matches on a Windows/macOS build.)
const SHARP_FILES = ["@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64"].map(
  (pkg) => `./node_modules/${pkg}/**/*`
);

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "tesseract.js"],
  // Tesseract.js starts its OCR worker from a file path, which file tracing
  // can't see — ship the package and the worker's own (hoisted) dependencies
  // with the routes that read payment proofs. A missing one makes the worker
  // crash on startup and OCR hang until the function times out.
  outputFileTracingIncludes: {
    "/api/payment-proof": [...TESSERACT_FILES, ...SHARP_FILES],
    "/api/pre-order": [...TESSERACT_FILES, ...SHARP_FILES],
    "/api/admin/upload": SHARP_FILES,
    "/api/admin/image-optimizer": SHARP_FILES,
  },
  images: {
    // Fully disable Next.js Image Optimization, site-wide. `next/image`
    // just renders the original file untouched — no Vercel `/_next/image`
    // requests (which return OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED once
    // the plan's optimization quota is exceeded) and no Supabase Storage
    // image-transform/render requests (billed as Cached Egress). Uploads
    // are already pre-compressed to WebP server-side (see
    // app/api/admin/upload/route.ts), so there's nothing to gain from
    // on-the-fly optimization anyway.
    unoptimized: true,
  },
};

export default nextConfig;
