export interface BrowserConfig {
  width: number;
  height: number;
  fullPage: boolean;
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  delayMs: number;
  userAgent?: string;
  extraHeaders?: Record<string, string>;
}

export interface Shot {
  url: string;
  name: string;
  output: string;
  browser?: Partial<BrowserConfig>;
}

export interface StorageConfig {
  adapter: 'filesystem' | 'cloudinary';
  options?: {
    folder?: string;
  };
}

export interface Config {
  storage: StorageConfig;
  browser?: Partial<BrowserConfig>;
  shots: Shot[];
  _projectRoot?: string;
  _configPath?: string;
}

export interface ShotResult {
  name: string;
  url: string;
  output: string;
  remoteUrl: string | null;
  status: 'success' | 'error';
  error?: string;
}

export interface Manifest {
  generated: string;
  adapter: string;
  shots: ShotResult[];
}

export interface RunResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  manifestPath: string;
  results: ShotResult[];
  dryRun?: boolean;
}

export interface RunOptions {
  config?: string;
  env?: Record<string, string | undefined>;
  dryRun?: boolean;
}

export interface AdapterUploadResult {
  url: string | null;
  path: string;
}
