import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@bytecodealliance/jco", "@bytecodealliance/preview2-shim"],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
