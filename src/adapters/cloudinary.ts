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
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${this.folder}/${name}.png`;
  }

  async upload(filePath: string, name: string, outputPath: string): Promise<AdapterUploadResult> {
    const expectedUrl = this.getExpectedUrl(name);
    
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: name,
      folder: this.folder,
      overwrite: true,
      resource_type: 'image',
      format: 'png'
    });
    
    // Verify the URL matches our expected formula
    if (result.secure_url !== expectedUrl) {
      throw new Error(
        `URL mismatch: expected ${expectedUrl} but got ${result.secure_url}. ` +
        `This indicates a naming drift that would break deterministic URLs.`
      );
    }
    
    return {
      url: result.secure_url,
      path: outputPath
    };
  }
}
