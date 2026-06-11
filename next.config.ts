import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 uses native Node.js addons — must not be bundled by webpack
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
