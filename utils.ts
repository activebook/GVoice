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

async function generateFilename(text = '', prefix = 'speech', apiKey?: string, model?: string, namePrompt?: string): Promise<string> {
    const now = new Date();

    // Format: YYMMDD-HHMMSS
    const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    let textPrefix = prefix; // fallback to original prefix

    // Try AI-generated filename first if API key is available
    if (apiKey && apiKey !== 'your_google_ai_api_key_here' && text && text.trim()) {
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const prompt = namePrompt || "Generate a short filename around 5-10 words for the following content:";
            const response = await ai.models.generateContent({
                model: model || "gemini-2.0-flash",
                contents: `${prompt} ${text}`,
            });

            if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                const aiFilename = response.candidates[0].content.parts[0].text.trim();
                // Clean the AI-generated filename: remove extra whitespace, punctuation, and convert to lowercase
                textPrefix = aiFilename
                    .toLowerCase()
                    .replace(/[^\w\s]/g, '') // Remove punctuation
                    .replace(/\s+/g, '_') // Replace spaces with underscores
                    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

                // Limit to reasonable length
                if (textPrefix.length > 50) {
                    textPrefix = textPrefix.substring(0, 50);
                }

                console.log(`AI-generated filename prefix: ${textPrefix}`);
            }
        } catch (error) {
            console.warn('AI filename generation failed, falling back to text-based method:', error instanceof Error ? error.message : String(error));
        }
    }

    // Fallback to text-based method if AI failed or no API key
    if (textPrefix === prefix && text && text.trim()) {
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

    return `${timestamp}_${textPrefix}.wav`;
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
