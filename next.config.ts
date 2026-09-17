import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy ke server sendiri: `next build` menghasilkan .next/standalone
  // yang bisa dijalankan dengan `node server.js` tanpa node_modules penuh.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
