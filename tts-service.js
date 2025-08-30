// tts-service.js
/**
 * TTS Service using Google GenAI
 */
const { ipcMain, shell } = require('electron');
const { getVoices, getDefaultSettings } = require('./config-reader');
const { getAppUserDataDir } = require('./utils');
const { generateSpeech } = require('./tts-worker');
const STATUS = require('./status');

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
    ipcMain.handle('convert-text-to-speech', async (event, text, voice, filePrefix, settings) => {
        const appUserDataDir = getAppUserDataDir();

        if (text.trim() === "") {
            const progress = {
                status: STATUS.TTS_SERVICE_STATUS_ERROR,
                message: "No text provided to TTS"
            };
            if (!event.sender.isDestroyed()) {
                event.sender.send('tts-progress', progress);
            }
            throw new Error(progress.message);
        }

        if (!voice || (voice && voice.trim() === "")) {
            // First check if defaultVoice is set in user settings
            if (settings && settings.defaultVoice) {
                voice = settings.defaultVoice;
            } else {
                // Fall back to config default
                const defaultSettings = getDefaultSettings();
                voice = defaultSettings?.defaultVoice || 'Kore';
            }
        }

        if (!filePrefix || (filePrefix && filePrefix.trim() === "")) {
            filePrefix = 'voice';
        }

        console.log('Received TTS request:', text);

        try {
            if (!event.sender.isDestroyed()) {
                event.sender.send('tts-progress', { status: STATUS.TTS_SERVICE_STATUS_START, message: 'Starting TTS...' });
            }

            const outputPath = await generateSpeech(text, voice, appUserDataDir, filePrefix, settings);

            if (!event.sender.isDestroyed()) {
                event.sender.send('tts-progress', { status: STATUS.TTS_SERVICE_STATUS_DONE, message: outputPath });
            }

            return outputPath;
        } catch (error) {
            const progress = {
                status: STATUS.TTS_SERVICE_STATUS_ERROR,
                message: `Error generating speech: ${error.message}`
            };
            if (!event.sender.isDestroyed()) {
                event.sender.send('tts-progress', progress);
            }
            throw error;
        }
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
    // No worker to terminate
}

module.exports = {
    setupTTSHandlers,
    teardownTTSHandlers
};
