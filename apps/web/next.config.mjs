/** @type {import('next').NextConfig} */
const nextConfig = {
  // Let Next.js transpile the workspace packages instead of requiring them to be pre-built.
  transpilePackages: ["@dgt/types", "@dgt/parsers", "@dgt/stats"],
};

export default nextConfig;
