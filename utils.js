const fs = require('fs/promises');
const path = require('path');

/**
 * Utility function to pause execution for a specified time
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let appUserDataDir = '';
function getAppUserDataDir() {
    return appUserDataDir;
}
function setAppUserDataDir(dir) {
    appUserDataDir = dir;
}

function generateFilename(prefix = 'speech') {
    const now = new Date();

    // Format: YYMMDD-HHMMSS
    const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    return `${prefix}_${timestamp}.wav`;
}

async function loadConfig() {
    try {
        // Load base config from YAML
        const configPath = path.join(__dirname, 'config.yaml');
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

module.exports = {
    sleep,
    getAppUserDataDir,
    setAppUserDataDir,
    generateFilename,
    loadConfig
};
