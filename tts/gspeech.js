import { GoogleGenAI } from "@google/genai";
import { ProxyAgent, setGlobalDispatcher } from 'undici';

// Conditionally set proxy based on environment variables
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

if (proxyUrl) {
  const proxyAgent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(proxyAgent);
  console.log(`Using proxy from environment variable: ${proxyUrl}`);
} else {
  console.log('No proxy environment variable found. Proceeding without proxy.');
}

import fs from "fs";
import wav from "wav";

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

async function run() {
  try {
    const textToSpeak = process.argv[2];

    if (!textToSpeak) {
      console.error('Usage: node generate_speech.js "Your text here"');
      process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey: "AIzaSyDSUgjxHZiuENPHrHJl9nbLb0uAc6Vdz1M" });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Generate this audio in a formal, clear, and objective news-reporting style: ${textToSpeak}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const audioBuffer = Buffer.from(data, 'base64');
    const fileName = 'output.wav';
    await saveWaveFile(fileName, audioBuffer);
    console.log("Audio file created at:", fileName);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();