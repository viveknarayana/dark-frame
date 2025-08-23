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

    // Sort clips by start time
    const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);

    // Write input file
    await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    // Create filter complex for concatenation
    let filterComplex = '';
    let inputs = '';
    
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const duration = clip.endTime - clip.startTime;
      
      // Extract each clip segment
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', clip.startTime.toString(),
        '-t', duration.toString(),
        '-c', 'copy',
        `segment_${i}.mp4`
      ]);
      
      inputs += `[${i}:v][${i}:a]`;
      filterComplex += `[${i}:v][${i}:a]`;
    }

    if (sortedClips.length === 1) {
      // Single clip, just copy
      await this.ffmpeg.exec([
        '-i', `segment_0.mp4`,
        '-c', 'copy',
        'output.mp4'
      ]);
    } else {
      // Multiple clips, concatenate
      const concatInputs = sortedClips.map((_, i) => ['-i', `segment_${i}.mp4`]).flat();
      const concatFilter = sortedClips.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${sortedClips.length}:v=1:a=1[outv][outa]`;
      
      await this.ffmpeg.exec([
        ...concatInputs,
        '-filter_complex', concatFilter,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        'output.mp4'
      ]);
    }

    // Read output file
    const data = await this.ffmpeg.readFile('output.mp4');
    
    // Clean up
    const filesToDelete = ['input.mp4', 'output.mp4', ...sortedClips.map((_, i) => `segment_${i}.mp4`)];
    for (const file of filesToDelete) {
      try {
        await this.ffmpeg.deleteFile(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return new Blob([data], { type: 'video/mp4' });
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