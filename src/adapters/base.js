class BaseAdapter {
  constructor(options, env) {
    this.options = options || {};
    this.env = env || {};
  }

  /**
   * Upload a screenshot file
   * @param {string} filePath - Absolute path to the temp PNG on disk
   * @param {string} name - Shot name slug
   * @param {string} outputPath - Shot output path (codebase reference)
   * @returns {Promise<{ url: string|null, path: string }>}
   */
  async upload(filePath, name, outputPath) {
    throw new Error('upload() must be implemented by adapter');
  }

  /**
   * Get the deterministic URL for a shot before upload
   * @param {string} name - Shot name slug
   * @returns {string|null} - URL or null for filesystem adapter
   */
  getExpectedUrl(name) {
    throw new Error('getExpectedUrl() must be implemented by adapter');
  }
}

export { BaseAdapter };
