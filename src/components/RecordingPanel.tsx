import React, { useEffect, useRef, useState } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Camera,
  Circle,
  Square,
  Pause,
  Play,
  Download,
  Settings,
  AlertCircle
} from 'lucide-react';
import { recordingService } from '../services/RecordingService';
import { cn } from '@/lib/utils';

export const RecordingPanel: React.FC = () => {
  const {
    recordingState,
    recordingDuration,
    recordingUrl,
    recordingOptions,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    setRecordingOptions,
    resetRecording,
  } = useRecordingStore();

  const [showPreview, setShowPreview] = useState(false);
  const screenPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Format duration for display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes % 60)}:${pad(seconds % 60)}`;
    }
    return `${pad(minutes)}:${pad(seconds % 60)}`;
  };

  // Setup camera preview when enabled
  useEffect(() => {
    const setupCameraPreview = async () => {
      if (recordingOptions.camera && showPreview) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }, 
            audio: false 
          });
          setCameraStream(stream);
          if (cameraPreviewRef.current) {
            cameraPreviewRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error('Camera preview error:', err);
        }
      } else if (!recordingOptions.camera && cameraStream) {
        // Clean up camera stream when disabled
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    };
    
    setupCameraPreview();
    
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [recordingOptions.camera, showPreview]);

  // Update preview streams during recording
  useEffect(() => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      const streams = recordingService.getStreams();
      
      if (screenPreviewRef.current && streams.screen) {
        screenPreviewRef.current.srcObject = streams.screen;
      }
      
      if (cameraPreviewRef.current && streams.camera) {
        cameraPreviewRef.current.srcObject = streams.camera;
      }
    }
  }, [recordingState]);

  const handleStartRecording = async () => {
    await startRecording();
    setShowPreview(true);
  };

  const handleStopRecording = async () => {
    await stopRecording();
    setShowPreview(false);
  };

  const handleDownloadRecording = () => {
    if (recordingUrl) {
      const a = document.createElement('a');
      a.href = recordingUrl;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">Capture your screen, camera, and audio</p>
          {/* Show current recording mode */}
          {(recordingOptions.screen || recordingOptions.camera || recordingOptions.audio) && (
            <div className="flex gap-1">
              {recordingOptions.screen && <Badge variant="outline" className="text-xs">Screen</Badge>}
              {recordingOptions.camera && <Badge variant="outline" className="text-xs">Camera</Badge>}
              {recordingOptions.audio && <Badge variant="outline" className="text-xs">Audio</Badge>}
            </div>
          )}
        </div>
        
        {recordingState !== 'idle' && (
          <Badge variant={recordingState === 'recording' ? 'destructive' : 'secondary'} className="text-lg px-3 py-1">
            {recordingState === 'recording' && <Circle className="w-3 h-3 mr-2 fill-current animate-pulse" />}
            {formatDuration(recordingDuration)}
          </Badge>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <Tabs defaultValue="setup" value={recordingState === 'idle' ? 'setup' : 'recording'}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" disabled={recordingState !== 'idle'}>
            <Settings className="w-4 h-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="recording" disabled={recordingState === 'idle'}>
            <Video className="w-4 h-4 mr-2" />
            Recording
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          {/* Recording Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  <Label htmlFor="screen">Screen Recording</Label>
                </div>
                <Switch
                  id="screen"
                  checked={recordingOptions.screen}
                  onCheckedChange={(checked) => setRecordingOptions({ screen: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  <Label htmlFor="camera">Camera</Label>
                </div>
                <Switch
                  id="camera"
                  checked={recordingOptions.camera}
                  onCheckedChange={(checked) => setRecordingOptions({ camera: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {recordingOptions.audio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  <Label htmlFor="audio">Microphone</Label>
                </div>
                <Switch
                  id="audio"
                  checked={recordingOptions.audio}
                  onCheckedChange={(checked) => setRecordingOptions({ audio: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  <Label htmlFor="preview">Show Preview</Label>
                </div>
                <Switch
                  id="preview"
                  checked={showPreview}
                  onCheckedChange={setShowPreview}
                />
              </div>
            </div>
          </div>

          {/* Preview Area */}
          {showPreview && (
            <div className="grid grid-cols-2 gap-4">
              {recordingOptions.screen && (
                <div className="space-y-2">
                  <Label>Screen Preview</Label>
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <video
                      ref={screenPreviewRef}
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                    />
                    {!recordingState && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-muted-foreground">Will display when recording starts</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {recordingOptions.camera && (
                <div className="space-y-2">
                  <Label>Camera Preview</Label>
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <video
                      ref={cameraPreviewRef}
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Start Recording Button */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="px-8"
              onClick={handleStartRecording}
              disabled={!recordingOptions.screen && !recordingOptions.camera}
            >
              <Circle className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4">
          {/* Live Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {recordingOptions.screen && (
              <video
                ref={screenPreviewRef}
                autoPlay
                muted
                className="w-full h-full object-contain"
              />
            )}
            
            {recordingOptions.camera && (
              <div className="absolute bottom-4 right-4 w-48 aspect-video bg-background rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={cameraPreviewRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-4">
            {recordingState === 'recording' ? (
              <>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={pauseRecording}
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStopRecording}
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              </>
            ) : recordingState === 'paused' ? (
              <>
                <Button
                  size="lg"
                  variant="default"
                  onClick={resumeRecording}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStopRecording}
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Processing recording...</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recording Result */}
      {recordingUrl && recordingState === 'idle' && (
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Recording Complete</h3>
              <p className="text-sm text-muted-foreground">Duration: {formatDuration(recordingDuration)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadRecording}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={resetRecording}>
                New Recording
              </Button>
            </div>
          </div>
          
          <video
            src={recordingUrl}
            controls
            className="w-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
};