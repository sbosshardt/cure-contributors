const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  entry: './src/cli.js',
  target: 'node',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'cure-contributors',
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
      entryOnly: true,
    }),
  ],
  externals: {
    electron: 'electron',
    'better-sqlite3': 'commonjs better-sqlite3'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
}
