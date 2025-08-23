// Platform Service for Multi-Platform Distribution
// This service handles video formatting and distribution to various social platforms

export interface PlatformConfig {
  name: string;
  displayName: string;
  icon: string;
  maxDuration: number; // in seconds
  aspectRatios: AspectRatio[];
  preferredAspectRatio: AspectRatio;
  maxFileSize: number; // in MB
  supportedFormats: VideoFormat[];
  preferredFormat: VideoFormat;
  requiresCaptions: boolean;
  maxCaptionLength: number;
  hashtagLimit: number;
  features: PlatformFeatures;
}

export interface AspectRatio {
  width: number;
  height: number;
  label: string;
}

export interface VideoFormat {
  container: 'mp4' | 'mov' | 'webm' | 'avi';
  codec: string;
  bitrate: number;
  fps: number;
}

export interface PlatformFeatures {
  supportsScheduling: boolean;
  supportsAnalytics: boolean;
  supportsThumbnail: boolean;
  supportsHashtags: boolean;
  supportsMentions: boolean;
  supportsLocation: boolean;
  supportsPolls: boolean;
  supportsStickers: boolean;
}

export interface UploadOptions {
  title: string;
  description: string;
  hashtags: string[];
  thumbnail?: Blob;
  scheduledTime?: Date;
  location?: string;
  mentions?: string[];
  isPrivate?: boolean;
}

export interface PlatformCredentials {
  platform: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  userId?: string;
  expiresAt?: Date;
}

