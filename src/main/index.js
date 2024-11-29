const { app, BrowserWindow, screen } = require('electron')
const preferences = require('../preferences.js')

// TODO: Add this back in when we have a installer for Windows?
//const started = require('electron-squirrel-startup')
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (started) {
//   app.quit()
// }
// Check if we're being forced into GUI mode
const isForceGui = process.env.FORCE_GUI === '1'

// Only run GUI code if we're in electron context or being forced
if (process.versions.hasOwnProperty('electron') || isForceGui) {
  let mainWindow

  const createWindow = () => {
    // Get saved bounds, or null if none exist
    const savedBounds = preferences.get('windowBounds', null)
    const display = screen.getPrimaryDisplay()
    const defaultWidth = 800
    const defaultHeight = 600

    const centeredBounds = {
      width: defaultWidth,
      height: defaultHeight,
      x: Math.floor(
        (display.bounds.width - defaultWidth) / 2 + display.bounds.x,
      ),
      y: Math.floor(
        (display.bounds.height - defaultHeight) / 2 + display.bounds.y,
      ),
    }

    // Use saved bounds if they exist, otherwise center the window
    const windowBounds = savedBounds || centeredBounds

    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    })

    mainWindow.on('close', () => {
      if (mainWindow) {
        // Save window size and position
        preferences.set('windowBounds', mainWindow.getBounds())
      }
    })

    // Load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch((err) => {
      console.error('Failed to load window:', err)
    })

    mainWindow.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription) => {
        console.error('Window failed to load:', errorCode, errorDescription)
      },
    )
  }

  app.whenReady().then(createWindow)

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
} else {
  console.error('Not running in Electron context')
  process.exit(1)
}
