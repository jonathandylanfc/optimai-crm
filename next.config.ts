import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jimp uses dynamic requires that Next's bundler mangles; keep it external
  // so the AI Studio transparency step can load it at runtime.
  serverExternalPackages: ["jimp"],
};

export default nextConfig;
