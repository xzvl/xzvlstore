import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
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
