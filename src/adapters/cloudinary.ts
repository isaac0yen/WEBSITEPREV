import { v2 as cloudinary } from 'cloudinary';
import { BaseAdapter } from './base.js';
import type { AdapterUploadResult } from '../types/index.js';

export class CloudinaryAdapter extends BaseAdapter {
  private cloudName: string;
  private folder: string;

  constructor(options: Record<string, unknown> | undefined, env: Record<string, string | undefined>) {
    super(options, env);
    
    // Validate required environment variables
    const missing: string[] = [];
    if (!env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    this.cloudName = env.CLOUDINARY_CLOUD_NAME as string;
    this.folder = (options?.folder as string) || '';
    
    // Configure cloudinary
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET
    });
  }

  getExpectedUrl(name: string): string {
    // Return the URL without version - this is what users should hardcode
    // Cloudinary will serve the latest version when no version is specified
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${this.folder}/${name}.png`;
  }

  async upload(filePath: string, name: string, outputPath: string): Promise<AdapterUploadResult> {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: name,
      folder: this.folder,
      overwrite: true,
      resource_type: 'image',
      format: 'png',
      invalidate: true  // Invalidate CDN cache to ensure latest version is served
    });
    
    // Cloudinary returns URLs with version numbers (e.g., v1777284122)
    // But we want to return the versionless URL for deterministic usage
    // When you request the versionless URL, Cloudinary serves the latest version
    const versionlessUrl = this.getExpectedUrl(name);
    
    // Verify the returned URL structure matches our expectations (ignoring version)
    const urlPattern = new RegExp(
      `^https://res\\.cloudinary\\.com/${this.cloudName}/image/upload/(v\\d+/)?${this.folder}/${name}\\.png$`
    );
    
    if (!urlPattern.test(result.secure_url)) {
      throw new Error(
        `URL structure mismatch: expected pattern matching ${versionlessUrl} but got ${result.secure_url}. ` +
        `This indicates an unexpected Cloudinary response.`
      );
    }
    
    // Return the versionless URL - this is deterministic and always works
    return {
      url: versionlessUrl,
      path: outputPath
    };
  }
}
