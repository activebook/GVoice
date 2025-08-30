import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

/**
 * Utility function to pause execution for a specified time
 * @param ms - Time to sleep in milliseconds
 * @returns Promise that resolves after the specified time
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let appUserDataDir = '';
function getAppUserDataDir(): string {
    return appUserDataDir;
}
function setAppUserDataDir(dir: string): void {
    appUserDataDir = dir;
}



async function loadConfig(): Promise<any> {
    try {
        // Load base config from YAML
        const configPath = path.join(process.cwd(), 'config.yaml');
        const configFile = await fs.readFile(configPath, 'utf8');
        // For now, return a basic config structure
        // The config-reader.js handles the actual YAML parsing
        return {
            tts: {
                voices: ['Kore'], // Default voice
                prefix: 'voice'
            }
        };
    } catch (err) {
        console.error('Error loading config:', err);
        return {
            tts: {
                voices: ['Kore'],
                prefix: 'voice'
            }
        };
    }
}

export {
    sleep,
    getAppUserDataDir,
    setAppUserDataDir,
    loadConfig
};
