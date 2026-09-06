import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    // Route all next/image requests through our own loader instead of
    // Vercel's `/_next/image` optimizer, which returns
    // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED when the plan's image
    // optimization quota is exceeded. See lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
