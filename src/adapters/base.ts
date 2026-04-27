import type { AdapterUploadResult } from '../types/index.js';

export abstract class BaseAdapter {
  protected options: Record<string, unknown>;
  protected env: Record<string, string | undefined>;

  constructor(options: Record<string, unknown> | undefined, env: Record<string, string | undefined>) {
    this.options = options || {};
    this.env = env || {};
  }

  /**
   * Upload a screenshot file
   * @param filePath - Absolute path to the temp PNG on disk
   * @param name - Shot name slug
   * @param outputPath - Shot output path (codebase reference)
   * @returns Upload result with URL and path
   */
  abstract upload(filePath: string, name: string, outputPath: string): Promise<AdapterUploadResult>;

  /**
   * Get the deterministic URL for a shot before upload
   * @param name - Shot name slug
   * @returns URL or null for filesystem adapter
   */
  abstract getExpectedUrl(name: string): string | null;
}
