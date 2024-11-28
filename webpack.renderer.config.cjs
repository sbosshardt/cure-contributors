const nodeExternals = require('webpack-node-externals')
const rules = require('./webpack.rules.cjs')

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
})

rules.push({
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader', // Use Babel to transpile modern JS/TS
  },
})


module.exports = {
  target: 'electron-renderer',
  externals: [
    nodeExternals({
      allowlist: [/^webpack\/hot/], // Allowlist necessary modules
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      fs: false, // Prevent Webpack from bundling fs (use Node.js built-in)
      os: false,
      path: false,
    },
  },
  // Put your normal webpack config below here
  module: {
    rules,
  },
}
