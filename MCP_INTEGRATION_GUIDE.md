# MCP Integration Guide for Social Platform Distribution

## Overview

This guide outlines how to implement Model Context Protocol (MCP) servers for seamless social media platform integration with Dark Frame's video distribution system.

## Current Implementation

### ✅ What's Built
1. **Platform Service** (`src/services/PlatformService.ts`) - Complete platform abstraction layer
2. **Distribution Panel** (`src/components/DistributionPanel.tsx`) - Multi-platform upload UI
3. **Platform Configurations** - Detailed specs for YouTube, TikTok, Instagram, LinkedIn, Twitter
4. **Video Validation** - Platform-specific format and duration checking
5. **Upload Orchestration** - Batch upload to multiple platforms

### 📋 What Needs MCP Integration
- Authentication with social platforms
- Actual API calls to upload videos
- Real-time upload progress tracking
- Analytics and metrics collection

## MCP Server Architecture

### Required MCP Servers

#### 1. YouTube MCP Server (`mcp-youtube`)
```typescript
interface YouTubeMCPTools {
  // Authentication
  'youtube.authenticate': (scopes: string[]) => Promise<AuthToken>;
  'youtube.refreshToken': (refreshToken: string) => Promise<AuthToken>;
  
  // Upload
  'youtube.uploadVideo': (params: {
    videoBlob: Blob;
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacy: 'private' | 'public' | 'unlisted';
    thumbnail?: Blob;
  }) => Promise<UploadResult>;
  
  // Analytics
  'youtube.getVideoAnalytics': (videoId: string) => Promise<AnalyticsData>;
}
```

#### 2. TikTok MCP Server (`mcp-tiktok`)
```typescript
interface TikTokMCPTools {
  'tiktok.authenticate': () => Promise<AuthToken>;
  'tiktok.uploadVideo': (params: {
    videoBlob: Blob;
    description: string;
    hashtags: string[];
    privacy: 'public' | 'private';
    allowComments: boolean;
    allowDuet: boolean;
  }) => Promise<UploadResult>;
  'tiktok.getVideoMetrics': (videoId: string) => Promise<AnalyticsData>;
}
```

#### 3. Instagram MCP Server (`mcp-instagram`)
```typescript
interface InstagramMCPTools {
  'instagram.authenticate': () => Promise<AuthToken>;
  'instagram.uploadReel': (params: {
    videoBlob: Blob;
    caption: string;
    hashtags: string[];
    location?: string;
    coverImage?: Blob;
  }) => Promise<UploadResult>;
  'instagram.schedulePost': (params: ScheduleParams) => Promise<ScheduleResult>;
}
```

#### 4. LinkedIn MCP Server (`mcp-linkedin`)
```typescript
interface LinkedInMCPTools {
  'linkedin.authenticate': () => Promise<AuthToken>;
  'linkedin.uploadVideo': (params: {
    videoBlob: Blob;
    text: string;
    visibility: 'public' | 'connections';
    articleLink?: string;
  }) => Promise<UploadResult>;
  'linkedin.getPageAnalytics': () => Promise<AnalyticsData>;
}
```

#### 5. Twitter/X MCP Server (`mcp-twitter`)
```typescript
interface TwitterMCPTools {
  'twitter.authenticate': () => Promise<AuthToken>;
  'twitter.uploadVideo': (params: {
    videoBlob: Blob;
    text: string;
    replyTo?: string;
  }) => Promise<UploadResult>;
  'twitter.schedulePost': (params: ScheduleParams) => Promise<ScheduleResult>;
}
```

## Integration Points in Dark Frame

### 1. Update PlatformService.ts

```typescript
// Add MCP client integration
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class PlatformService {
  private mcpClients: Map<string, Client> = new Map();

  async initializeMCPServers(): Promise<void> {
    const servers = [
      { name: 'youtube', command: 'mcp-youtube', args: [] },
      { name: 'tiktok', command: 'mcp-tiktok', args: [] },
      { name: 'instagram', command: 'mcp-instagram', args: [] },
      { name: 'linkedin', command: 'mcp-linkedin', args: [] },
      { name: 'twitter', command: 'mcp-twitter', args: [] },
    ];

    for (const server of servers) {
      const transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
      });

      const client = new Client(
        { name: 'dark-frame', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      this.mcpClients.set(server.name, client);
    }
  }

  async uploadToPlatform(
    platform: string,
    videoBlob: Blob,
    options: UploadOptions
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const client = this.mcpClients.get(platform);
    if (!client) {
      return { success: false, error: `MCP server for ${platform} not available` };
    }

    try {
      // Convert blob to base64 for MCP transmission
      const base64Data = await this.blobToBase64(videoBlob);
      
      // Platform-specific upload logic
      let result: any;
      switch (platform) {
        case 'youtube':
          result = await client.callTool({
            name: 'youtube.uploadVideo',
            arguments: {
              videoData: base64Data,
              title: options.title,
              description: options.description,
              tags: options.hashtags,
              privacy: options.isPrivate ? 'private' : 'public',
            },
          });
          break;
          
        case 'tiktok':
          result = await client.callTool({
            name: 'tiktok.uploadVideo',
            arguments: {
              videoData: base64Data,
              description: options.description,
              hashtags: options.hashtags,
              privacy: options.isPrivate ? 'private' : 'public',
            },
          });
          break;
          
        // Add other platforms...
      }

      return {
        success: true,
        url: result.content[0].text, // Assuming URL is returned
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
```

### 2. Authentication Flow

