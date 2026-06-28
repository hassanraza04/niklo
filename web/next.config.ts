import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // google already serves sized thumbnails; skip the optimizer (free + reliable on cf)
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;

// lets getCloudflareContext() (D1 etc.) work in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
