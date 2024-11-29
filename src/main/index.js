const { app, BrowserWindow, screen } = require('electron')
//const started = require('electron-squirrel-startup')
const preferences = require('../preferences.js')

let mainWindow

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (started) {
//   app.quit()
// }

// Electron GUI entry point
const createWindow = () => {
  // Get saved bounds, or null if none exist
  const savedBounds = preferences.get('windowBounds', null)
  const display = screen.getPrimaryDisplay()
  const defaultWidth = 800
  const defaultHeight = 600

  const centeredBounds = {
    width: defaultWidth,
    height: defaultHeight,
    x: Math.floor((display.bounds.width - defaultWidth) / 2 + display.bounds.x),
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
      /*global MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY*/
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
  /*global MAIN_WINDOW_WEBPACK_ENTRY*/
  if (MAIN_WINDOW_WEBPACK_ENTRY) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch(err => {
      console.error('Failed to load window:', err)
    })
  } else {
    console.error('MAIN_WINDOW_WEBPACK_ENTRY is not defined')
  }

  // Add error handling for the window
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorCode, errorDescription)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.