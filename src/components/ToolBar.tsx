import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Scissors, Download, Eye, EyeOff } from 'lucide-react';

interface ToolBarProps {
  onCut: () => void;
  canCut: boolean;
  onExport: () => void;
  onTogglePreview: () => void;
  previewMode: boolean;
  hasClips: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({ 
  onCut, 
  canCut, 
  onExport, 
  onTogglePreview, 
  previewMode, 
  hasClips 
}) => {
  return (
    <div className="h-12 bg-editor-panel border-b border-border px-4 flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCut}
          disabled={!canCut}
          className="text-foreground hover:bg-secondary"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePreview}
          disabled={!hasClips}
          className="text-foreground hover:bg-secondary"
        >
          {previewMode ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Original
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </>
          )}
        </Button>
      </div>
      
      <div className="ml-auto">
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          disabled={!hasClips}
          className="bg-primary hover:bg-primary/90"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
};