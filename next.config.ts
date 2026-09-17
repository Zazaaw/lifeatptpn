import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server sendiri: `next build` menghasilkan .next/standalone (`node server.js`).
  // Di Vercel (env VERCEL=1 saat build) output bawaan Vercel yang dipakai.
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Dashboard tanpa login: halaman, API, dan file Excel tidak boleh diindeks mesin pencari.
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
