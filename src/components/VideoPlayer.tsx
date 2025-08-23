import React, { useRef, useEffect, useState } from 'react';
import { videoProcessor } from '../utils/videoProcessor';
import type { VideoClip } from './VideoEditor';

interface VideoPlayerProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onVideoLoaded: (duration: number) => void;
  onSeek: (time: number) => void;
  clips: VideoClip[];
  previewMode: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isPlaying,
  currentTime,
  onTimeUpdate,
  onVideoLoaded,
  onSeek,
  clips,
  previewMode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Handle seeking
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    if (previewMode && clips.length > 0) {
      // In preview mode, convert preview time to original video time
      const originalTime = videoProcessor.getOriginalTime(currentTime, clips);
      if (Math.abs(video.currentTime - originalTime) > 0.5) {
        video.currentTime = originalTime;
      }
    } else {
      // In original mode, use time directly
      if (Math.abs(video.currentTime - currentTime) > 0.5) {
        video.currentTime = currentTime;
      }
    }
  }, [currentTime, previewMode, clips]);

  // Handle time updates with preview mode logic
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const now = Date.now();
    
    // Throttle updates to avoid too frequent calls
    if (now - lastUpdateTime < 100) return;
    setLastUpdateTime(now);
    
    if (previewMode && clips.length > 0) {
      // In preview mode, we need to check if we're in a valid clip segment
      const currentVideoTime = video.currentTime;
      
      // Find which clip (if any) contains the current time
      const currentClip = clips.find(clip => 
        currentVideoTime >= clip.startTime && currentVideoTime <= clip.endTime
      );
      
      if (currentClip) {
        // We're in a valid clip, calculate preview time
        const segments = videoProcessor.createPreviewSegments(clips);
        const segment = segments.find(seg => 
          seg.originalStart <= currentVideoTime && seg.originalEnd >= currentVideoTime
        );
        
        if (segment) {
          const segmentOffset = currentVideoTime - segment.originalStart;
          const previewTime = segment.startTime + segmentOffset;
          onTimeUpdate(previewTime);
        }
      } else {
        // We're in a deleted segment, skip to next clip
        console.log('⏭️ In deleted segment, skipping to next clip');
        const nextClip = clips
          .filter(clip => clip.startTime > currentVideoTime)
          .sort((a, b) => a.startTime - b.startTime)[0];
          
        if (nextClip) {
          console.log('🎬 Jumping to next clip at:', nextClip.startTime);
          video.currentTime = nextClip.startTime;
        } else {
          // No more clips, pause at end
          console.log('🏁 No more clips, pausing at end');
          video.pause();
          const totalPreviewDuration = videoProcessor.getPreviewDuration(clips);
          onTimeUpdate(totalPreviewDuration);
        }
      }
    } else {
      // Original mode - direct time update
      onTimeUpdate(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      onVideoLoaded(videoRef.current.duration);
    }
  };

  const handleVideoClick = () => {
    // Toggle play/pause on click
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="flex-1 bg-editor-viewer relative flex items-center justify-center">
      {previewMode && (
        <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium z-10">
          Preview Mode
        </div>
      )}
      
      <video
        ref={videoRef}
        src={videoUrl}
        className="max-w-full max-h-full object-contain cursor-pointer"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={handleVideoClick}
        preload="metadata"
      />
    </div>
  );
};