const path = require('path')

module.exports = {
  entry: './src/main/index.js',
  target: 'electron-main',
  output: {
    path: path.join(__dirname, '.webpack/main'),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules\/(?!electron-store|conf|dot-prop|pkg-up)/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  externals: [
    'electron'
  ]
}
