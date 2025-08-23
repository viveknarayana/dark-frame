import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class SubtitleService {
  private apiKey: string;
  private ffmpeg: FFmpeg | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file.');
    }
  }

  private async initializeFFmpeg() {
    if (this.ffmpeg) return this.ffmpeg;

    this.ffmpeg = new FFmpeg();
    
    // Load FFmpeg
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return this.ffmpeg;
  }

  async transcribeVideo(videoBlob: Blob): Promise<SubtitleSegment[]> {
    try {
      // Check if the video file is too large (Whisper has a 25MB limit)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (videoBlob.size > maxSize) {
        throw new Error(`Video file is too large (${(videoBlob.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`);
      }

      // Extract audio from video
      const audioBlob = await this.extractAudioFromVideo(videoBlob);
      
      console.log('Sending audio to Whisper API...', {
        originalSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
        audioSize: `${(audioBlob.size / 1024 / 1024).toFixed(2)}MB`,
        audioType: audioBlob.type
      });

      // Create FormData for OpenAI API
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        // Provide more specific error messages
        if (response.status === 400) {
          throw new Error(`Invalid audio format. Please ensure your video has audio and is in a supported format (MP4, MOV, AVI, etc.). Error: ${errorText}`);
        } else if (response.status === 413) {
          throw new Error('Audio file is too large. Please use a video smaller than 25MB.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key.');
        } else {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const result: WhisperResponse = await response.json();
      console.log('Whisper API response:', result);
      
      if (!result.segments || result.segments.length === 0) {
        throw new Error('No speech detected in the video. Please ensure the video contains audio with speech.');
      }
      
      return result.segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim()
      }));
    } catch (error) {
      console.error('Error transcribing video:', error);
      throw error;
    }
  }

  private async extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create a video element
        const video = document.createElement('video');
        video.muted = true;
        video.crossOrigin = 'anonymous';
        
        // Create audio context for recording
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        video.onloadedmetadata = () => {
          try {
            // Create media source from video
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            
            // Connect the audio nodes
            source.connect(destination);
            
            // Set up MediaRecorder to capture audio
            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus'
            });
            
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(chunks, { type: 'audio/webm' });
              console.log('Audio extraction complete:', {
                size: `${(audioBlob.size / 1024 / 1024).toFixed(2)}MB`,
                type: audioBlob.type
              });
              resolve(audioBlob);
            };
            
            mediaRecorder.onerror = (error) => {
              reject(new Error(`MediaRecorder error: ${error}`));
            };
            
            // Start recording and play video
            mediaRecorder.start();
            video.play();
            
            // Stop recording when video ends
            video.onended = () => {
              mediaRecorder.stop();
            };
            
            // Fallback: stop recording after a reasonable time
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, Math.min(video.duration * 1000, 300000)); // Max 5 minutes
            
          } catch (error) {
            reject(new Error(`Audio extraction setup error: ${error}`));
          }
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video for audio extraction'));
        };
        
        // Set video source
        const videoUrl = URL.createObjectURL(videoBlob);
        video.src = videoUrl;
        
      } catch (error) {
        reject(new Error(`Video processing error: ${error}`));
      }
    });
  }

  generateSRT(subtitles: SubtitleSegment[]): string {
    return subtitles
      .map((subtitle, index) => {
        const startTime = this.formatTime(subtitle.start);
        const endTime = this.formatTime(subtitle.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`;
      })
      .join('\n');
  }

  generateVTT(subtitles: SubtitleSegment[]): string {
    const header = 'WEBVTT\n\n';
    const body = subtitles
      .map((subtitle, index) => {
        const startTime = this.formatTime(subtitle.start, true);
        const endTime = this.formatTime(subtitle.end, true);
        return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}`;
      })
      .join('\n\n');
    
    return header + body;
  }

  private formatTime(seconds: number, isVTT: boolean = false): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    if (isVTT) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }
  }

  async addSubtitlesToVideo(videoBlob: Blob, subtitles: SubtitleSegment[]): Promise<Blob> {
    try {
      console.log('Adding subtitles to video using FFmpeg...');
      
      // Initialize FFmpeg
      const ffmpeg = await this.initializeFFmpeg();
      
      // Write video file to FFmpeg
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob));
      
      // Generate SRT subtitle file
      const srtContent = this.generateSRT(subtitles);
      await ffmpeg.writeFile('subtitles.srt', srtContent);
      
      console.log('Processing video with embedded subtitles...');
      
      // Run FFmpeg command to burn subtitles into video
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', 'subtitles=subtitles.srt:force_style=\'FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Bold=1,Outline=2\'',
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        'output.mp4'
      ]);
      
      // Read the output file
      const data = await ffmpeg.readFile('output.mp4');
      const outputBlob = new Blob([data], { type: 'video/mp4' });
      
      console.log('Subtitle burning complete:', {
        originalSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
        outputSize: `${(outputBlob.size / 1024 / 1024).toFixed(2)}MB`
      });
      
      return outputBlob;
      
    } catch (error) {
      console.error('Error burning subtitles:', error);
      
      // Fallback: return original video if subtitle burning fails
      console.log('Subtitle burning failed, returning original video');
      return videoBlob;
    }
  }
}
