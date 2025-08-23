import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Film, FileVideo } from 'lucide-react';

interface UploadAreaProps {
  onFileUpload: (file: File) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      onFileUpload(videoFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onFileUpload(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <Card 
        className={`border-dashed border-2 transition-all duration-300 ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            {/* Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <FileVideo className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center border-2 border-background">
                <Upload className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">
                Upload Your Video
              </h3>
              <p className="text-muted-foreground max-w-md">
                Drag and drop your video file here, or click to browse. 
                Supports MP4, MOV, AVI, and more.
              </p>
            </div>

            {/* Upload Button */}
            <div className="space-y-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 text-white font-medium px-8"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Choose Video File
                </Button>
              </label>
              
              <p className="text-xs text-muted-foreground">
                Maximum file size: 2GB
              </p>
            </div>

            {/* Supported Formats */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Supported formats:</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Film className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">MP4</span>
                </div>
                <div className="flex items-center gap-1">
                  <Film className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">MOV</span>
                </div>
                <div className="flex items-center gap-1">
                  <Film className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">AVI</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};