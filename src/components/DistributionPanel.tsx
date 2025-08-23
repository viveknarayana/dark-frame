import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Youtube,
  Music,
  Camera,
  Briefcase,
  Twitter,
  Hash,
  Calendar,
  MapPin,
  AtSign,
  Lock,
  Unlock
} from 'lucide-react';
import { platformService, PLATFORM_CONFIGS, type UploadOptions } from '../services/PlatformService';
import { cn } from '@/lib/utils';

interface DistributionPanelProps {
  videoBlob: Blob | null;
  videoDuration: number;
  fileName: string;
}

interface PlatformStatus {
  platform: string;
  selected: boolean;
  connected: boolean;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  url?: string;
  progress?: number;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-5 h-5" />,
  youtubeShorts: <Youtube className="w-5 h-5" />,
  tiktok: <Music className="w-5 h-5" />,
  instagram: <Camera className="w-5 h-5" />,
  linkedin: <Briefcase className="w-5 h-5" />,
  twitter: <Twitter className="w-5 h-5" />,
};

export const DistributionPanel: React.FC<DistributionPanelProps> = ({
  videoBlob,
  videoDuration,
  fileName,
}) => {
  const [platforms, setPlatforms] = useState<Map<string, PlatformStatus>>(new Map());
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    title: fileName.replace(/\.[^/.]+$/, ''),
    description: '',
    hashtags: [],
  });
  const [hashtagInput, setHashtagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize platforms
  useEffect(() => {
    const initialPlatforms = new Map<string, PlatformStatus>();
    Object.keys(PLATFORM_CONFIGS).forEach(platform => {
      initialPlatforms.set(platform, {
        platform,
        selected: false,
        connected: platformService.isConnected(platform),
        uploading: false,
        uploaded: false,
      });
    });
    setPlatforms(initialPlatforms);
  }, []);

  const handlePlatformToggle = (platformName: string) => {
    setPlatforms(prev => {
      const newMap = new Map(prev);
      const platform = newMap.get(platformName);
      if (platform) {
        platform.selected = !platform.selected;
      }
      return newMap;
    });
  };

  const handleAddHashtag = () => {
    if (hashtagInput.trim() && !uploadOptions.hashtags.includes(hashtagInput.trim())) {
      setUploadOptions(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, hashtagInput.trim().replace(/^#/, '')],
      }));
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    setUploadOptions(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(h => h !== hashtag),
    }));
  };

  const handleUpload = async () => {
    if (!videoBlob) return;

    const selectedPlatforms = Array.from(platforms.entries())
      .filter(([_, status]) => status.selected)
      .map(([platform, _]) => platform);

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progressive upload
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      // Upload to each platform
      const results = await platformService.uploadToMultiplePlatforms(
        selectedPlatforms,
        videoBlob,
        uploadOptions
      );

      // Update platform statuses
      setPlatforms(prev => {
        const newMap = new Map(prev);
        results.forEach((result, platform) => {
          const status = newMap.get(platform);
          if (status) {
            status.uploaded = result.success;
            status.error = result.error;
            status.url = result.url;
            status.uploading = false;
          }
        });
        return newMap;
      });

      setUploadProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  const getSelectedPlatformCount = () => {
    return Array.from(platforms.values()).filter(p => p.selected).length;
  };

  const validatePlatform = (platformName: string) => {
    if (!videoBlob) return null;
    return platformService.validateVideo(platformName, videoBlob, videoDuration);
  };

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="platforms" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from(platforms.entries()).map(([platformName, status]) => {
              const config = PLATFORM_CONFIGS[platformName];
              const validation = validatePlatform(platformName);
              
              return (
                <Card 
                  key={platformName}
                  className={cn(
                    "cursor-pointer transition-all",
                    status.selected && "ring-2 ring-primary"
                  )}
                  onClick={() => handlePlatformToggle(platformName)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {PLATFORM_ICONS[platformName]}
                        <CardTitle className="text-base">{config.displayName}</CardTitle>
                      </div>
                      <Checkbox 
                        checked={status.selected}
                        onCheckedChange={() => handlePlatformToggle(platformName)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Max:</span>
                      <Badge variant="outline">{config.maxDuration}s</Badge>
                      <Badge variant="outline">{config.preferredAspectRatio.label}</Badge>
                    </div>
                    
                    {status.uploaded && (
                      <Alert className="py-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Uploaded successfully
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {status.error && (
                      <Alert variant="destructive" className="py-2">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {status.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {validation && !validation.isValid && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {validation.errors[0]}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {validation && validation.warnings.length > 0 && (
                      <Alert className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {validation.warnings[0]}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={uploadOptions.title}
                onChange={(e) => setUploadOptions(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadOptions.description}
                onChange={(e) => setUploadOptions(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter video description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hashtags">Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  id="hashtags"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                  placeholder="Add hashtag"
                />
                <Button onClick={handleAddHashtag} size="sm">
                  <Hash className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {uploadOptions.hashtags.map(hashtag => (
                  <Badge 
                    key={hashtag}
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => handleRemoveHashtag(hashtag)}
                  >
                    #{hashtag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <Label>Schedule Post</Label>
              </div>
              <Input
                type="datetime-local"
                onChange={(e) => setUploadOptions(prev => ({ 
                  ...prev, 
                  scheduledTime: e.target.value ? new Date(e.target.value) : undefined 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <Label>Location</Label>
              </div>
              <Input
                placeholder="Add location"
                onChange={(e) => setUploadOptions(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {uploadOptions.isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <Label>Privacy</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOptions(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              >
                {uploadOptions.isPrivate ? 'Private' : 'Public'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading to {getSelectedPlatformCount()} platforms...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {getSelectedPlatformCount()} platform{getSelectedPlatformCount() !== 1 ? 's' : ''} selected
        </div>
        <Button 
          onClick={handleUpload}
          disabled={!videoBlob || isUploading || getSelectedPlatformCount() === 0}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload to Platforms
            </>
          )}
        </Button>
      </div>
    </div>
  );
};