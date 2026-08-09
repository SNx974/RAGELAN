/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build autonome : Docker n'embarque que le strict nécessaire.
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // @react-pdf/renderer embarque des binaires non bundlables côté serveur.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
