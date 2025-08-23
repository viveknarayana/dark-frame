import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { VideoClip } from '../components/VideoEditor';

class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    this.ffmpeg = new FFmpeg();
    
    // Load FFmpeg
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.initialized = true;
  }

  async trimVideo(
    videoFile: File, 
    clips: VideoClip[], 
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      await this.initialize();
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to initialize');
    }

    if (clips.length === 0) {
      throw new Error('No clips to export. Please add at least one clip before exporting.');
    }

    try {
      // Sort clips by start time
      const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);

      // Write input file
      await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      
      if (onProgress) {
        onProgress(10);
      }

      // Create individual clip segments
      const segmentFiles = [];
      for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const duration = clip.endTime - clip.startTime;
        const segmentFile = `segment_${i}.mp4`;
        
        await this.ffmpeg.exec([
          '-i', 'input.mp4',
          '-ss', clip.startTime.toString(),
          '-t', duration.toString(),
          '-c', 'copy',
          segmentFile
        ]);
        
        segmentFiles.push(segmentFile);
        
        if (onProgress) {
          const progress = 10 + ((i + 1) / sortedClips.length) * 70; // 10% to 80%
          onProgress(progress);
        }
      }

      // Create concat file for FFmpeg
      const concatContent = segmentFiles.map(file => `file '${file}'`).join('\n');
      await this.ffmpeg.writeFile('concat.txt', concatContent);

      if (onProgress) {
        onProgress(85);
      }

      // Concatenate all segments
      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        'output.mp4'
      ]);

      if (onProgress) {
        onProgress(95);
      }

      // Read output file
      const data = await this.ffmpeg.readFile('output.mp4');
      
      // Clean up
      const filesToDelete = ['input.mp4', 'output.mp4', 'concat.txt', ...segmentFiles];
      for (const file of filesToDelete) {
        try {
          await this.ffmpeg.deleteFile(file);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      if (onProgress) {
        onProgress(100);
      }

      return new Blob([data], { type: 'video/mp4' });
    } catch (error) {
      // Clean up on error
      try {
        const filesToDelete = ['input.mp4', 'output.mp4', 'concat.txt'];
        for (const file of filesToDelete) {
          await this.ffmpeg?.deleteFile(file);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create a virtual concatenated video for preview
  createPreviewSegments(clips: VideoClip[]): { startTime: number; endTime: number; originalStart: number; originalEnd: number }[] {
    const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
    const segments = [];
    let currentTime = 0;

    for (const clip of sortedClips) {
      const duration = clip.endTime - clip.startTime;
      segments.push({
        startTime: currentTime,
        endTime: currentTime + duration,
        originalStart: clip.startTime,
        originalEnd: clip.endTime
      });
      currentTime += duration;
    }

    return segments;
  }

  // Get the original timestamp for a given preview time
  getOriginalTime(previewTime: number, clips: VideoClip[]): number {
    const segments = this.createPreviewSegments(clips);
    
    for (const segment of segments) {
      if (previewTime >= segment.startTime && previewTime <= segment.endTime) {
        const segmentOffset = previewTime - segment.startTime;
        return segment.originalStart + segmentOffset;
      }
    }

    return 0;
  }

  // Get the preview duration (sum of all clip durations)
  getPreviewDuration(clips: VideoClip[]): number {
    return clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
  }
}

export const videoProcessor = new VideoProcessor();