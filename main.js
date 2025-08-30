const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const yaml = require('js-yaml');
const { setupTTSHandlers, teardownTTSHandlers } = require('./tts-service');
const { setAppUserDataDir } = require('./utils');

// You don't need fileURLToPath in CommonJS since __dirname is already available

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // recommended
            nodeIntegration: false // recommended
        }
    })

    mainWindow.loadFile('src/index.html')

    // Only for development
    //mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    // Make sure the user data directory exists
    prepareUserDataDir();

    // Set up the TTS handlers
    setupTTSHandlers();

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('will-quit', () => {
    // Tear down the TTS handlers
    teardownTTSHandlers()
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

/**
 * On macOS: ~/Library/Application Support/[Your App Name]
 * On Windows: %APPDATA%[Your App Name]
 * On Linux: ~/.config/[Your App Name]
 */
function prepareUserDataDir() {
    // Get user data directory (safe for read/write operations)
    const userDataPath = app.getPath('userData');
    const gvoiceOutputPath = path.join(userDataPath, 'gvoice-output');

    // Create directory if it doesn't exist
    fs.mkdir(gvoiceOutputPath, { recursive: true });
    setAppUserDataDir(gvoiceOutputPath);
}

ipcMain.on('main-process-log', (event, ...args) => {
    console.log(...args) // This will show in terminal
})

ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
        nativeTheme.themeSource = 'light'
    } else {
        nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
})

/**
 * Save settings to YAML file in user data directory
 */
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.yaml');

        // Convert settings object to YAML string
        const yamlStr = yaml.dump(settings);

        // Write to file
        await fs.writeFile(settingsPath, yamlStr, 'utf8');

        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
});

/**
 * Load settings from YAML file in user data directory
 */
ipcMain.handle('load-settings', async (event) => {
    try {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.yaml');

        // Check if file exists
        try {
            await fs.access(settingsPath);
        } catch {
            // File doesn't exist, return default settings
            return {
                apiKey: '',
                speechStyle: '',
                ttsEngine: 'gemini-2.5-flash-preview-tts'
            };
        }

        // Read and parse YAML file
        const yamlStr = await fs.readFile(settingsPath, 'utf8');
        const settings = yaml.load(yamlStr);

        return settings || {
            apiKey: '',
            speechStyle: '',
            ttsEngine: 'gemini-2.5-flash-preview-tts'
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        // Return default settings on error
        return {
            apiKey: '',
            speechStyle: '',
            ttsEngine: 'gemini-2.5-flash-preview-tts'
        };
    }
});
