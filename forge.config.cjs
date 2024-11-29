module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: ['./dist/cure-contributors'],
    executableName: 'cure-contributors',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          bin: './resources/cure-contributors',
          scripts: {
            postinst: './scripts/postinst.sh',
            prerm: './scripts/prerm.sh',
          },
          chmod: {
            'resources/cure-contributors': '755',
          },
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.cjs',
        renderer: {
          config: './webpack.renderer.config.cjs',
          entryPoints: [
            {
              html: './src/renderer/index.html',
              js: './src/renderer/index.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
        devContentSecurityPolicy:
          "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
      },
    },
  ],
}
