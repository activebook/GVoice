const { GoogleGenAI } = require("@google/genai");
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const path = require('path');
const fs = require('fs');
const wav = require('wav');
const { generateFilename } = require('./utils.js');
const { getDefaultSettings } = require('./config-reader.js');

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

async function generateSpeech(text, voice, dir, prefix, settings = {}) {
    const filename = generateFilename(prefix);
    const outputPath = path.join(dir, filename);

    // Get settings from parameters, fallback to config
    const apiKey = settings.apiKey || getDefaultSettings()?.apiKey;
    const ttsEngine = settings.ttsEngine || 'gemini-2.5-flash-preview-tts';
    const speechStyle = settings.speechStyle || 'Generate this audio in a formal, clear, and objective news-reporting style';

    if (!apiKey || apiKey === 'your_google_ai_api_key_here') {
        throw new Error('Google AI API key not configured. Please set your API key in settings.');
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Prepare the text with speech style
    const styledText = speechStyle ? `${speechStyle}: ${text}` : text;

    console.log('Making API call with:', {
        model: ttsEngine,
        text: styledText.substring(0, 100) + '...', // Log first 100 chars
        voice: voice
    });

    const response = await ai.models.generateContent({
        model: ttsEngine,
        contents: [{ parts: [{ text: styledText }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });

    console.log('API Response structure:', JSON.stringify(response, null, 2));

    // Try different possible response structures
    let data = null;

    // Try the expected structure first
    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        data = response.candidates[0].content.parts[0].inlineData.data;
    }
    // Try alternative structures
    else if (response.candidates?.[0]?.content?.parts?.[0]?.data) {
        data = response.candidates[0].content.parts[0].data;
    }
    else if (response.candidates?.[0]?.inlineData?.data) {
        data = response.candidates[0].inlineData.data;
    }
    else if (response.inlineData?.data) {
        data = response.inlineData.data;
    }

    if (!data) {
        console.error('Response candidates:', response.candidates);
        console.error('Response content:', response.candidates?.[0]?.content);
        console.error('Response parts:', response.candidates?.[0]?.content?.parts);
        console.error('Full response:', response);
        throw new Error('No audio data received from Google AI. Check API response structure.');
    }

    const audioBuffer = Buffer.from(data, 'base64');
    await saveWaveFile(outputPath, audioBuffer);

    console.log(`Generated speech saved to ${outputPath}`);

    return outputPath;
}

module.exports = { generateSpeech };




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
    const voice = 'Kore';
    const dir = './'; // or some temp dir
    const prefix = 'test';
    const filepath = await generateSpeech(text, voice, dir, prefix);
    await playAudio(filepath);
}
//test();
