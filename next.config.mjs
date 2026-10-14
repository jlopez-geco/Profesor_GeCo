/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estático: la app es 100% cliente (IndexedDB), sin rutas de servidor.
  // Permite desplegar en Cloudflare Pages / Netlify como sitio estático.
  output: 'export',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
