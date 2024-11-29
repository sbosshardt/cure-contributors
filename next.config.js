/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist/next',
  eslint: {
    dirs: ['pages', 'components', 'src'],
  },
  assetPrefix: './',
  reactStrictMode: true,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure React is properly handled
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        'react': require.resolve('react'),
        'react-dom': require.resolve('react-dom'),
        'react/jsx-runtime': require.resolve('react/jsx-runtime')
      },
      fallback: {
        ...config.resolve.fallback,
        'react/jsx-runtime': require.resolve('react/jsx-runtime'),
        'react-dom/client': require.resolve('react-dom/client')
      }
    }

    // Force CommonJS for node_modules
    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false
      }
    })

    return config
  }
}

module.exports = nextConfig