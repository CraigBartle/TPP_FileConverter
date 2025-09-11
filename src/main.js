const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const FileConverter = require('./converter');
const SettingsManager = require('./settings');

class UniversalConverter {
  constructor() {
    this.mainWindow = null;
    this.converter = new FileConverter();
    this.settings = new SettingsManager();
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      minWidth: 1000,
      minHeight: 800,
      acceptFirstMouse: true,
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'The Printing Press File Converter'
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    // Use Electron's native file drop handling
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.protocol === 'file:') {
        event.preventDefault();
      }
    });

    // Handle file drops at the main process level
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('file://')) {
        event.preventDefault();
        // Extract file path and send to renderer
        const filePath = url.replace('file:///', '').replace(/\//g, '\\');
        this.mainWindow.webContents.send('file-dropped', [filePath]);
      }
    });

    // Simple logging for main process
    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log('Main: Window loaded, drag and drop should be handled by renderer');
    });
  }

  setupIPC() {
    ipcMain.handle('select-output-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    ipcMain.handle('select-files', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'All Supported Files',
            extensions: [
              'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
              'jpg', 'jpeg', 'png', 'tiff', 'tif', 'heic'
            ]
          },
          {
            name: 'Office Documents',
            extensions: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
          },
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'heic']
          },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths;
      }
      return [];
    });

    ipcMain.handle('convert-files', async (event, { files, outputFolder }) => {
      try {
        const results = [];
        
        for (const filePath of files) {
          try {
            const result = await this.converter.convertToPDF(filePath, outputFolder);
            results.push({
              file: path.basename(filePath),
              status: 'success',
              outputPath: result
            });
          } catch (error) {
            results.push({
              file: path.basename(filePath),
              status: 'error',
              error: error.message
            });
          }
        }
        
        return results;
      } catch (error) {
        throw new Error(`Conversion failed: ${error.message}`);
      }
    });

    ipcMain.handle('get-default-output-folder', () => {
      try {
        return app.getPath('desktop');
      } catch (error) {
        console.error('Failed to get desktop path:', error);
        return path.join(require('os').homedir(), 'Desktop');
      }
    });

    ipcMain.handle('ensure-output-folder', async (event, folderPath) => {
      try {
        await fs.access(folderPath);
      } catch {
        await fs.mkdir(folderPath, { recursive: true });
      }
      return true;
    });

    // Settings IPC handlers
    ipcMain.handle('get-setting', async (event, key) => {
      return await this.settings.getSetting(key);
    });

    ipcMain.handle('set-setting', async (event, key, value) => {
      return await this.settings.updateSetting(key, value);
    });

    ipcMain.handle('get-all-settings', async () => {
      return await this.settings.getAllSettings();
    });

    ipcMain.handle('get-conversion-method', async () => {
      return await this.converter.getConversionMethod();
    });

    ipcMain.handle('check-office-availability', async () => {
      return await this.converter.checkOfficeAvailability();
    });

    ipcMain.handle('merge-pdfs', async (event, { pdfPaths, outputPath }) => {
      try {
        const result = await this.converter.mergePDFs(pdfPaths, outputPath);
        return { success: true, outputPath: result };
      } catch (error) {
        throw new Error(`PDF merge failed: ${error.message}`);
      }
    });

    ipcMain.handle('select-pdf-files', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths;
      }
      return [];
    });
  }

  async initialize() {
    // Fix GPU issues
    app.commandLine.appendSwitch('--disable-gpu');
    app.commandLine.appendSwitch('--disable-gpu-sandbox');
    app.commandLine.appendSwitch('--disable-software-rasterizer');
    app.commandLine.appendSwitch('--disable-gpu-process-crash-limit');
    app.commandLine.appendSwitch('--disable-dev-shm-usage');
    app.commandLine.appendSwitch('--no-sandbox');
    
    await app.whenReady();
    
    this.createWindow();
    this.setupIPC();

    // Ensure desktop exists (it usually does, but just in case)
    try {
      const desktopPath = app.getPath('desktop');
      await fs.access(desktopPath);
    } catch (error) {
      console.log('Desktop path not accessible, continuing...');
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }
}

const converterApp = new UniversalConverter();
converterApp.initialize().catch(console.error);