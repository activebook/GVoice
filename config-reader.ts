import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Voice {
  name: string;
  description?: string;
}

interface GoogleTTS {
  voices: Voice[];
  [key: string]: any;
}

/**
 * Simple YAML parser for basic config files
 * This is a basic implementation - for production use, consider js-yaml library
 */
function parseSimpleYaml(yamlContent: string): any {
  const lines = yamlContent.split('\n');
  const result: any = {};

  // Parse the YAML content
  let currentSection: GoogleTTS | null = null;
  let inVoicesSection = false;
  const voices: Voice[] = [];
  let currentVoice: Voice | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.length - line.trimStart().length;

    // Top level sections
    if (indent === 0 && trimmedLine.endsWith(':')) {
      const sectionName = trimmedLine.slice(0, -1);
      if (sectionName === 'google_tts') {
        result.google_tts = {};
        currentSection = result.google_tts;
        inVoicesSection = false;
      }
      continue;
    }

    // Nested sections in google_tts
    if (indent >= 2 && trimmedLine.endsWith(':')) {
      const sectionName = trimmedLine.slice(0, -1);
      if (sectionName === 'voices') {
        inVoicesSection = true;
        if (currentSection) {
          currentSection.voices = [];
        }
      } else {
        inVoicesSection = false;
      }
      continue;
    }

    // Handle array items in voices section
    if (inVoicesSection && trimmedLine.startsWith('-')) {
      const arrayItem = trimmedLine.substring(1).trim();
      if (arrayItem.includes(':')) {
        const [key, ...valueParts] = arrayItem.split(':');
        let value = valueParts.join(':').trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // This is a new voice object
        if (key.trim() === 'name') {
          currentVoice = { name: value };
          voices.push(currentVoice);
        }
      }
      continue;
    }

    // Handle nested properties in voices section (description, etc.)
    if (inVoicesSection && currentVoice && !trimmedLine.startsWith('-') && trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      let value = valueParts.join(':').trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Add property to the current voice
      if (key.trim() === 'description') {
        currentVoice.description = value;
      }
      continue;
    }

    // Handle regular key-value pairs in google_tts section
    if (!inVoicesSection && trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      let value: any = valueParts.join(':').trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Convert numbers
      if (!isNaN(value) && value !== '') {
        value = Number(value);
      }

      // Convert boolean strings
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      if (currentSection) {
        currentSection[key.trim()] = value;
      }
    }
  }

  // Set the voices array
  if (result.google_tts) {
    result.google_tts.voices = voices;
  }

  return result;
}

/**
 * Read and parse the config.yaml file
 */
function readConfig() {
  try {
    // Use __dirname to get the directory of the compiled file
    // In development: config-reader.ts is in root, so __dirname is root
    // In production: config-reader.js is in lib/, so go up one level to root
    const isProduction = __dirname.includes('/lib') || __dirname.includes('\\lib');
    const configDir = isProduction ? path.join(__dirname, '..') : __dirname;
    const configPath = path.join(configDir, 'config.yaml');

    console.log('Config path:', configPath);
    const yamlContent = fs.readFileSync(configPath, 'utf8');
    const config = parseSimpleYaml(yamlContent);

    console.log('Config loaded successfully:');
    console.log(JSON.stringify(config, null, 2));

    return config;
  } catch (error) {
    console.error('Error reading config.yaml:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Get a specific configuration value
 */
function getConfigValue(section, key) {
  const config = readConfig();
  if (!config || !config[section]) {
    return null;
  }
  return config[section][key] || null;
}

/**
 * Get all voices from config
 */
function getVoices() {
  const config = readConfig();
  return config?.google_tts?.voices || [];
}

/**
 * Get default voice settings
 */
function getDefaultSettings() {
  const config = readConfig();
  if (!config?.google_tts) return null;

  return {
    apiKey: config.google_tts.api_key,
    defaultVoice: config.google_tts.default_voice,
    defaultLanguage: config.google_tts.default_language,
    outputFormat: config.google_tts.output_format,
    sampleRate: config.google_tts.sample_rate,
    nameModel: config.google_tts.name_model,
    namePrompt: config.google_tts.name_prompt
  };
}

export {
  readConfig,
  getConfigValue,
  getVoices,
  getDefaultSettings
};
