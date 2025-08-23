import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Download, Subtitles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SubtitleService, type SubtitleSegment } from '../utils/subtitleService';

interface SubtitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
  onSubtitlesAdded: (subtitledVideoBlob: Blob) => void;
}

export const SubtitleDialog: React.FC<SubtitleDialogProps> = ({
  isOpen,
  onClose,
  videoFile,
  onSubtitlesAdded
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [srtContent, setSrtContent] = useState('');
  const [vttContent, setVttContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitleService, setSubtitleService] = useState<SubtitleService | null>(null);

  const initializeSubtitleService = () => {
    try {
      const service = new SubtitleService();
      setSubtitleService(service);
      return service;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize subtitle service';
      setError(errorMessage);
      return null;
    }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    setProgress(0);
    setError(null);
    setSubtitles([]);

    // Initialize service if not already done
    const service = subtitleService || initializeSubtitleService();
    if (!service) {
      setError('Failed to initialize subtitle service');
      setIsTranscribing(false);
      return;
    }

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Transcribe the video
      const videoBlob = new Blob([videoFile], { type: videoFile.type });
      const transcribedSubtitles = await service.transcribeVideo(videoBlob);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setSubtitles(transcribedSubtitles);
      
      // Generate subtitle files
      const srt = service.generateSRT(transcribedSubtitles);
      const vtt = service.generateVTT(transcribedSubtitles);
      
      setSrtContent(srt);
      setVttContent(vtt);

    } catch (err) {
      console.error('Transcription error:', err);
      
      // For testing purposes, create mock subtitles if API fails
      if (err instanceof Error && err.message.includes('API')) {
        console.log('API failed, creating mock subtitles for testing...');
        const mockSubtitles: SubtitleSegment[] = [
          { start: 0, end: 3, text: "Hello, this is a test video." },
          { start: 3, end: 6, text: "The API is currently unavailable." },
          { start: 6, end: 9, text: "But you can still test the subtitle features." },
          { start: 9, end: 12, text: "Please check your API key and try again." }
        ];
        
        setSubtitles(mockSubtitles);
        setSrtContent(service.generateSRT(mockSubtitles));
        setVttContent(service.generateVTT(mockSubtitles));
        
        setError('API Error: Using mock subtitles for testing. Please check your OpenAI API key and video format.');
      } else {
        setError(err instanceof Error ? err.message : 'Transcription failed');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAddSubtitlesToVideo = async () => {
    if (subtitles.length === 0 || !subtitleService) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Simulate progress updates during subtitle burning
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      const videoBlob = new Blob([videoFile], { type: videoFile.type });
      const subtitledVideo = await subtitleService.addSubtitlesToVideo(videoBlob, subtitles);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      onSubtitlesAdded(subtitledVideo);
      onClose();
    } catch (err) {
      console.error('Error adding subtitles to video:', err);
      setError(err instanceof Error ? err.message : 'Failed to add subtitles to video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSRT = () => {
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile.name.replace(/\.[^/.]+$/, '')}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVTT = () => {
    const blob = new Blob([vttContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile.name.replace(/\.[^/.]+$/, '')}.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isOpen && subtitles.length === 0) {
      // Initialize service when dialog opens
      initializeSubtitleService();
      handleTranscribe();
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Subtitles className="h-5 w-5" />
            Add Subtitles
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isTranscribing && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Transcribing video with OpenAI Whisper...
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-center text-muted-foreground">
                {progress.toFixed(0)}%
              </div>
            </div>
          )}
          
          {isProcessing && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Burning subtitles into video...
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-center text-muted-foreground">
                {progress.toFixed(0)}%
              </div>
            </div>
          )}
          
          {subtitles.length > 0 && !isTranscribing && !isProcessing && (
            <div className="space-y-4">
              <div className="text-sm text-green-600 font-medium">
                ✓ Transcription complete! Found {subtitles.length} subtitle segments.
              </div>
              
              {/* Subtitle Preview */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Subtitle Preview:</div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-muted/50">
                  {subtitles.slice(0, 5).map((subtitle, index) => (
                    <div key={index} className="text-xs mb-2">
                      <span className="text-muted-foreground">
                        {formatTime(subtitle.start)} - {formatTime(subtitle.end)}:
                      </span>
                      <span className="ml-2">{subtitle.text}</span>
                    </div>
                  ))}
                  {subtitles.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      ... and {subtitles.length - 5} more segments
                    </div>
                  )}
                </div>
              </div>
              
              {/* Download Options */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSRT}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download SRT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadVTT}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download VTT
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isTranscribing || isProcessing}>
            Cancel
          </Button>
          {subtitles.length > 0 && (
            <Button 
              onClick={handleAddSubtitlesToVideo}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Adding to Video...
                </>
              ) : (
                <>
                  <Subtitles className="h-4 w-4 mr-2" />
                  Add to Video
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
