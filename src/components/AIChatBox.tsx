import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Sparkles } from 'lucide-react';

interface AIChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  clipId: string;
  clipName: string;
  startTime: number;
  endTime: number;
}

export const AIChatBox: React.FC<AIChatBoxProps> = ({
  isOpen,
  onClose,
  clipId,
  clipName,
  startTime,
  endTime
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    
    // TODO: Implement AI processing here
    console.log('AI Edit Request:', {
      clipId,
      message: message.trim(),
      timeRange: `${formatTime(startTime)} - ${formatTime(endTime)}`
    });
    
    // Simulate AI processing
    setTimeout(() => {
      setIsLoading(false);
      setMessage('');
      // TODO: Apply AI edits to the video
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                size="sm"
                className="px-3"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {isLoading && (
              <div className="text-xs text-muted-foreground text-center">
                Processing with AI...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
