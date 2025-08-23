import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc';

export interface RecordingOptions {
  video: boolean;
  audio: boolean;
  screen: boolean;
  camera: boolean;
}

export interface RecordingStreams {
  screen?: MediaStream;
  camera?: MediaStream;
  audio?: MediaStream;
  combined?: MediaStream;
}

export class RecordingService {
  private recorder: RecordRTCPromisesHandler | null = null;
  private streams: RecordingStreams = {};
  private recordingStartTime: number = 0;
  private recordingOptions: RecordingOptions = {
    video: true,
    audio: true,
    screen: true,
    camera: false,
  };

  async startRecording(options: Partial<RecordingOptions> = {}): Promise<void> {
    this.recordingOptions = { ...this.recordingOptions, ...options };
    
    try {
      // Get streams based on options
      if (this.recordingOptions.screen) {
        this.streams.screen = await this.getScreenStream();
      }
      
      if (this.recordingOptions.camera) {
        this.streams.camera = await this.getCameraStream();
      }
      
      if (this.recordingOptions.audio) {
        this.streams.audio = await this.getAudioStream();
      }
      
      // Combine streams
      this.streams.combined = this.combineStreams();
      
      // Validate combined stream has tracks
      if (this.streams.combined.getTracks().length === 0) {
        throw new Error('No media tracks available for recording');
      }

      // Determine best recording configuration
      const hasVideo = this.streams.combined.getVideoTracks().length > 0;
      const hasAudio = this.streams.combined.getAudioTracks().length > 0;
      
      console.log('Recording configuration:', { hasVideo, hasAudio });

      // Initialize recorder with better browser compatibility
      const recordingOptions: any = {
        type: hasVideo ? 'video' : 'audio',
        recorderType: hasVideo ? undefined : RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: hasAudio ? 2 : undefined,
        checkForInactiveTracks: true,
        timeSlice: 1000, // For better progress tracking
      };

      // Video-specific options
      if (hasVideo) {
        // Try MP4 first (better compatibility), fallback to WebM
        const supportedTypes = [
          'video/mp4;codecs=h264,aac',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ];
        
        let selectedMimeType = 'video/webm';
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }
        
        recordingOptions.mimeType = selectedMimeType;
        recordingOptions.videoBitsPerSecond = 2500000;
        recordingOptions.audioBitsPerSecond = hasAudio ? 128000 : undefined;
        
        console.log('Selected MIME type:', selectedMimeType);
      } else {
        // Audio-only recording
        recordingOptions.mimeType = 'audio/webm';
        recordingOptions.audioBitsPerSecond = 128000;
      }

      this.recorder = new RecordRTCPromisesHandler(this.streams.combined, recordingOptions);
      
      await this.recorder.startRecording();
      this.recordingStartTime = Date.now();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.recorder) {
      throw new Error('No recording in progress');
    }
    
    await this.recorder.stopRecording();
    const blob = await this.recorder.getBlob();
    
    this.cleanup();
    return blob;
  }

  async pauseRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('No recording in progress');
    }
    
    await this.recorder.pauseRecording();
  }

  async resumeRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('No recording in progress');
    }
    
    await this.recorder.resumeRecording();
  }

  getRecordingDuration(): number {
    if (!this.recordingStartTime) return 0;
    return Date.now() - this.recordingStartTime;
  }

  isRecording(): boolean {
    return this.recorder !== null && this.recorder.getState() === 'recording';
  }

  isPaused(): boolean {
    return this.recorder !== null && this.recorder.getState() === 'paused';
  }

  private async getScreenStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false, // We'll get audio separately for better control
      });
      
      // Handle stream end (user clicks stop sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopRecording();
      });
      
      return stream;
    } catch (error) {
      console.error('Failed to get screen stream:', error);
      throw new Error('Screen capture permission denied or unavailable');
    }
  }

  private async getCameraStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false, // We'll get audio separately
      });
    } catch (error) {
      console.error('Failed to get camera stream:', error);
      throw new Error('Camera permission denied or unavailable');
    }
  }

  private async getAudioStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      console.error('Failed to get audio stream:', error);
      throw new Error('Microphone permission denied or unavailable');
    }
  }

  private combineStreams(): MediaStream {
    const tracks: MediaStreamTrack[] = [];
    
    // Add video tracks - prioritize screen over camera if both are available
    if (this.streams.screen) {
      tracks.push(...this.streams.screen.getVideoTracks());
    } else if (this.streams.camera) {
      // If no screen sharing, use camera as primary video source
      tracks.push(...this.streams.camera.getVideoTracks());
    }
    
    // TODO: For picture-in-picture camera overlay, we would need to use Canvas
    // to composite screen + camera streams. For now, we record one video source.
    
    // Add audio tracks
    if (this.streams.audio) {
      tracks.push(...this.streams.audio.getAudioTracks());
    }
    
    const combinedStream = new MediaStream(tracks);
    console.log('Combined stream created with tracks:', {
      videoTracks: combinedStream.getVideoTracks().length,
      audioTracks: combinedStream.getAudioTracks().length,
      totalTracks: combinedStream.getTracks().length
    });
    
    return combinedStream;
  }

  private cleanup(): void {
    // Stop all tracks
    Object.values(this.streams).forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
    
    // Reset state
    this.streams = {};
    this.recorder = null;
    this.recordingStartTime = 0;
  }

  // Get current streams for preview
  getStreams(): RecordingStreams {
    return this.streams;
  }
}

// Singleton instance
export const recordingService = new RecordingService();