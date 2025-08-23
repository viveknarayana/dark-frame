import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Film, Image, Music, Folder } from 'lucide-react';

interface MediaPanelProps {
  videoFile: File | null;
  onFileUpload: (file: File) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  videoFile,
  onFileUpload
}) => {
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onFileUpload(file);
    }
  };

  return (
    <div className="w-80 bg-gradient-panel border-r border-border flex flex-col">
      {/* Media Panel Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Media</h2>
      </div>

      {/* Media Categories */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Film className="h-4 w-4" />
            Videos
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Music className="h-4 w-4" />
            Audio
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Image className="h-4 w-4" />
            Images
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Folder className="h-4 w-4" />
            Projects
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-4">
        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-6 text-center">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                Supports MP4, MOV, AVI
              </p>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Media Library */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-sm font-medium text-foreground mb-3">Recent Files</h3>
        
        {videoFile ? (
          <div className="space-y-2">
            <Card className="bg-secondary border-border hover:bg-secondary/80 transition-colors cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-editor-clip rounded flex items-center justify-center">
                    <Film className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {videoFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <Film className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No media files yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a video to get started
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            Import Media
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            New Project
          </Button>
        </div>
      </div>
    </div>
  );
};