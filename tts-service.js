// tts-service.js
/**
 * TTS Service using Google GenAI
 */
const { ipcMain, shell } = require('electron');
const { Worker } = require('worker_threads');
const { getVoices, getDefaultSettings } = require('./config-reader');
const { getAppUserDataDir } = require('./utils');
const path = require('path');

// TTS worker instance, keep only one instance
let ttsWorker = null;

// Initialize the TTS worker once
function initTTSWorker() {
    if (!ttsWorker) {
        const workerPath = path.join(__dirname, 'tts-worker.js');
        ttsWorker = new Worker(workerPath);

        // Log any errors
        ttsWorker.on('error', (err) => {
            console.error('TTS Worker error:', err);
            ttsWorker = null; // Reset so we can try again
        });
    }
    return ttsWorker;
}

async function loadVoices(sender) {
    return new Promise(async (resolve, reject) => {
        const voices = getVoices().map(voice => ({
            id: voice.name,
            name: voice.name,
            description: voice.description
        }));
        //console.log(voices);
        const defaultSettings = getDefaultSettings();
        const prefix = defaultSettings?.defaultVoice || 'voice';

        // Check if sender is still valid before sending
        if (!sender.isDestroyed()) {
            sender.send('available-voices-retrieved', voices, prefix);
        }
        resolve(voices);
    });
}

function setupTTSHandlers() {
    ipcMain.handle('convert-text-to-speech', async (event, text, voice, filePrefix) => {

        /**
         * due to Node.js module scoping in worker threads! 
         * Workers load their own separate instances of modules with separate memory spaces.
         * So we must pass the appUserDataDir to the worker thread through main thread. 
         */
        const appUserDataDir = getAppUserDataDir();

        // Reuse the worker thread if it exists
        const worker = initTTSWorker();

        return new Promise((resolve, reject) => {
            // Send text to worker to process
            worker.postMessage({
                text: text,
                voice: voice,
                dir: appUserDataDir,
                prefix: filePrefix
            });

            // Handle worker response
            const messageHandler = (progress) => {
                // Check if sender is still valid before sending
                if (!event.sender.isDestroyed()) {
                    // Forward progress to renderer
                    event.sender.send('tts-progress', progress);
                }
                // Remove the listener after handling the message
                worker.removeListener('message', messageHandler);
                resolve(progress.message);
            };

            worker.on('message', messageHandler);
        });
    });

    // Add handler for fetching voices (optional if you have a static list)
    ipcMain.handle('get-available-voices', async (event) => {
        return loadVoices(event.sender);
    });

    // Add handler for opening file location
    ipcMain.on('open-file-location', async (event, filePath) => {
        const folderPath = getAppUserDataDir();
        shell.openPath(folderPath);
    });

    // Add handler for getting audio files list
    ipcMain.handle('get-audio-files-list', async () => {
        const fs = require('fs/promises');
        const path = require('path');
        const { getAppUserDataDir } = require('./utils');

        try {
            const appUserDataDir = getAppUserDataDir();
            const files = await fs.readdir(appUserDataDir);

            // Filter for .wav files and get their stats
            const audioFiles = [];
            for (const file of files) {
                if (file.endsWith('.wav')) {
                    const filePath = path.join(appUserDataDir, file);
                    const stats = await fs.stat(filePath);
                    audioFiles.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    });
                }
            }

            // Sort by creation date (newest first)
            audioFiles.sort((a, b) => b.created - a.created);

            return audioFiles;
        } catch (error) {
            console.error('Error reading audio files:', error);
            return [];
        }
    });
}

function teardownTTSHandlers() {
    if (ttsWorker) {
        ttsWorker.terminate();
        ttsWorker = null;
    }
}

module.exports = {
    setupTTSHandlers,
    teardownTTSHandlers
};
