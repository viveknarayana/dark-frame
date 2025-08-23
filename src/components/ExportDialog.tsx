import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (onProgress: (progress: number) => void) => Promise<Blob>;
  fileName: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  fileName
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setError(null);
    setExportedBlob(null);

    try {
      const blob = await onExport((progress) => {
        setProgress(progress);
      });
      
      setExportedBlob(blob);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedBlob) return;

    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_edited.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onClose();
  };

  const handleClose = () => {
    setProgress(0);
    setError(null);
    setExportedBlob(null);
    setIsExporting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isExporting && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Processing video... This may take a few minutes.
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-center text-muted-foreground">
                {progress.toFixed(0)}%
              </div>
            </div>
          )}
          
          {exportedBlob && (
            <div className="text-center space-y-2">
              <div className="text-sm text-green-600">
                ✓ Video exported successfully!
              </div>
              <div className="text-xs text-muted-foreground">
                Size: {(exportedBlob.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          )}
          
          {!isExporting && !exportedBlob && !error && (
            <div className="text-sm text-muted-foreground">
              This will create a new video file with your edits applied. 
              Deleted segments will be permanently removed.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isExporting}>
            Cancel
          </Button>
          {exportedBlob ? (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          ) : (
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Video'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};