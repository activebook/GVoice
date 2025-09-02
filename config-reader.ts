import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));



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
    const config = yaml.load(yamlContent);

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
