import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "tesseract.js"],
  // Tesseract.js starts its OCR worker from a file path, which file tracing
  // can't see — ship the package with the routes that read payment proofs.
  outputFileTracingIncludes: {
    "/api/payment-proof": ["./node_modules/tesseract.js/**/*", "./node_modules/tesseract.js-core/**/*"],
    "/api/pre-order": ["./node_modules/tesseract.js/**/*", "./node_modules/tesseract.js-core/**/*"],
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
