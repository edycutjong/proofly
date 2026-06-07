import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@bytecodealliance/jco"],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
