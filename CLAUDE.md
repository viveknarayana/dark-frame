# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dark Frame is a browser-based video editor built with React, TypeScript, and Vite. It provides video trimming, cutting, and editing capabilities using FFmpeg WASM for client-side video processing.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **Video Processing**: FFmpeg WASM (@ffmpeg/ffmpeg)
- **State Management**: React hooks and local state
- **Routing**: React Router v6

## Essential Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Core Components

- **VideoEditor** (`src/components/VideoEditor.tsx`): Main editor component that orchestrates all functionality
- **VideoPlayer** (`src/components/VideoPlayer.tsx`): Handles video playback with preview mode support
- **Timeline** (`src/components/Timeline.tsx`): Timeline interface for clip management
- **videoProcessor** (`src/utils/videoProcessor.ts`): FFmpeg wrapper for video processing operations

### Key Features

1. **Video Upload & Processing**: Files are processed client-side using FFmpeg WASM
2. **Clip Management**: Videos can be cut into clips that can be rearranged, deleted, or trimmed
3. **Preview Mode**: Two modes - original view and preview with deleted segments removed
4. **Export**: Processed videos are exported as MP4 using FFmpeg concatenation

### Data Flow

1. User uploads video → creates VideoClip objects with metadata
2. Clips are managed in VideoEditor state
3. Preview mode uses virtual segments to simulate final output
4. Export processes clips through FFmpeg to create final video

## TypeScript Configuration

The project uses relaxed TypeScript settings:
- `noImplicitAny`: false
- `strictNullChecks`: false
- Path alias: `@/*` maps to `./src/*`

## Important Considerations

- FFmpeg WASM loads from CDN (unpkg.com) - requires internet connection
- Video processing happens entirely in the browser (memory intensive)
- Debug elements are present in VideoEditor component (red debug banner)
- Toast notifications guide users through workflow (e.g., suggesting preview mode after deletion)