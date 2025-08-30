import fs from 'fs/promises';
import path from 'path';

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

function generateFilename(text = '', prefix = 'speech'): string {
    const now = new Date();

    // Format: YYMMDD-HHMMSS
    const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    // Generate prefix from first two words of text
    let textPrefix = prefix; // fallback to original prefix
    if (text && text.trim()) {
        // Clean the text: remove extra whitespace, punctuation, and convert to lowercase
        const cleanText = text.trim().toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' '); // Normalize whitespace

        const words = cleanText.split(' ').filter(word => word.length > 0);

        if (words.length >= 2) {
            // Take first two words and join with underscore
            textPrefix = words.slice(0, 2).join('_');
        } else if (words.length === 1) {
            // If only one word, use it
            textPrefix = words[0];
        }
    }

    return `${textPrefix}_${timestamp}.wav`;
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
    generateFilename,
    loadConfig
};
