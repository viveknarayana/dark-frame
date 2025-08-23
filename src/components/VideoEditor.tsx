import React, { useState, useRef } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { Timeline } from './Timeline';
import { MediaPanel } from './MediaPanel';
import { ToolBar } from './ToolBar';
import { UploadArea } from './UploadArea';

export interface VideoClip {
  id: string;
  name: string;
  url: string;
  duration: number;
  startTime: number;
  endTime: number;
  position: number;
}

export const VideoEditor = () => {
  console.log('VideoEditor component is rendering');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    // Create initial clip
    const newClip: VideoClip = {
      id: Date.now().toString(),
      name: file.name,
      url,
      duration: 0, // Will be set when video loads
      startTime: 0,
      endTime: 0,
      position: 0
    };
    setClips([newClip]);
  };

  const handleVideoLoaded = (videoDuration: number) => {
    setDuration(videoDuration);
    if (clips.length > 0) {
      setClips(clips.map(clip => ({
        ...clip,
        duration: videoDuration,
        endTime: videoDuration
      })));
    }
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleCut = () => {
    if (!selectedClipId) return;
    
    const clipIndex = clips.findIndex(c => c.id === selectedClipId);
    if (clipIndex === -1) return;
    
    const clip = clips[clipIndex];
    const cutTime = currentTime;
    
    if (cutTime <= clip.startTime || cutTime >= clip.endTime) return;
    
    const newClips = [...clips];
    
    // First part
    newClips[clipIndex] = {
      ...clip,
      endTime: cutTime,
      duration: cutTime - clip.startTime
    };
    
    // Second part
    const secondClip: VideoClip = {
      ...clip,
      id: Date.now().toString(),
      startTime: cutTime,
      position: clip.position + (cutTime - clip.startTime),
      duration: clip.endTime - cutTime
    };
    
    newClips.splice(clipIndex + 1, 0, secondClip);
    setClips(newClips);
  };

  const handleDeleteClip = (clipId: string) => {
    setClips(clips.filter(clip => clip.id !== clipId));
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };

  const handleClipDrag = (clipId: string, newStartTime: number) => {
    setClips(clips.map(clip => {
      if (clip.id === clipId) {
        const clipDuration = clip.endTime - clip.startTime;
        return {
          ...clip,
          startTime: Math.max(0, Math.min(newStartTime, duration - clipDuration)),
          endTime: Math.max(clipDuration, Math.min(newStartTime + clipDuration, duration))
        };
      }
      return clip;
    }));
  };

  console.log('About to render VideoEditor JSX');
  
  return (
    <div className="h-screen bg-editor-bg flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999, background: 'red', color: 'white', padding: '10px' }}>
        DEBUG: VideoEditor is rendering
      </div>
      {/* Top Toolbar */}
      <ToolBar onCut={handleCut} canCut={!!selectedClipId} />
      
      <div className="flex-1 flex">
        {/* Left Panel - Media */}
        <MediaPanel 
          videoFile={videoFile}
          onFileUpload={handleFileUpload}
        />
        
        {/* Center - Video Player */}
        <div className="flex-1 flex flex-col">
          {videoUrl ? (
            <VideoPlayer
              videoUrl={videoUrl}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onTimeUpdate={handleTimeUpdate}
              onVideoLoaded={handleVideoLoaded}
              onSeek={handleSeek}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <UploadArea onFileUpload={handleFileUpload} />
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Timeline */}
      <Timeline
        clips={clips}
        duration={duration}
        currentTime={currentTime}
        selectedClipId={selectedClipId}
        onSeek={handleSeek}
        onClipSelect={setSelectedClipId}
        onPlay={handlePlay}
        isPlaying={isPlaying}
        onCut={handleCut}
        onDeleteClip={handleDeleteClip}
        onClipDrag={handleClipDrag}
      />
    </div>
  );
};