```typescript
// Add to PlatformService
async authenticatePlatform(platform: string): Promise<void> {
  const client = this.mcpClients.get(platform);
  if (!client) throw new Error(`Platform ${platform} not available`);

  try {
    const result = await client.callTool({
      name: `${platform}.authenticate`,
      arguments: {
        scopes: this.getPlatformScopes(platform),
        redirectUri: `${window.location.origin}/auth-callback`,
      },
    });

    // Handle OAuth flow
    const authUrl = result.content[0].text;
    window.open(authUrl, '_blank', 'width=600,height=600');
    
    // Listen for auth completion
    const authResult = await this.waitForAuthCallback();
    
    // Store credentials
    this.credentials.set(platform, authResult);
  } catch (error) {
    console.error(`Authentication failed for ${platform}:`, error);
    throw error;
  }
}
```

## MCP Server Implementation Examples

### YouTube MCP Server (`servers/youtube/index.js`)

```javascript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { google } from 'googleapis';
import fs from 'fs';

class YouTubeMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'youtube-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    this.youtube = google.youtube('v3');
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'youtube.authenticate',
          description: 'Authenticate with YouTube API',
          inputSchema: {
            type: 'object',
            properties: {
              scopes: { type: 'array', items: { type: 'string' } },
              redirectUri: { type: 'string' }
            }
          }
        },
        {
          name: 'youtube.uploadVideo',
          description: 'Upload video to YouTube',
          inputSchema: {
            type: 'object',
            properties: {
              videoData: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              privacy: { type: 'string' }
            },
            required: ['videoData', 'title']
          }
        }
      ]
    }));

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'youtube.authenticate':
          return this.authenticate(args);
          
        case 'youtube.uploadVideo':
          return this.uploadVideo(args);
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async authenticate({ scopes, redirectUri }) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    return {
      content: [{ type: 'text', text: authUrl }]
    };
  }

  async uploadVideo({ videoData, title, description, tags, privacy }) {
    try {
      // Convert base64 to buffer
      const videoBuffer = Buffer.from(videoData, 'base64');
      const tempPath = `/tmp/upload-${Date.now()}.mp4`;
      fs.writeFileSync(tempPath, videoBuffer);

      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags,
          },
          status: {
            privacyStatus: privacy,
          },
        },
        media: {
          body: fs.createReadStream(tempPath),
        },
      });

      // Cleanup
      fs.unlinkSync(tempPath);

      return {
        content: [{
          type: 'text',
          text: `https://youtube.com/watch?v=${response.data.id}`
        }]
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new YouTubeMCPServer();
server.run().catch(console.error);
```

## Configuration Setup

### 1. Package.json MCP Configuration
```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["./servers/youtube/index.js"],
      "env": {
        "YOUTUBE_CLIENT_ID": "${YOUTUBE_CLIENT_ID}",
        "YOUTUBE_CLIENT_SECRET": "${YOUTUBE_CLIENT_SECRET}"
      }
    },
    "tiktok": {
      "command": "node", 
      "args": ["./servers/tiktok/index.js"],
      "env": {
        "TIKTOK_CLIENT_KEY": "${TIKTOK_CLIENT_KEY}",
        "TIKTOK_CLIENT_SECRET": "${TIKTOK_CLIENT_SECRET}"
      }
    }
  }
}
```

### 2. Environment Variables
```bash
# YouTube API
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# TikTok API
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Instagram API
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# LinkedIn API  
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Twitter API
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
```

## Integration Checklist

### Phase 1: Core MCP Setup ✅
- [x] Design MCP server architecture
- [x] Create platform service abstraction
- [x] Build distribution UI components
- [x] Implement video validation

### Phase 2: MCP Server Development 🔄
- [ ] Implement YouTube MCP server
- [ ] Implement TikTok MCP server  
- [ ] Implement Instagram MCP server
- [ ] Implement LinkedIn MCP server
- [ ] Implement Twitter MCP server

### Phase 3: Authentication Flow 📋
- [ ] OAuth 2.0 implementation for each platform
- [ ] Secure token storage
- [ ] Token refresh mechanisms
- [ ] Multi-account support

### Phase 4: Upload Pipeline 📋  
- [ ] Video format conversion per platform
- [ ] Progress tracking and error handling
- [ ] Retry mechanisms
- [ ] Thumbnail generation

### Phase 5: Analytics Integration 📋
- [ ] Real-time upload status
- [ ] View count tracking
- [ ] Engagement metrics
- [ ] Performance analytics dashboard

## Testing Strategy

### 1. Mock MCP Servers
Create mock servers for development that simulate platform responses without actual uploads.

### 2. Platform Testing
- Test upload limits and restrictions
- Validate video format requirements
- Test authentication flows

### 3. Error Handling
- Network failures
- API rate limiting
- Invalid credentials
- File size/format errors

## Security Considerations

### 1. Credential Management
- Store tokens securely (encrypted)
- Implement proper token rotation
- Use environment variables for sensitive data

### 2. API Rate Limiting
- Implement backoff strategies
- Queue uploads during high traffic
- Monitor API usage quotas

### 3. Data Privacy
- Handle user data according to platform policies
- Implement data retention policies
- Provide clear privacy controls

## Future Enhancements

### 1. Advanced Features
- A/B testing for titles/descriptions
- Optimal posting time suggestions
- Cross-platform analytics correlation
- Automated hashtag research

### 2. AI Integration
- Auto-generate captions
- Platform-specific content optimization
- Trend analysis and recommendations
- Performance prediction models

This MCP integration will transform Dark Frame from a video editor into a complete content creation and distribution platform, handling the entire workflow from recording to multi-platform publishing.