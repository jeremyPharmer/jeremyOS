import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloud Agent tunnels + local previews to load /_next assets.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
};

export default nextConfig;
