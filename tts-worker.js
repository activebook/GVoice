const { GoogleGenAI } = require("@google/genai");
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const { parentPort } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const wav = require('wav');
const { generateFilename } = require('./utils.js');
const { getDefaultSettings } = require('./config-reader.js');
const STATUS = require('./status.js');

// Conditionally set proxy based on environment variables
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

if (proxyUrl) {
  const proxyAgent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(proxyAgent);
  console.log(`Using proxy from environment variable: ${proxyUrl}`);
} else {
  console.log('No proxy environment variable found. Proceeding without proxy.');
}

async function saveWaveFile(
  filename,
  pcmData,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
) {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    writer.on('finish', resolve);
    writer.on('error', reject);
    writer.write(pcmData);
    writer.end();
  });
}

async function generateSpeech(text, voice, dir, prefix) {
    try {
        const filename = generateFilename(prefix);
        const outputPath = path.join(dir, filename);

        // Get API key from config
        const defaultSettings = getDefaultSettings();
        const apiKey = defaultSettings?.apiKey;

        if (!apiKey || apiKey === 'your_google_ai_api_key_here') {
            throw new Error('Google AI API key not configured. Please set your API key in config.yaml');
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Generate this audio in a formal, clear, and objective news-reporting style: ${text}` }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });

        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!data) {
            throw new Error('No audio data received from Google AI');
        }

        const audioBuffer = Buffer.from(data, 'base64');
        await saveWaveFile(outputPath, audioBuffer);

        console.log(`Generated speech saved to ${outputPath}`);

        // Send result back to main thread
        const progress = {
            status: STATUS.TTS_SERVICE_STATUS_DONE,
            message: outputPath
        };
        if (parentPort) parentPort.postMessage(progress);

        return outputPath;
    } catch (error) {
        const progress = {
            status: STATUS.TTS_SERVICE_STATUS_ERROR,
            message: `Error generating speech: ${error.message}`
        };
        if (parentPort) parentPort.postMessage(progress);
        console.error('TTS job failed:', progress.message);
    }
}

parentPort.on('message', async (data) => {
    let { text, voice, dir, prefix } = data;

    if (text.trim() === "") {
        const progress = {
            status: STATUS.TTS_SERVICE_STATUS_ERROR,
            message: "No text provided to TTS"
        };
        parentPort.postMessage(progress);
        return;
    }

    if (!voice || (voice && voice.trim() === "")) {
        const defaultSettings = getDefaultSettings();
        voice = defaultSettings?.defaultVoice || 'Kore';
    }

    if (!prefix || (prefix && prefix.trim() === "")) {
        prefix = 'voice';
    }

    console.log('Received TTS request:', text);

    // Don't need to await
    generateSpeech(text, voice, dir, prefix);
});


/**
 * =================================
 * Blow down here is for testing purposes only
 * Comment out the following line to test
 * import { ipcMain } from 'electron'
 * =================================
 */

const { exec } = require('child_process');

function playAudio(path) {
    return new Promise((resolve, reject) => {
        const playCommand = process.platform === 'win32'
            ? `start /B powershell -c (New-Object Media.SoundPlayer \'${path}\').PlaySync()`
            : process.platform === 'darwin'
                ? `afplay ${path}`
                : `aplay ${path}`;

        exec(playCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function test() {
    // need to commend out the following line
    //import { ipcMain } from 'electron'
    const text = 'Hello, this is Kokoro TTS in Node.js.';
    const filepath = await generateSpeech(text);
    await playAudio(filepath);
}
//test();
