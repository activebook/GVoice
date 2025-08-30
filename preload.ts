// preload.ts
const { contextBridge, ipcRenderer } = require('electron');

const STATUS = {
    TTS_SERVICE_STATUS_START: 1 << 0,
    TTS_SERVICE_STATUS_DONE: 1 << 1,
    TTS_SERVICE_STATUS_ERROR: 1 << 2
};


// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {

    /**
     * Convert text to speech
     * Update conversion progress in the renderer process
     */
    convertTextToSpeech: (text, voice, filePrefix, settings) => ipcRenderer.invoke('convert-text-to-speech', text, voice, filePrefix, settings),
    onConversionProgress: (callback) => {
        ipcRenderer.on('tts-progress', (event, progress) => callback(progress))
        return () => ipcRenderer.removeListener('tts-progress', callback)
    },

    /**
     * Get available voices
     * Update voices in the renderer process
     */
    getAvailableVoices: () => 
        ipcRenderer.invoke('get-available-voices'),
    onVoicesRetrieved: (callback) => {
        ipcRenderer.on('available-voices-retrieved', (event, voices, filePrefix) => callback(voices, filePrefix))
        return () => ipcRenderer.removeListener('available-voices-retrieved', callback)
    },

    
    /**
     * Open file location in file explorer
     */
    openFileLocation: (filePath) => ipcRenderer.send('open-file-location', filePath),

    /**
     * Get list of audio files
     */
    getAudioFilesList: () => ipcRenderer.invoke('get-audio-files-list'),

    /**
     * Save settings to YAML file
     */
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    /**
     * Load settings from YAML file
     */
    loadSettings: () => ipcRenderer.invoke('load-settings'),

    /**
     * When using context isolation (which is a security best practice in Electron),
     * the renderer process (your HTML/CSS/JS) doesn't have direct access to Node.js APIs or the file system.
     * They run in completely separate contexts.
     * If you tried to import directly in renderer.js with: import * as STATUS from './status.js'
     * This would fail because:
     * 1. The renderer process can't access Node.js modules directly
     * 2. The browser environment can't load files from the local filesystem using import statements (unless you're using a bundler)
     */
    STATUS: STATUS // Expose the STATUS constants
})

contextBridge.exposeInMainWorld('darkMode', {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle')
})

// Expose debugging functions
contextBridge.exposeInMainWorld('debug', {
    log: (...args) => {
        console.log(...args) // This will show in the main process terminal
        // Also logs to renderer console
        // This sends the log to main process
        ipcRenderer.send('main-process-log', ...args)
    }
})
