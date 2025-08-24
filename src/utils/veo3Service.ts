export interface Veo3VideoResult {
  videoBlob: Blob;
  duration: number;
  fps: number;
}

export class Veo3Service {
  private backendUrl: string;

  constructor() {
    this.backendUrl = 'http://localhost:3001';
  }

  async generateVideoFromImage(
    prompt: string,
    imageBase64: string,
    duration: number = 5
  ): Promise<Veo3VideoResult> {
    try {
      console.log('🚀 Starting Veo3 image-to-video generation...', {
        prompt,
        duration,
        imageSize: imageBase64.length
      });

      // Compress the image to reduce size
      const compressedImage = await this.compressImage(imageBase64);
      console.log('📦 Image compressed:', {
        originalSize: imageBase64.length,
        compressedSize: compressedImage.length,
        reduction: `${((1 - compressedImage.length / imageBase64.length) * 100).toFixed(1)}%`
      });

      console.log('📤 Sending request to backend...');

      // Make the API call to our Express backend
      const response = await fetch(`${this.backendUrl}/api/generate-video-veo3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          imageBase64: compressedImage,
          duration
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('✅ Backend API call successful, downloading video...');

      // Get the video blob from the response
      const videoBlob = await response.blob();

      console.log('✅ Video generation completed:', {
        videoSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
        duration
      });

      return {
        videoBlob,
        duration,
        fps: 24 // Veo3 default FPS
      };

    } catch (error) {
      console.error('❌ Error generating video with Veo3:', error);
      throw new Error(`Veo3 video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async compressImage(base64String: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set maximum dimensions to reduce size
        const maxWidth = 1024;
        const maxHeight = 768;
        
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress the image
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with lower quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.src = base64String;
    });
  }

  // Alternative method for frame interpolation
  async generateVideoWithFrameInterpolation(
    prompt: string,
    startFrame: string,
    endFrame: string,
    duration: number
  ): Promise<Veo3VideoResult> {
    try {
      console.log('🎬 Starting Veo3 frame interpolation...');

      // For frame interpolation, we'll use the start frame and enhance the prompt
      const enhancedPrompt = `${prompt}. The video should smoothly transition from the starting frame to a scene that matches the ending frame over ${duration} seconds.`;

      return await this.generateVideoFromImage(enhancedPrompt, startFrame, duration);

    } catch (error) {
      console.error('❌ Error in Veo3 frame interpolation:', error);
      throw new Error(`Veo3 frame interpolation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

