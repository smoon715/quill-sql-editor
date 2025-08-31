import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Enable any experimental features you need
  },
  // Ensure Next.js version is properly identified
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
};

export default nextConfig;
