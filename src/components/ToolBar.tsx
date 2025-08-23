import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Scissors, 
  Copy, 
  Trash2, 
  Undo, 
  Redo, 
  Save, 
  Download,
  Settings,
  Zap
} from 'lucide-react';

interface ToolBarProps {
  onCut: () => void;
  canCut: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  onCut,
  canCut
}) => {
  return (
    <div className="h-14 bg-gradient-panel border-b border-border px-4 flex items-center gap-2">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2 mr-6">
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg text-foreground">VideoEdit Pro</span>
      </div>

      {/* Edit Tools */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-foreground hover:bg-secondary">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-foreground hover:bg-secondary">
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Video Tools */}
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCut}
          disabled={!canCut}
          className="text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <Scissors className="h-4 w-4" />
          <span className="ml-1 text-xs">Cut</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={!canCut}
          className="text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
          <span className="ml-1 text-xs">Copy</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={!canCut}
          className="text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 text-xs">Delete</span>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Export Tools */}
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="sm" className="text-foreground hover:bg-secondary">
          <Save className="h-4 w-4" />
          <span className="ml-1 text-xs">Save</span>
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="bg-gradient-primary hover:opacity-90 text-white font-medium"
        >
          <Download className="h-4 w-4" />
          <span className="ml-1">Export</span>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <Button variant="ghost" size="sm" className="text-foreground hover:bg-secondary">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
};