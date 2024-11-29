const rules = require('./webpack.rules.cjs')
const path = require('path')

module.exports = {
  target: 'electron-renderer',
  entry: './src/renderer/index.js',
  output: {
    path: path.join(__dirname, '.webpack/renderer'),
    filename: 'index.js',
    publicPath: './'
  },
  module: {
    rules: [
      ...rules,
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  }
}
