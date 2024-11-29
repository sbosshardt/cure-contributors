module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
          electron: '33',
        },
      },
    ],
  ],
}
