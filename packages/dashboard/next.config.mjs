/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@axon-protocol/sdk"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // sodium-native is a Node.js native module — exclude from browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Exclude native addons from webpack entirely
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      "sodium-native",
    ];
    return config;
  },
};

export default nextConfig;