// Platform configurations
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  youtube: {
    name: 'youtube',
    displayName: 'YouTube',
    icon: '📺',
    maxDuration: 43200, // 12 hours
    aspectRatios: [
      { width: 16, height: 9, label: 'Landscape (16:9)' },
      { width: 4, height: 3, label: 'Standard (4:3)' },
    ],
    preferredAspectRatio: { width: 16, height: 9, label: 'Landscape (16:9)' },
    maxFileSize: 128000, // 128 GB
    supportedFormats: [
      { container: 'mp4', codec: 'h264', bitrate: 8000000, fps: 60 },
      { container: 'mov', codec: 'h264', bitrate: 8000000, fps: 60 },
    ],
    preferredFormat: { container: 'mp4', codec: 'h264', bitrate: 8000000, fps: 60 },
    requiresCaptions: false,
    maxCaptionLength: 5000,
    hashtagLimit: 30,
    features: {
      supportsScheduling: true,
      supportsAnalytics: true,
      supportsThumbnail: true,
      supportsHashtags: true,
      supportsMentions: false,
      supportsLocation: true,
      supportsPolls: false,
      supportsStickers: false,
    },
  },
  youtubeShorts: {
    name: 'youtubeShorts',
    displayName: 'YouTube Shorts',
    icon: '📱',
    maxDuration: 60,
    aspectRatios: [
      { width: 9, height: 16, label: 'Vertical (9:16)' },
    ],
    preferredAspectRatio: { width: 9, height: 16, label: 'Vertical (9:16)' },
    maxFileSize: 128000,
    supportedFormats: [
      { container: 'mp4', codec: 'h264', bitrate: 8000000, fps: 60 },
    ],
    preferredFormat: { container: 'mp4', codec: 'h264', bitrate: 8000000, fps: 60 },
    requiresCaptions: false,
    maxCaptionLength: 100,
    hashtagLimit: 30,
    features: {
      supportsScheduling: false,
      supportsAnalytics: true,
      supportsThumbnail: false,
      supportsHashtags: true,
      supportsMentions: false,
      supportsLocation: false,
      supportsPolls: false,
      supportsStickers: false,
    },
  },
  tiktok: {
    name: 'tiktok',
    displayName: 'TikTok',
    icon: '🎵',
    maxDuration: 600, // 10 minutes
    aspectRatios: [
      { width: 9, height: 16, label: 'Vertical (9:16)' },
    ],
    preferredAspectRatio: { width: 9, height: 16, label: 'Vertical (9:16)' },
    maxFileSize: 287, // 287.6 MB
    supportedFormats: [
      { container: 'mp4', codec: 'h264', bitrate: 6000000, fps: 30 },
    ],
    preferredFormat: { container: 'mp4', codec: 'h264', bitrate: 6000000, fps: 30 },
    requiresCaptions: true,
    maxCaptionLength: 2200,
    hashtagLimit: 100,
    features: {
      supportsScheduling: false,
      supportsAnalytics: true,
      supportsThumbnail: false,
      supportsHashtags: true,
      supportsMentions: true,
      supportsLocation: true,
      supportsPolls: false,
      supportsStickers: true,
    },
  },
  instagram: {
    name: 'instagram',
    displayName: 'Instagram Reels',
    icon: '📸',
    maxDuration: 90,
    aspectRatios: [
      { width: 9, height: 16, label: 'Vertical (9:16)' },
      { width: 1, height: 1, label: 'Square (1:1)' },
    ],
    preferredAspectRatio: { width: 9, height: 16, label: 'Vertical (9:16)' },
    maxFileSize: 650, // 650 MB
    supportedFormats: [
      { container: 'mp4', codec: 'h264', bitrate: 5000000, fps: 30 },
    ],
    preferredFormat: { container: 'mp4', codec: 'h264', bitrate: 5000000, fps: 30 },
    requiresCaptions: true,
    maxCaptionLength: 2200,
    hashtagLimit: 30,
    features: {
      supportsScheduling: true,
      supportsAnalytics: true,
      supportsThumbnail: true,
      supportsHashtags: true,
      supportsMentions: true,
      supportsLocation: true,
      supportsPolls: false,
      supportsStickers: true,
    },
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    icon: '💼',
    maxDuration: 600, // 10 minutes
    aspectRatios: [
      { width: 16, height: 9, label: 'Landscape (16:9)' },
      { width: 1, height: 1, label: 'Square (1:1)' },
      { width: 9, height: 16, label: 'Vertical (9:16)' },
    ],
    preferredAspectRatio: { width: 16, height: 9, label: 'Landscape (16:9)' },
    maxFileSize: 5000, // 5 GB
    supportedFormats: [
      { container: 'mp4', codec: 'h264', bitrate: 10000000, fps: 30 },
    ],
    preferredFormat: { container: 'mp4', codec: 'h264', bitrate: 10000000, fps: 30 },
    requiresCaptions: false,
    maxCaptionLength: 3000,
    hashtagLimit: 30,
    features: {
      supportsScheduling: true,
      supportsAnalytics: true,
      supportsThumbnail: true,
      supportsHashtags: true,
      supportsMentions: true,
      supportsLocation: false,
      supportsPolls: true,
      supportsStickers: false,
    },
  },
  twitter: {
    name: 'twitter',
    displayName: 'X (Twitter)',
    icon: '🐦',
    maxDuration: 140,
    aspectRatios: [
      { width: 16, height: 9, label: 'Landscape (16:9)' },
      { width: 1, height: 1, label: 'Square (1:1)' },
    ],
    preferredAspectRatio: { width: 16, height: 9, label: 'Landscape (16:9)' },
    maxFileSize: 512,
    supportedFormats: [
      { container: 'mp4', codec: 'h264', bitrate: 2000000, fps: 30 },
    ],
    preferredFormat: { container: 'mp4', codec: 'h264', bitrate: 2000000, fps: 30 },
    requiresCaptions: false,
    maxCaptionLength: 280,
    hashtagLimit: 10,
    features: {
      supportsScheduling: true,
      supportsAnalytics: true,
      supportsThumbnail: false,
      supportsHashtags: true,
      supportsMentions: true,
      supportsLocation: true,
      supportsPolls: true,
      supportsStickers: false,
    },
  },
};

export class PlatformService {
  private credentials: Map<string, PlatformCredentials> = new Map();

  // MCP Integration Point - This will connect to MCP servers for each platform
  async connectPlatform(platform: string, credentials: PlatformCredentials): Promise<void> {
    // Store credentials securely
    this.credentials.set(platform, credentials);
    
    // In production, this would validate the credentials with the platform
    console.log(`Connected to ${platform}`);
  }

  async disconnectPlatform(platform: string): Promise<void> {
    this.credentials.delete(platform);
    console.log(`Disconnected from ${platform}`);
  }

  isConnected(platform: string): boolean {
    return this.credentials.has(platform);
  }

  getConnectedPlatforms(): string[] {
    return Array.from(this.credentials.keys());
  }

