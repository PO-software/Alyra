import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // RainbowKit → @wagmi/connectors (baseAccount) → @base-org/account → @coinbase/cdp-sdk, whose optional
  // x402 payment modules are not installed. Load it with Node's require during SSR instead of bundling it;
  // that code path never runs in this app.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
