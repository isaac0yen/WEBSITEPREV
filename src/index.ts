import { run } from './core/runner.js';
import type { RunOptions, RunResult, Config, Shot, BrowserConfig, ShotResult, Manifest } from './types/index.js';

/**
 * Programmatic API for websiteprev
 * @param options - Configuration options
 * @param options.config - Path to config file
 * @param options.env - Environment variables (usually process.env)
 * @returns Run result with success status and shot details
 */
export async function websiteprev(options: RunOptions = {}): Promise<RunResult> {
  return run(options);
}

export { run } from './core/runner.js';
export { loadConfig } from './core/config.js';

// Re-export types
export type { RunOptions, RunResult, Config, Shot, BrowserConfig, ShotResult, Manifest };
