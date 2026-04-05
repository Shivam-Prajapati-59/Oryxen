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
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname: "/**",
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
  webpack: (config) => {
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    return config;
  },
  // Transpile drift-labs packages
  transpilePackages: ["@drift-labs/sdk-browser", "@solana/web3.js"],
};

export default nextConfig;
