/* ! index.js | Project ACTS | github.com/project-acts */

const path = require('path');
const {app, BrowserWindow} = require('electron');
const {getAssetPath, getHtmlPath} = require('./utils');
const engine = require('./engine');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow = null;

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    width: 1224,
    height: 768,
    minWidth: 1224,
    minHeight: 768,
    icon: getAssetPath('icon.ico'),
    webPreferences: {
      // The renderer keeps its default sandbox (no Node access); preload.js
      // is the only bridge, exposing just the local model engine.
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Set new window properties
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          defaultFontFamily: {
            standard: 'Roboto',
          },
        },
      },
    };
  });

  // and load the index.html of the app.
  mainWindow.loadFile(getHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      // Open the DevTools only when window is ready to show
      // mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.setMenu(null);
  // show/hide console
  // mainWindow.webContents.openDevTools()
};

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady()
    .then(() => {
      // Must be registered before any window can invoke them.
      engine.register();
      createWindow();

      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) {
          createWindow();
        }
      });
    })
    .catch(console.error);
