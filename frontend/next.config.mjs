/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactCompiler: true,
  experimental: {
    globalNotFound: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;