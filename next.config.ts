import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Also support `next build/dev --webpack` in environments that restrict Turbopack's worker ports.
  webpack(config) {
    config.module.rules.push({
      // Nested preprocessing preserves Next's built-in CSS extraction and module handling.
      rules: [{ test: /\.css$/, enforce: 'pre', use: ['@tailwindcss/turbopack'] }],
    });
    return config;
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
