import { GoogleGenAI } from "@google/genai";
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import path from 'path';
import wav from 'wav';
import { generateFilename } from './utils.js';
import { getDefaultSettings } from './config-reader.js';

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
  filename: string,
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
): Promise<void> {
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

async function generateSpeech(text: string, voice: string, dir: string, prefix: string, settings: any = {}): Promise<string> {
    // Get settings from config
    const defaultSettings = getDefaultSettings();
    const apiKey = settings.apiKey || defaultSettings?.apiKey;
    const nameModel = settings.nameModel || defaultSettings?.nameModel || 'gemini-2.0-flash';
    const namePrompt = settings.namePrompt || defaultSettings?.namePrompt;
    const filename = await generateFilename(text, prefix, apiKey, nameModel, namePrompt);
    const outputPath = path.join(dir, filename);

    // Get settings from parameters, fallback to config
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

    const response: any = await ai.models.generateContent({
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

    //console.log('API Response structure:', JSON.stringify(response, null, 2));

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

export { generateSpeech };
