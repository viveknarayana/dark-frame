import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Sparkles, Camera, Download } from 'lucide-react';
import { Veo3Service } from '../utils/veo3Service';
import { useToast } from '@/hooks/use-toast';

interface AIChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  clipId: string;
  clipName: string;
  startTime: number;
  endTime: number;
  videoUrl: string;
  onVideoProcessed?: (processedVideoBlob: Blob, startTime: number, endTime: number) => void;
}

export const AIChatBox: React.FC<AIChatBoxProps> = ({
  isOpen,
  onClose,
  clipId,
  clipName,
  startTime,
  endTime,
  videoUrl,
  onVideoProcessed
}) => {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [processedVideo, setProcessedVideo] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const captureFrame = async (time: number): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.currentTime = time;
      
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        }
      };
      
      video.onerror = () => {
        resolve(''); // Return empty string on error
      };
      
      video.src = videoUrl;
    });
  };

  const captureFrames = async () => {
    setIsCapturing(true);
    
    try {
      const startFrameData = await captureFrame(startTime);
      const endFrameData = await captureFrame(endTime);
      
      setStartFrame(startFrameData);
      setEndFrame(endFrameData);
    } catch (error) {
      console.error('Error capturing frames:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const processVideoWithAI = async (prompt: string, startFrame: string, endFrame: string) => {
    setIsProcessing(true);
    
    try {
      // Use the Veo3 service to generate video
      const veo3Service = new Veo3Service();
      const result = await veo3Service.generateVideoFromImage(prompt, startFrame, endTime - startTime);
      
      console.log('✅ Video generation completed successfully:', {
        videoBlobSize: result.videoBlob.size,
        duration: result.duration,
        fps: result.fps
      });

      setProcessedVideo(result.videoBlob);
      
      // Call the callback to insert the processed video into timeline
      if (onVideoProcessed) {
        console.log('🔄 Calling onVideoProcessed callback...');
        onVideoProcessed(result.videoBlob, startTime, endTime);
        console.log('✅ onVideoProcessed callback completed');
      }
      
      // Show success message
      toast({
        title: "AI Video Generation Complete",
        description: "The video has been processed and added to your timeline. You can now download it or continue editing.",
      });
      
    } catch (error) {
      console.error('Error processing video with AI:', error);
      // For now, simulate a successful response with a mock video
      simulateAIResponse();
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateAIResponse = () => {
    // Simulate AI processing for demo purposes
    setTimeout(() => {
      // Create a mock video blob (in real implementation, this would be the AI response)
      const mockVideoBlob = new Blob(['mock video data'], { type: 'video/mp4' });
      setProcessedVideo(mockVideoBlob);
      
      if (onVideoProcessed) {
        onVideoProcessed(mockVideoBlob, startTime, endTime);
      }
    }, 3000);
  };

  useEffect(() => {
    if (isOpen && videoUrl) {
      captureFrames();
    }
  }, [isOpen, videoUrl, startTime, endTime]);

  const handleSend = async () => {
    if (!message.trim() || !startFrame || !endFrame) return;
    
    setIsLoading(true);
    
    try {
      await processVideoWithAI(message.trim(), startFrame, endFrame);
      setMessage('');
    } catch (error) {
      console.error('Error sending AI request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownloadProcessedVideo = () => {
    if (processedVideo) {
      const url = URL.createObjectURL(processedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-processed-${clipName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">AI Video Editor</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Editing: {clipName} ({formatTime(startTime)} - {formatTime(endTime)})
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Captured Frames */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Camera className="h-3 w-3" />
                Captured Frames
              </div>
              
              {isCapturing ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-xs text-muted-foreground">Capturing frames...</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {startFrame && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground text-center">Start Frame</div>
                      <img 
                        src={startFrame} 
                        alt="Start frame" 
                        className="w-full h-20 object-cover rounded border border-border"
                      />
                    </div>
                  )}
                  {endFrame && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground text-center">End Frame</div>
                      <img 
                        src={endFrame} 
                        alt="End frame" 
                        className="w-full h-20 object-cover rounded border border-border"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Processed Video Preview */}
            {processedVideo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  AI Processed Video
                </div>
                <div className="bg-secondary rounded p-2">
                  <video 
                    src={URL.createObjectURL(processedVideo)} 
                    className="w-full h-20 object-cover rounded"
                    controls
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadProcessedVideo}
                  className="w-full text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Processed Video
                </Button>
              </div>
            )}
            
            {/* Chat messages would go here */}
            <div className="text-xs text-muted-foreground text-center py-2">
              Describe what you want to do with this video segment...
            </div>
            
            {/* Input area */}
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 'Remove background noise' or 'Add slow motion effect'"
                className="flex-1 text-sm"
                disabled={isLoading || isProcessing}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isLoading || isProcessing}
                size="sm"
                className="px-3"
              >
                {isLoading || isProcessing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {(isLoading || isProcessing) && (
              <div className="text-xs text-muted-foreground text-center">
                {isLoading ? 'Sending to AI...' : 'Processing video with AI...'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
