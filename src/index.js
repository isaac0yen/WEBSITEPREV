import { run } from './core/runner.js';

/**
 * Programmatic API for websiteprev
 * @param {Object} options
 * @param {string|Object} options.config - Path to config file or config object
 * @param {Object} options.env - Environment variables (usually process.env)
 */
export async function websiteprev(options = {}) {
  const { config, env = process.env } = options;
  
  // If config is an object, we need to handle it differently
  // For now, assume it's a path string
  return run({
    config: typeof config === 'string' ? config : undefined,
    env,
    configObject: typeof config === 'object' ? config : undefined
  });
}

export { run } from './core/runner.js';
export { loadConfig } from './core/config.js';
