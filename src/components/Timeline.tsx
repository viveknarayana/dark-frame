import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Play, Pause, Scissors, Trash2, Sparkles, MousePointer } from 'lucide-react';
import type { VideoClip } from './VideoEditor';

interface TimelineProps {
  clips: VideoClip[];
  duration: number;
  currentTime: number;
  selectedClipId: string | null;
  onSeek: (time: number) => void;
  onClipSelect: (clipId: string | null) => void;
  onPlay: () => void;
  isPlaying: boolean;
  onCut: () => void;
  onDeleteClip: (clipId: string) => void;
  onClipDrag: (clipId: string, newStartTime: number) => void;
  previewMode: boolean;
  onEditWithAI?: (clipId: string) => void;
  onSelectFrameRange?: (startTime: number, endTime: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  duration,
  currentTime,
  selectedClipId,
  onSeek,
  onClipSelect,
  onPlay,
  isPlaying,
  onCut,
  onDeleteClip,
  onClipDrag,
  previewMode,
  onEditWithAI,
  onSelectFrameRange
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  
  // Frame selection state
  const [isFrameSelectionMode, setIsFrameSelectionMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [selectionPhase, setSelectionPhase] = useState<'start' | 'end' | null>(null);

  // Debug clips changes
  useEffect(() => {
    console.log('Timeline clips updated:', {
      clipsCount: clips.length,
      clips: clips.map(clip => ({
        id: clip.id,
        name: clip.name,
        duration: clip.duration,
        startTime: clip.startTime,
        endTime: clip.endTime
      })),
      duration,
      currentTime
    });
  }, [clips, duration, currentTime]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || duration === 0 || isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    const clampedTime = Math.max(0, Math.min(duration, time));
    
    if (isFrameSelectionMode && selectionPhase) {
      if (selectionPhase === 'start') {
        setSelectionStart(clampedTime);
        setSelectionPhase('end');
        onSeek(clampedTime);
      } else if (selectionPhase === 'end') {
        setSelectionEnd(clampedTime);
        setSelectionPhase(null);
        onSeek(clampedTime);
        // Don't auto-complete, wait for user to click "Select Section"
      }
    } else {
      onSeek(clampedTime);
    }
  };

  const handleConfirmSelection = () => {
    if (selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      
      if (end - start > 0.5) { // Minimum 0.5 second selection
        onSelectFrameRange?.(start, end);
        
        // Reset selection mode
        setIsFrameSelectionMode(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectionPhase(null);
      }
    }
  };

  const handleClipMouseDown = (e: React.MouseEvent, clipId: string, clipStartTime: number) => {
    e.stopPropagation();
    if (isFrameSelectionMode) return; // Don't drag clips in frame selection mode
    
    setIsDragging(true);
    setDragClipId(clipId);
    setDragStartX(e.clientX);
    setDragStartTime(clipStartTime);
    onClipSelect(clipId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragClipId || !timelineRef.current || duration === 0) return;
    
    const deltaX = e.clientX - dragStartX;
    const rect = timelineRef.current.getBoundingClientRect();
    const deltaTime = (deltaX / rect.width) * duration;
    const newStartTime = dragStartTime + deltaTime;
    
    onClipDrag(dragClipId, newStartTime);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragClipId(null);
  };

  const handleEditWithAI = (clipId: string) => {
    // Enable frame selection mode
    setIsFrameSelectionMode(true);
    setSelectionPhase('start');
    setSelectionStart(null);
    setSelectionEnd(null);
    onClipSelect(clipId);
  };

  const handleCancelFrameSelection = () => {
    setIsFrameSelectionMode(false);
    setSelectionPhase(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!dragClipId || !timelineRef.current || duration === 0) return;
        
        const deltaX = e.clientX - dragStartX;
        const rect = timelineRef.current.getBoundingClientRect();
        const deltaTime = (deltaX / rect.width) * duration;
        const newStartTime = dragStartTime + deltaTime;
        
        onClipDrag(dragClipId, newStartTime);
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDragClipId(null);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragClipId, dragStartX, dragStartTime, duration, onClipDrag]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;
  const selectionStartPosition = selectionStart !== null ? (selectionStart / duration) * 100 : 0;
  const selectionEndPosition = selectionEnd !== null ? (selectionEnd / duration) * 100 : 0;
  const selectionLeft = Math.min(selectionStartPosition, selectionEndPosition);
  const selectionWidth = Math.abs(selectionEndPosition - selectionStartPosition);

  return (
    <div className="h-48 bg-gradient-timeline border-t border-border">
      {/* Timeline Controls */}
      <div className="h-12 bg-editor-panel px-4 flex items-center gap-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlay}
          className="text-foreground hover:bg-secondary"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <div className="text-sm font-mono text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
          {previewMode && (
            <span className="ml-2 text-primary text-xs">EDITED</span>
          )}
          {isFrameSelectionMode && (
            <span className="ml-2 text-primary text-xs">
              {selectionPhase === 'start' ? 'SELECT START' : 'SELECT END'}
            </span>
          )}
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          {isFrameSelectionMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelFrameSelection}
                className="text-xs"
              >
                Cancel
              </Button>
              {selectionStart !== null && selectionEnd !== null && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConfirmSelection}
                  className="text-xs bg-primary hover:bg-primary/90"
                >
                  Select Section
                </Button>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MousePointer className="h-3 w-3" />
                Click to {selectionPhase === 'start' ? 'set start' : selectionPhase === 'end' ? 'set end' : 'confirm selection'}
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-secondary"
            disabled={!selectedClipId}
          >
            <Scissors className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Track */}
      <div className="flex-1 p-4">
        <div className="h-full">
          {/* Time Ruler */}
          <div className="h-6 relative border-b border-border mb-2">
            {duration > 0 && Array.from({ length: Math.ceil(duration / 10) }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center text-xs text-muted-foreground"
                style={{ left: `${(i * 10 / duration) * 100}%` }}
              >
                <div className="w-px h-3 bg-border" />
                <span className="mt-1">{formatTime(i * 10)}</span>
              </div>
            ))}
          </div>

          {/* Video Track */}
          <div 
            ref={timelineRef}
            className={`h-16 bg-timeline-bg rounded-lg relative border border-border overflow-hidden ${
              isFrameSelectionMode ? 'cursor-pointer' : 'cursor-pointer'
            }`}
            onClick={handleTimelineClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Frame Selection Overlay */}
            {isFrameSelectionMode && selectionStart !== null && selectionEnd !== null && (
              <div
                className="absolute top-1 bottom-1 bg-blue-500/20 border-l-2 border-r-2 border-blue-400/60 pointer-events-none z-20"
                style={{
                  left: `${selectionLeft}%`,
                  width: `${selectionWidth}%`
                }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  {formatTime(Math.min(selectionStart, selectionEnd))} - {formatTime(Math.max(selectionStart, selectionEnd))}
                </div>
              </div>
            )}

            {/* Start Marker */}
            {isFrameSelectionMode && selectionStart !== null && (
              <div
                className="absolute top-1 bottom-1 w-1 bg-green-500 pointer-events-none z-20"
                style={{ left: `${selectionStartPosition}%` }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  Start: {formatTime(selectionStart)}
                </div>
              </div>
            )}

            {/* End Marker */}
            {isFrameSelectionMode && selectionEnd !== null && (
              <div
                className="absolute top-1 bottom-1 w-1 bg-red-500 pointer-events-none z-20"
                style={{ left: `${selectionEndPosition}%` }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  End: {formatTime(selectionEnd)}
                </div>
              </div>
            )}

            {/* Video Clips */}
            {clips.length > 0 ? (
              clips.map((clip) => {
                const clipWidth = duration > 0 ? ((clip.endTime - clip.startTime) / duration) * 100 : 0;
                const clipLeft = duration > 0 ? (clip.startTime / duration) * 100 : 0;
                
                return (
                  <ContextMenu key={clip.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={`absolute top-1 h-14 rounded border-2 transition-all duration-200 ${
                          selectedClipId === clip.id
                            ? 'bg-editor-clip-selected border-primary'
                            : 'bg-editor-clip border-border hover:border-primary/50'
                        } ${isDragging && dragClipId === clip.id ? 'z-10' : ''} ${
                          isFrameSelectionMode ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'
                        }`}
                        style={{
                          left: `${clipLeft}%`,
                          width: `${clipWidth}%`
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip.id, clip.startTime)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDragging && !isFrameSelectionMode) {
                            onClipSelect(clip.id);
                          }
                        }}
                      >
                        <div className="p-2 h-full flex flex-col justify-between">
                          <div className="text-xs text-white font-medium truncate">
                            {clip.name}
                          </div>
                          <div className="text-xs text-white/60">
                            {formatTime(clip.duration)}
                          </div>
                        </div>
                        
                        {/* Waveform visualization placeholder */}
                        <div className="absolute bottom-1 left-2 right-2 h-4 bg-editor-waveform/30 rounded-sm">
                          <div className="h-full bg-gradient-to-r from-primary/40 to-primary/20 rounded-sm" />
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem 
                        onClick={() => {
                          onClipSelect(clip.id);
                          onCut();
                        }}
                        disabled={selectedClipId !== clip.id || currentTime <= clip.startTime || currentTime >= clip.endTime}
                      >
                        <Scissors className="mr-2 h-4 w-4" />
                        Cut at playhead
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => {
                          handleEditWithAI(clip.id);
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Edit with AI
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => {
                          onDeleteClip(clip.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete clip
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-sm font-medium mb-1">No clips available</div>
                  <div className="text-xs">Upload a video to get started</div>
                </div>
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-editor-playhead z-10 pointer-events-none"
              style={{ left: `${playheadPosition}%` }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-editor-playhead border-2 border-background rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};