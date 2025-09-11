const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const os = require('os');

class SettingsManager {
  constructor() {
    this.settingsPath = this.getSettingsPath();
    this.defaultSettings = {
      officeConversionMethod: 'auto', // 'auto', 'native', 'powershell'
      defaultOutputFolder: this.getDesktopPath()
    };
  }

  getSettingsPath() {
    const userDataPath = app?.getPath('userData') || path.join(os.homedir(), 'Universal PDF Converter');
    return path.join(userDataPath, 'settings.json');
  }

  getDesktopPath() {
    try {
      // If app is available and ready, use it. Otherwise fall back to homedir
      if (app && app.isReady && app.isReady()) {
        return app.getPath('desktop');
      }
      return path.join(os.homedir(), 'Desktop');
    } catch (error) {
      return path.join(os.homedir(), 'Desktop');
    }
  }

  async loadSettings() {
    try {
      const settingsData = await fs.readFile(this.settingsPath, 'utf8');
      return { ...this.defaultSettings, ...JSON.parse(settingsData) };
    } catch (error) {
      // Settings file doesn't exist or is invalid, return defaults
      return { ...this.defaultSettings };
    }
  }

  async saveSettings(settings) {
    try {
      // Ensure settings directory exists
      const settingsDir = path.dirname(this.settingsPath);
      await fs.mkdir(settingsDir, { recursive: true });
      
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  async updateSetting(key, value) {
    const currentSettings = await this.loadSettings();
    currentSettings[key] = value;
    return await this.saveSettings(currentSettings);
  }

  async getSetting(key) {
    const settings = await this.loadSettings();
    return settings[key];
  }

  async getAllSettings() {
    return await this.loadSettings();
  }
}

module.exports = SettingsManager;