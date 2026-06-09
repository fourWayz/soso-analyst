import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } },
  webpack: (config) => {
    // MetaMask SDK references react-native storage; pino references pino-pretty.
    // Neither is needed in a browser build — stub them out.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "lokijs": false,
      "encoding": false,
    };
    return config;
  },
};

export default nextConfig;
