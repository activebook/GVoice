import { GoogleGenAI } from "@google/genai";
import path from 'path';
import wav from 'wav';
import { getDefaultSettings } from './config-reader.js';

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
