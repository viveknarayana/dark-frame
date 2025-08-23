import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Scissors, Download, Eye, EyeOff, Subtitles, Video } from 'lucide-react';

interface ToolBarProps {
  onCut: () => void;
  canCut: boolean;
  onExport: () => void;
  onTogglePreview: () => void;
  onRecord?: () => void;
  previewMode: boolean;
  hasClips: boolean;
  onAddSubtitles: () => void;
  isAddingSubtitles: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({ 
  onCut, 
  canCut, 
  onExport, 
  onTogglePreview,
  onRecord, 
  previewMode, 
  hasClips,
  onAddSubtitles,
  isAddingSubtitles
}) => {
  return (
    <div className="h-12 bg-editor-panel border-b border-border px-4 flex items-center gap-2">
      <div className="flex items-center gap-2">
        {onRecord && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRecord}
              className="text-foreground hover:bg-secondary"
            >
              <Video className="h-4 w-4 mr-2" />
              Record
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        
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
          onClick={() => {
            console.log('Preview button clicked:', {
              previewMode,
              hasClips,
              disabled: !hasClips
            });
            onTogglePreview();
          }}
          disabled={!hasClips}
          className={`text-foreground hover:bg-secondary ${!hasClips ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${previewMode ? 'bg-secondary' : ''}`}
        >
          {previewMode ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Show Original
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Edited
            </>
          )}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onAddSubtitles}
          disabled={!hasClips || isAddingSubtitles}
          className="text-foreground hover:bg-secondary"
        >
          {isAddingSubtitles ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Transcribing...
            </>
          ) : (
            <>
              <Subtitles className="h-4 w-4 mr-2" />
              Add Subtitles
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