  // Format video for specific platform
  async formatVideoForPlatform(
    videoBlob: Blob,
    platform: string,
    targetAspectRatio?: AspectRatio
  ): Promise<Blob> {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      throw new Error(`Platform ${platform} not supported`);
    }

    // This would use FFmpeg to reformat the video
    // For now, we'll return the original blob
    // In production, this would:
    // 1. Change aspect ratio
    // 2. Adjust bitrate
    // 3. Ensure correct codec
    // 4. Trim to max duration
    
    console.log(`Formatting video for ${platform}`, {
      targetAspectRatio: targetAspectRatio || config.preferredAspectRatio,
      maxDuration: config.maxDuration,
      format: config.preferredFormat,
    });

    return videoBlob;
  }

  // Generate platform-specific metadata
  generateMetadata(platform: string, options: UploadOptions): Record<string, any> {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      throw new Error(`Platform ${platform} not supported`);
    }

    const metadata: Record<string, any> = {
      title: options.title,
      description: options.description,
    };

    // Add platform-specific fields
    if (config.features.supportsHashtags && options.hashtags) {
      metadata.hashtags = options.hashtags.slice(0, config.hashtagLimit);
    }

    if (config.features.supportsScheduling && options.scheduledTime) {
      metadata.scheduledTime = options.scheduledTime.toISOString();
    }

    if (config.features.supportsLocation && options.location) {
      metadata.location = options.location;
    }

    if (config.features.supportsMentions && options.mentions) {
      metadata.mentions = options.mentions;
    }

    return metadata;
  }

  // Upload to platform (MCP integration point)
  async uploadToPlatform(
    platform: string,
    videoBlob: Blob,
    options: UploadOptions
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const credentials = this.credentials.get(platform);
    if (!credentials) {
      return { success: false, error: `Not connected to ${platform}` };
    }

    try {
      // Format video for platform
      const formattedVideo = await this.formatVideoForPlatform(videoBlob, platform);
      
      // Generate metadata
      const metadata = this.generateMetadata(platform, options);

      // MCP Integration: This would send to MCP server
      // which would handle the actual API calls to each platform
      console.log(`Uploading to ${platform}`, {
        videoSize: formattedVideo.size,
        metadata,
      });

      // Simulate upload
      // In production, this would make actual API calls
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        url: `https://${platform}.com/video/${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Batch upload to multiple platforms
  async uploadToMultiplePlatforms(
    platforms: string[],
    videoBlob: Blob,
    options: UploadOptions
  ): Promise<Map<string, { success: boolean; url?: string; error?: string }>> {
    const results = new Map();

    // Upload to each platform in parallel
    const uploads = platforms.map(async (platform) => {
      const result = await this.uploadToPlatform(platform, videoBlob, options);
      results.set(platform, result);
    });

    await Promise.all(uploads);
    return results;
  }

  // Get optimal upload settings for a platform
  getOptimalSettings(platform: string, videoDuration: number): {
    aspectRatio: AspectRatio;
    needsTrimming: boolean;
    suggestedTrimDuration?: number;
  } {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      throw new Error(`Platform ${platform} not supported`);
    }

    return {
      aspectRatio: config.preferredAspectRatio,
      needsTrimming: videoDuration > config.maxDuration,
      suggestedTrimDuration: Math.min(videoDuration, config.maxDuration),
    };
  }

  // Validate video for platform requirements
  validateVideo(platform: string, videoBlob: Blob, duration: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      return {
        isValid: false,
        errors: [`Platform ${platform} not supported`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    const fileSizeMB = videoBlob.size / (1024 * 1024);
    if (fileSizeMB > config.maxFileSize) {
      errors.push(`File size ${fileSizeMB.toFixed(2)}MB exceeds maximum ${config.maxFileSize}MB`);
    }

    // Check duration
    if (duration > config.maxDuration) {
      errors.push(`Duration ${duration}s exceeds maximum ${config.maxDuration}s`);
    }

    // Check format (simplified check)
    if (!videoBlob.type.includes('video/')) {
      errors.push('File is not a video');
    }

    // Warnings
    if (config.requiresCaptions) {
      warnings.push('This platform requires captions for better engagement');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Singleton instance
export const platformService = new PlatformService();