/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep mongoose as an external CommonJS require on the server instead of
  // bundling it — bundling breaks its named exports (mongoose.models etc.).
  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default nextConfig
