import React, { useState, useRef, useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { Timeline } from './Timeline';
import { MediaPanel } from './MediaPanel';
import { ToolBar } from './ToolBar';
import { UploadArea } from './UploadArea';
import { ExportDialog } from './ExportDialog';
import { AIChatBox } from './AIChatBox';
import { SubtitleDialog } from './SubtitleDialog';
import { RecordingPanel } from './RecordingPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { videoProcessor } from '../utils/videoProcessor';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRecordingStore } from '../stores/recordingStore';

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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiEditingClip, setAiEditingClip] = useState<VideoClip | null>(null);
  const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
  const [isAddingSubtitles, setIsAddingSubtitles] = useState(false);
  const { toast } = useToast();

  // Debug preview mode changes
  useEffect(() => {
    console.log('Preview mode state changed:', {
      previewMode,
      hasClips: clips.length > 0,
      clipsCount: clips.length
    });
  }, [previewMode, clips.length]);
  
  // Recording store
  const { recordingUrl, recordingBlob, recordingState, resetRecording } = useRecordingStore();
  
  // Watch for completed recordings
  useEffect(() => {
    if (recordingBlob && recordingUrl && recordingState === 'idle') {
      // Use the actual blob type and determine appropriate file extension
      const blobType = recordingBlob.type || 'video/webm';
      const extension = blobType.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `recording-${Date.now()}.${extension}`;
      
      console.log('Processing recorded file:', {
        blobType,
        extension,
        fileName,
        size: `${(recordingBlob.size / 1024 / 1024).toFixed(2)} MB`
      });
      
      // Convert recording blob to File with correct type
      const file = new File([recordingBlob], fileName, { type: blobType });
      handleFileUpload(file);
      
      // Close the recording dialog
      setIsRecordingDialogOpen(false);
      
      // Reset recording state after successful handoff
      setTimeout(() => {
        resetRecording();
      }, 100);
      
      toast({
        title: "Recording Ready",
        description: `Your ${extension.toUpperCase()} recording has been loaded into the editor`
      });
    }
  }, [recordingBlob, recordingUrl, recordingState, toast, resetRecording]);

  const handleFileUpload = (file: File) => {
    console.log('handleFileUpload called with file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
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
    
    console.log('Creating initial clip:', newClip);
    setClips([newClip]);
    
    console.log('Video state updated:', {
      videoFile: file.name,
      videoUrl: url,
      clipsCount: 1
    });
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

  const handleTogglePreview = () => {
    console.log('handleTogglePreview called:', {
      currentPreviewMode: previewMode,
      willToggleTo: !previewMode,
      hasClips: clips.length > 0,
      clipsCount: clips.length
    });
    
    setPreviewMode(!previewMode);
    setCurrentTime(0); // Reset to start when toggling
    
    const newMode = !previewMode;
    console.log('Preview mode changed to:', newMode);
    
    toast({
      title: newMode ? "Edited Video" : "Original Video",
      description: newMode 
        ? "Showing edited video with deleted segments removed"
        : "Showing original video with all segments"
    });
  };

  const handleExport = async (onProgress: (progress: number) => void): Promise<Blob> => {
    if (!videoFile || clips.length === 0) {
      throw new Error('No video or clips to export');
    }

    return await videoProcessor.trimVideo(videoFile, clips, onProgress);
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
    const newClips = clips.filter(clip => clip.id !== clipId);
    
    setClips(newClips);
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
    
    // If no clips remain, reset to original mode
    if (newClips.length === 0) {
      setPreviewMode(false);
      setCurrentTime(0);
      toast({
        title: "All Clips Deleted",
        description: "No clips remaining. Upload a new video or add clips to continue editing."
      });
    } else {
      // Automatically show the edited video (with deleted clips removed)
      setPreviewMode(true);
      setCurrentTime(0);
      toast({
        title: "Clip Deleted",
        description: "Showing edited video with deleted segments removed."
      });
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

  const handleEditWithAI = (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      setAiEditingClip(clip);
      setIsAIChatOpen(true);
    }
  };

  const handleSelectFrameRange = (startTime: number, endTime: number) => {
    const clip = clips.find(c => c.id === selectedClipId);
    if (clip) {
      setAiEditingClip({
        ...clip,
        startTime,
        endTime,
        duration: endTime - startTime
      });
      setIsAIChatOpen(true);
    }
  };

  const handleCloseAIChat = () => {
    setIsAIChatOpen(false);
    setAiEditingClip(null);
  };

  const handleVideoProcessed = async (processedVideoBlob: Blob, startTime: number, endTime: number) => {
    try {
      // Create a new clip from the processed video
      const processedVideoFile = new File([processedVideoBlob], `ai-processed-${Date.now()}.mp4`, {
        type: 'video/mp4'
      });
      
      const processedVideoUrl = URL.createObjectURL(processedVideoFile);
      
      // Find the original clip
      const originalClipIndex = clips.findIndex(c => c.id === selectedClipId);
      if (originalClipIndex === -1) return;
      
      const originalClip = clips[originalClipIndex];
      
      // Create new clips: before, processed, and after
      const newClips: VideoClip[] = [];
      
      // Add clip before the processed section (if any)
      if (startTime > originalClip.startTime) {
        const beforeClip: VideoClip = {
          ...originalClip,
          id: `before-${Date.now()}`,
          endTime: startTime,
          duration: startTime - originalClip.startTime
        };
        newClips.push(beforeClip);
      }
      
      // Add the processed video clip
      const processedClip: VideoClip = {
        id: `processed-${Date.now()}`,
        name: `AI Processed (${originalClip.name})`,
        url: processedVideoUrl,
        startTime: startTime,
        endTime: endTime,
        duration: endTime - startTime,
        position: startTime
      };
      newClips.push(processedClip);
      
      // Add clip after the processed section (if any)
      if (endTime < originalClip.endTime) {
        const afterClip: VideoClip = {
          ...originalClip,
          id: `after-${Date.now()}`,
          startTime: endTime,
          duration: originalClip.endTime - endTime,
          position: endTime
        };
        newClips.push(afterClip);
      }
      
      // Replace the original clip with the new clips
      const updatedClips = [...clips];
      updatedClips.splice(originalClipIndex, 1, ...newClips);
      
      setClips(updatedClips);
      
      // Select the processed clip
      setSelectedClipId(processedClip.id);
      
      // Show success message
      toast({
        title: "AI Processing Complete",
        description: "The processed video has been integrated into your timeline."
      });
      
    } catch (error) {
      console.error('Error integrating processed video:', error);
      toast({
        title: "Integration Failed",
        description: "Failed to integrate the processed video into the timeline.",
        variant: "destructive"
      });
    }
  };

  const handleAddSubtitles = () => {
    if (!videoFile) {
      toast({
        title: "No Video",
        description: "Please upload a video first.",
        variant: "destructive"
      });
      return;
    }

    // Check if API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set VITE_OPENAI_API_KEY in your .env file to use subtitle features.",
        variant: "destructive"
      });
      return;
    }

    setIsSubtitleDialogOpen(true);
  };

  const handleSubtitlesAdded = (subtitledVideoBlob: Blob) => {
    try {
      // Create a new file from the subtitled video
      const subtitledVideoFile = new File([subtitledVideoBlob], `subtitled-${videoFile?.name || 'video.mp4'}`, {
        type: 'video/mp4'
      });
      
      // Update the video file and URL
      setVideoFile(subtitledVideoFile);
      const newVideoUrl = URL.createObjectURL(subtitledVideoBlob);
      setVideoUrl(newVideoUrl);
      
      // Update the clips with the new video URL
      setClips(clips.map(clip => ({
        ...clip,
        url: newVideoUrl
      })));
      
      toast({
        title: "Subtitles Added",
        description: "Subtitles have been successfully added to your video."
      });
      
    } catch (error) {
      console.error('Error updating video with subtitles:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update video with subtitles.",
        variant: "destructive"
      });
    }
  };

  // Calculate effective duration and time based on preview mode
  const effectiveDuration = previewMode ? videoProcessor.getPreviewDuration(clips) : duration;
  const effectiveCurrentTime = previewMode 
    ? Math.min(currentTime, effectiveDuration)
    : currentTime;
  
  return (
    <div className="h-screen bg-editor-bg flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Top Toolbar */}
      <ToolBar 
        onCut={handleCut} 
        canCut={!!selectedClipId}
        onExport={() => setIsExportDialogOpen(true)}
        onRecord={() => setIsRecordingDialogOpen(true)}
        onTogglePreview={handleTogglePreview}
        previewMode={previewMode}
        hasClips={clips.length > 0}
        onAddSubtitles={handleAddSubtitles}
        isAddingSubtitles={isAddingSubtitles}
      />
      
      <div className="flex-1 flex">
        {/* Left Panel - Media */}
        <MediaPanel 
          videoFile={videoFile}
          onFileUpload={handleFileUpload}
        />
        
        {/* Center - Video Player */}
        <div className="flex-1 flex flex-col">
          {videoUrl ? (
            <div className="h-[calc(100vh-12rem)] bg-editor-viewer">
              <VideoPlayer
                videoUrl={videoUrl}
                isPlaying={isPlaying}
                currentTime={effectiveCurrentTime}
                onTimeUpdate={handleTimeUpdate}
                onVideoLoaded={handleVideoLoaded}
                onSeek={handleSeek}
                clips={clips}
                previewMode={previewMode}
              />
            </div>
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
        duration={effectiveDuration}
        currentTime={effectiveCurrentTime}
        selectedClipId={selectedClipId}
        onSeek={handleSeek}
        onClipSelect={setSelectedClipId}
        onPlay={handlePlay}
        isPlaying={isPlaying}
        onCut={handleCut}
        onDeleteClip={handleDeleteClip}
        onClipDrag={handleClipDrag}
        previewMode={previewMode}
        onEditWithAI={handleEditWithAI}
        onSelectFrameRange={handleSelectFrameRange}
      />
      
      {/* AI Chat Box */}
      {aiEditingClip && (
        <AIChatBox
          isOpen={isAIChatOpen}
          onClose={handleCloseAIChat}
          clipId={aiEditingClip.id}
          clipName={aiEditingClip.name}
          startTime={aiEditingClip.startTime}
          endTime={aiEditingClip.endTime}
          videoUrl={videoUrl}
          onVideoProcessed={handleVideoProcessed}
        />
      )}
      
      {/* Subtitle Dialog */}
      {videoFile && (
        <SubtitleDialog
          isOpen={isSubtitleDialogOpen}
          onClose={() => setIsSubtitleDialogOpen(false)}
          videoFile={videoFile}
          onSubtitlesAdded={handleSubtitlesAdded}
        />
      )}
      
      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        fileName={videoFile?.name || 'video'}
        videoDuration={effectiveDuration}
      />
      
      {/* Recording Dialog */}
      <Dialog open={isRecordingDialogOpen} onOpenChange={setIsRecordingDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Recording Studio</DialogTitle>
          </DialogHeader>
          <RecordingPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
};