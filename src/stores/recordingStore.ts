import { create } from 'zustand';
import { recordingService, RecordingOptions } from '../services/RecordingService';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

interface RecordingStore {
  // State
  recordingState: RecordingState;
  recordingDuration: number;
  recordingBlob: Blob | null;
  recordingUrl: string | null;
  error: string | null;
  
  // Options
  recordingOptions: RecordingOptions;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  updateRecordingDuration: (duration: number) => void;
  setRecordingOptions: (options: Partial<RecordingOptions>) => void;
  resetRecording: () => void;
  setError: (error: string | null) => void;
}

export const useRecordingStore = create<RecordingStore>((set, get) => ({
  // Initial state
  recordingState: 'idle',
  recordingDuration: 0,
  recordingBlob: null,
  recordingUrl: null,
  error: null,
  
  recordingOptions: {
    video: true,
    audio: true,
    screen: true,
    camera: false,
  },
  
  // Actions
  startRecording: async () => {
    const state = get();
    
    // Clear any existing errors
    set({ error: null });
    
    // Validate recording options
    const { recordingOptions } = state;
    if (!recordingOptions.screen && !recordingOptions.camera && !recordingOptions.audio) {
      set({ error: 'Please select at least one recording source' });
      return;
    }
    
    try {
      console.log('Starting recording with options:', recordingOptions);
      set({ recordingState: 'recording', recordingDuration: 0 });
      
      await recordingService.startRecording(recordingOptions);
      
      // Start duration timer - store timer ID to clean up properly
      const timer = setInterval(() => {
        const currentState = get();
        if (currentState.recordingState === 'recording') {
          const duration = recordingService.getRecordingDuration();
          set({ recordingDuration: duration });
        } else {
          clearInterval(timer);
        }
      }, 100);
      
      // Store timer for cleanup
      (get() as any)._durationTimer = timer;
      
    } catch (error) {
      console.error('Recording start failed:', error);
      // Clean up any timer
      const timer = (get() as any)._durationTimer;
      if (timer) {
        clearInterval(timer);
        delete (get() as any)._durationTimer;
      }
      
      set({ 
        recordingState: 'idle', 
        recordingDuration: 0,
        error: error instanceof Error ? error.message : 'Failed to start recording' 
      });
    }
  },
  
  stopRecording: async () => {
    try {
      set({ recordingState: 'processing' });
      
      // Clean up timer
      const timer = (get() as any)._durationTimer;
      if (timer) {
        clearInterval(timer);
        delete (get() as any)._durationTimer;
      }
      
      const blob = await recordingService.stopRecording();
      
      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Recording failed - empty or invalid file');
      }
      
      const url = URL.createObjectURL(blob);
      console.log('Recording completed:', {
        size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        type: blob.type,
        url: url
      });
      
      set({ 
        recordingState: 'idle',
        recordingBlob: blob,
        recordingUrl: url,
        error: null,
      });
    } catch (error) {
      console.error('Recording stop failed:', error);
      
      // Clean up timer
      const timer = (get() as any)._durationTimer;
      if (timer) {
        clearInterval(timer);
        delete (get() as any)._durationTimer;
      }
      
      set({ 
        recordingState: 'idle', 
        recordingDuration: 0,
        error: error instanceof Error ? error.message : 'Failed to stop recording' 
      });
    }
  },
  
  pauseRecording: async () => {
    try {
      await recordingService.pauseRecording();
      set({ recordingState: 'paused' });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to pause recording' });
    }
  },
  
  resumeRecording: async () => {
    try {
      await recordingService.resumeRecording();
      set({ recordingState: 'recording' });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to resume recording' });
    }
  },
  
  updateRecordingDuration: (duration: number) => {
    set({ recordingDuration: duration });
  },
  
  setRecordingOptions: (options: Partial<RecordingOptions>) => {
    set((state) => ({
      recordingOptions: { ...state.recordingOptions, ...options }
    }));
  },
  
  resetRecording: () => {
    const state = get();
    
    // Clean up timer
    const timer = (state as any)._durationTimer;
    if (timer) {
      clearInterval(timer);
      delete (state as any)._durationTimer;
    }
    
    // Clean up blob URL
    if (state.recordingUrl) {
      URL.revokeObjectURL(state.recordingUrl);
    }
    
    set({
      recordingState: 'idle',
      recordingDuration: 0,
      recordingBlob: null,
      recordingUrl: null,
      error: null,
    });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
}));