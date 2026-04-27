import { v2 as cloudinary } from 'cloudinary';
import { BaseAdapter } from './base.js';

class CloudinaryAdapter extends BaseAdapter {
  constructor(options, env) {
    super(options, env);
    
    // Validate required environment variables
    const missing = [];
    if (!env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    this.cloudName = env.CLOUDINARY_CLOUD_NAME;
    this.folder = options.folder;
    
    // Configure cloudinary
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET
    });
  }

  getExpectedUrl(name) {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${this.folder}/${name}.png`;
  }

  async upload(filePath, name, outputPath) {
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

export { CloudinaryAdapter };
