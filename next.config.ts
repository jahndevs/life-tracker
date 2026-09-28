import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile in a parent directory otherwise confuses root detection.
  turbopack: { root: __dirname },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
