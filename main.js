/*
{
  "name": "app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "ent": "^0.1.0",
    "express": "^3.3.4",
    "formidable": "^1.2.1",
    "moment": "^2.22.2",
    "moment-timezone": "^0.5.21",
    "mysql": "^2.15.0",
    "pg": "^4.4.3",
    "socket.io": "^1.2.1"
  },
  "engines": {
    "node": "^5.0.0"
  },
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "author": "Clad07",
  "description": "VickyChat",
  "license": "MIT"
}
*//*
{
  "name": "app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "electron-prompt": "^1.2.0",
    "ent": "^0.1.0",
    "express": "^3.3.4",
    "formidable": "^1.2.1",
    "moment": "^2.22.2",
    "moment-timezone": "^0.5.21",
    "mysql": "^2.15.0",
    "pg": "^4.4.3",
    "socket.io": "^1.2.1"
  },
  "engines": {
    "node": "^5.0.0"
  },
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "package": "electron-packager . VickyChat --out dist --overwrite platform=win32 --arch=x64 --icon=image/logo.ico"
  },
  "author": "Clad07",
  "description": "VickyChat",
  "license": "MIT",
  "devDependencies": {
    "electron": "^3.0.10",
    "electron-packager": "^12.1.0"
  }
}
*/

//electron-packager . VickyChat --out dist --overwrite --all --icon=image/logo.ico

const electron = require('electron')
// Module to control appEleclication life.
const appElec = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const path = require('path');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
	  width: 1024,
	  height: 800,
	  icon:path.join(__dirname, 'image/logo.png'),
	  fullscreen: false,
	  frame: true,
	  show: true,
	  center: true
	  //transparent: true,
	  //titleBarStyle:'hidden'
	  })

  // and load the index.html of the appElec.
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  /*mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))*/
	
  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your appElec supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
appElec.on('ready', createWindow)

// Quit when all windows are closed.
appElec.on('window-all-closed', function () {
  // On OS X it is common for appEleclications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    appElec.quit()
  }
})

appElec.on('activate', function () {
  // On OS X it's common to re-create a window in the appElec when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your appElec's specific main process
// code. You can also put them in separate files and require them here.


//var myappElec = require('./app.js');
