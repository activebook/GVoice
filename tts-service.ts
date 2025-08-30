// tts-service.ts
/**
 * TTS Service using Google GenAI
 */
import { ipcMain, shell } from 'electron';
import { promises as fs } from 'fs';
import { join as pathJoin } from 'path';
import { getVoices, getDefaultSettings } from './config-reader.js';
import { getAppUserDataDir } from './utils.js';
import { generateSpeech } from './tts-worker.js';
import { TTS_SERVICE_STATUS_START, TTS_SERVICE_STATUS_DONE, TTS_SERVICE_STATUS_ERROR } from './status.js';

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
                status: TTS_SERVICE_STATUS_ERROR,
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
                event.sender.send('tts-progress', { status: TTS_SERVICE_STATUS_START, message: 'Starting TTS...' });
            }

            const outputPath = await generateSpeech(text, voice, appUserDataDir, filePrefix, settings);

            if (!event.sender.isDestroyed()) {
                event.sender.send('tts-progress', { status: TTS_SERVICE_STATUS_DONE, message: outputPath });
            }

            return outputPath;
        } catch (error) {
            const progress = {
                status: TTS_SERVICE_STATUS_ERROR,
                message: `Error generating speech: ${error instanceof Error ? error.message : String(error)}`
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
        try {
            const appUserDataDir = getAppUserDataDir();
            const files = await fs.readdir(appUserDataDir);

            // Filter for .wav files and get their stats
            const audioFiles: Array<{
                name: string;
                path: string;
                size: number;
                created: Date;
                modified: Date;
            }> = [];
            for (const file of files) {
                if (file.endsWith('.wav')) {
                    const filePath = pathJoin(appUserDataDir, file);
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
            audioFiles.sort((a, b) => b.created.getTime() - a.created.getTime());

            return audioFiles;
        } catch (error) {
            console.error('Error reading audio files:', error instanceof Error ? error.message : String(error));
            return [];
        }
    });
}

function teardownTTSHandlers() {
    // No worker to terminate
}

export {
    setupTTSHandlers,
    teardownTTSHandlers
};
