import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'url';
import started from 'electron-squirrel-startup';
import preferences from './preferences.js';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Electron GUI entry point
const createWindow = () => {
  // Get saved bounds, or null if none exist
  const savedBounds = preferences.get('windowBounds', null);
  const display = screen.getPrimaryDisplay();
  const defaultWidth = 800;
  const defaultHeight = 600;

  const centeredBounds = {
    width: defaultWidth,
    height: defaultHeight,
    x: Math.floor((display.bounds.width - defaultWidth) / 2 + display.bounds.x),
    y: Math.floor((display.bounds.height - defaultHeight) / 2 + display.bounds.y),
  };

  // Use saved bounds if they exist, otherwise center the window
  const windowBounds = savedBounds || centeredBounds;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('close', () => {
    if (mainWindow) {
      // Save window size and position
      preferences.set('windowBounds', mainWindow.getBounds());
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
