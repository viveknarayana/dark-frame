import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Play, Pause, Scissors, Trash2 } from 'lucide-react';
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
  onClipDrag
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || duration === 0 || isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  const handleClipMouseDown = (e: React.MouseEvent, clipId: string, clipStartTime: number) => {
    e.stopPropagation();
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
        </div>
        
        <div className="ml-auto flex items-center gap-2">
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
            className="h-16 bg-timeline-bg rounded-lg relative cursor-pointer border border-border overflow-hidden"
            onClick={handleTimelineClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Video Clips */}
            {clips.map((clip) => {
              const clipWidth = duration > 0 ? ((clip.endTime - clip.startTime) / duration) * 100 : 0;
              const clipLeft = duration > 0 ? (clip.startTime / duration) * 100 : 0;
              
              return (
                <ContextMenu key={clip.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`absolute top-1 h-14 rounded cursor-grab active:cursor-grabbing border-2 transition-all duration-200 ${
                        selectedClipId === clip.id
                          ? 'bg-editor-clip-selected border-primary'
                          : 'bg-editor-clip border-border hover:border-primary/50'
                      } ${isDragging && dragClipId === clip.id ? 'z-10' : ''}`}
                      style={{
                        left: `${clipLeft}%`,
                        width: `${clipWidth}%`
                      }}
                      onMouseDown={(e) => handleClipMouseDown(e, clip.id, clip.startTime)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDragging) {
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
                      onClick={() => onDeleteClip(clip.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete clip
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

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