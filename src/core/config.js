import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';

const DEFAULT_BROWSER_CONFIG = {
  width: 1280,
  height: 800,
  fullPage: true,
  waitUntil: 'networkidle2',
  delayMs: 0
};

function validateShot(shot, index) {
  const errors = [];
  
  if (!shot.url || typeof shot.url !== 'string') {
    errors.push(`shots[${index}].url is required and must be a string`);
  }
  
  if (!shot.name || typeof shot.name !== 'string') {
    errors.push(`shots[${index}].name is required and must be a string`);
  } else if (!/^[a-z0-9-]+$/.test(shot.name)) {
    errors.push(`shots[${index}].name must be lowercase with no spaces or special characters except hyphens`);
  }
  
  if (!shot.output || typeof shot.output !== 'string') {
    errors.push(`shots[${index}].output is required and must be a string`);
  }
  
  if (shot.browser) {
    if (shot.browser.width !== undefined && typeof shot.browser.width !== 'number') {
      errors.push(`shots[${index}].browser.width must be a number`);
    }
    if (shot.browser.height !== undefined && typeof shot.browser.height !== 'number') {
      errors.push(`shots[${index}].browser.height must be a number`);
    }
    if (shot.browser.fullPage !== undefined && typeof shot.browser.fullPage !== 'boolean') {
      errors.push(`shots[${index}].browser.fullPage must be a boolean`);
    }
    if (shot.browser.waitUntil !== undefined && typeof shot.browser.waitUntil !== 'string') {
      errors.push(`shots[${index}].browser.waitUntil must be a string`);
    }
    if (shot.browser.delayMs !== undefined && typeof shot.browser.delayMs !== 'number') {
      errors.push(`shots[${index}].browser.delayMs must be a number`);
    }
  }
  
  return errors;
}

function validateConfig(config) {
  const errors = [];
  
  if (!config.storage || typeof config.storage !== 'object') {
    errors.push('storage is required and must be an object');
  } else {
    if (!config.storage.adapter || !['filesystem', 'cloudinary'].includes(config.storage.adapter)) {
      errors.push('storage.adapter must be "filesystem" or "cloudinary"');
    }
    
    if (config.storage.adapter === 'cloudinary') {
      if (!config.storage.options || !config.storage.options.folder) {
        errors.push('storage.options.folder is required when adapter is "cloudinary"');
      }
    }
  }
  
  if (!config.shots || !Array.isArray(config.shots)) {
    errors.push('shots is required and must be an array');
  } else if (config.shots.length === 0) {
    errors.push('shots array must contain at least one shot');
  } else {
    config.shots.forEach((shot, index) => {
      errors.push(...validateShot(shot, index));
    });
  }
  
  if (config.browser) {
    if (config.browser.width !== undefined && typeof config.browser.width !== 'number') {
      errors.push('browser.width must be a number');
    }
    if (config.browser.height !== undefined && typeof config.browser.height !== 'number') {
      errors.push('browser.height must be a number');
    }
    if (config.browser.fullPage !== undefined && typeof config.browser.fullPage !== 'boolean') {
      errors.push('browser.fullPage must be a boolean');
    }
    if (config.browser.waitUntil !== undefined && typeof config.browser.waitUntil !== 'string') {
      errors.push('browser.waitUntil must be a string');
    }
    if (config.browser.delayMs !== undefined && typeof config.browser.delayMs !== 'number') {
      errors.push('browser.delayMs must be a number');
    }
  }
  
  return errors;
}

export async function loadConfig(configPath = './websiteprev.config.json') {
  const absolutePath = resolve(configPath);
  
  if (!existsSync(absolutePath)) {
    throw new Error(`websiteprev.config.json not found. Run 'websiteprev init' to create one.`);
  }
  
  const content = await readFile(absolutePath, 'utf-8');
  let config;
  
  try {
    config = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in config file: ${e.message}`);
  }
  
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.join('\n')}`);
  }
  
  // Merge with defaults
  config.browser = { ...DEFAULT_BROWSER_CONFIG, ...config.browser };
  config.shots = config.shots.map(shot => ({
    ...shot,
    browser: { ...config.browser, ...shot.browser }
  }));
  
  config._projectRoot = dirname(absolutePath);
  config._configPath = absolutePath;
  
  return config;
}

export function validateConfigOnly(configPath = './websiteprev.config.json') {
  const errors = [];
  const absolutePath = resolve(configPath);
  
  if (!existsSync(absolutePath)) {
    return [`Config file not found: ${absolutePath}`];
  }
  
  try {
    const content = require('fs').readFileSync(absolutePath, 'utf-8');
    const config = JSON.parse(content);
    return validateConfig(config);
  } catch (e) {
    return [e.message];
  }
}
