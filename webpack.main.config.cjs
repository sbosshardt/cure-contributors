const webpack = require('webpack')
const path = require('path')

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/renderer/index.js',
  // Put your normal webpack config below here

  target: 'electron-main',
  node: {
    __dirname: false, // Keep the original `__dirname`
    __filename: false, // Keep the original `__filename`
  },
  plugins: [
    new webpack.DefinePlugin({
      __dirname: '__dirname', // Pass __dirname as-is
    }),
  ],

  module: {
    rules: require('./webpack.rules.cjs'),
  },
  output: {
    path: path.resolve(__dirname, '.webpack/main'),
    filename: 'index.cjs', // Output as CommonJS file
    libraryTarget: 'commonjs2', // Use CommonJS2 module format
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      fs: false,
      tls: false,
      net: false,
      path: require.resolve('path-browserify'), //if you want to use this module also don't forget npm i path-browserify
      zlib: false,
      http: false,
      https: false,
      stream: false,
      crypto: false,
      'crypto-browserify': require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify
    },
  },
}
