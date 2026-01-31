import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        port: "",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "chainlistapi.com",
        port: "",
        pathname: "/icons/**",
      },
      {
        protocol: "https",
        hostname: "drift-public.s3.eu-central-1.amazonaws.com",
        port: "",
        pathname: "/assets/icons/**",
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      fs: { browser: "./node-browser-compatibility.js" },
      net: { browser: "./node-browser-compatibility.js" },
      dns: { browser: "./node-browser-compatibility.js" },
      tls: { browser: "./node-browser-compatibility.js" },
      crypto: { browser: "crypto-browserify" },
    },
  },
  // Transpile drift-labs packages
  transpilePackages: ["@drift-labs/sdk-browser"],
};

export default nextConfig;
