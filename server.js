import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { FormData } from 'formdata-node';

dotenv.config();

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Veo3 API key
const veo3ApiKey = process.env.VITE_VEO3_API;

// Check Veo3 credits endpoint
app.get('/api/veo3-credits', async (req, res) => {
  try {
    const response = await fetch('https://api.veo3api.ai/api/v1/common/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${veo3ApiKey}`
      }
    });

    const data = await response.json();
    console.log('💰 Veo3 credits check:', data);
    
    res.json({
      credits: data.data,
      status: data.code === 200 ? 'success' : 'error',
      message: data.msg
    });
  } catch (error) {
    console.error('❌ Error checking Veo3 credits:', error);
    res.status(500).json({
      error: 'Failed to check credits',
      message: error.message
    });
  }
});

// Check Veo3 task status endpoint
app.get('/api/veo3-task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const response = await fetch(`https://api.veo3api.ai/api/v1/veo/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${veo3ApiKey}`
      }
    });

    const data = await response.json();
    console.log('📊 Veo3 task status:', data);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error checking Veo3 task status:', error);
    res.status(500).json({
      error: 'Failed to check task status',
      message: error.message
    });
  }
});

// Test Veo3 API endpoint
app.post('/api/test-veo3', async (req, res) => {
  try {
    const testData = {
      prompt: "A dog playing in a park",
      imageUrls: ["http://example.com/image1.jpg"],
      model: "veo3",
      aspectRatio: "16:9",
      enableFallback: true
    };

    const url = 'https://api.veo3api.ai/api/v1/veo/generate';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${veo3ApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    };

    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log('🧪 Test Veo3 API response:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Test Veo3 API error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Veo3 backend is running' });
});





// Veo3 image to video generation endpoint
app.post('/api/generate-video-veo3', async (req, res) => {
  try {
    const { prompt, imageBase64, duration = 5 } = req.body;
    const veo3ApiKey = process.env.VITE_VEO3_API;

    if (!veo3ApiKey) {
      return res.status(500).json({
        error: 'Veo3 API key not configured',
        message: 'VITE_VEO3_API environment variable is not set'
      });
    }

    console.log('🚀 Starting Veo3 video generation...', {
      prompt,
      duration,
      imageSize: imageBase64.length
    });

    // Use Base64 Upload method instead of Stream Upload
    console.log('📤 Uploading image to Veo3 using Base64 method...');
    
    // Remove data URL prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // Compress the base64 data if too large
    const maxBase64Size = 1024 * 1024; // 1MB limit
    const compressedBase64 = base64Data.length > maxBase64Size ? base64Data.substring(0, maxBase64Size) : base64Data;
    
    console.log('📦 Base64 size:', {
      original: base64Data.length,
      compressed: compressedBase64.length,
      reduction: `${((1 - compressedBase64.length / base64Data.length) * 100).toFixed(1)}%`
    });

    const uploadResponse = await fetch('https://veo3apiai.redpandaai.co/api/file-base64-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${veo3ApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Data: `data:image/jpeg;base64,${compressedBase64}`,
        uploadPath: 'images/user-uploads',
        fileName: 'image.jpg'
      })
    });

    console.log('📤 Upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('❌ Image upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: uploadError
      });
      throw new Error(`Image upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${uploadError}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('📤 Upload result:', uploadResult);
    
    if (!uploadResult.data || !uploadResult.data.downloadUrl) {
      console.error('❌ Upload result missing download URL:', uploadResult);
      throw new Error('Upload failed: No download URL in response');
    }
    
    const imageUrl = uploadResult.data.downloadUrl;
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    // Test if the image URL is accessible
    try {
      const imageTestResponse = await fetch(imageUrl, { method: 'HEAD' });
      console.log('🔍 Image URL accessibility test:', {
        status: imageTestResponse.status,
        accessible: imageTestResponse.ok
      });
    } catch (error) {
      console.warn('⚠️ Could not test image URL accessibility:', error.message);
    }

    // Now generate video from the image
    console.log('🎬 Generating video with Veo3...');
    
    // Simplify the prompt to avoid potential issues
    const simplifiedPrompt = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
    
    const videoRequestData = {
      prompt: simplifiedPrompt,
      imageUrls: [imageUrl],
      model: 'veo3',
      aspectRatio: '16:9',
      enableFallback: true
    };
    
    console.log('📤 Video generation request:', videoRequestData);
    
    const url = 'https://api.veo3api.ai/api/v1/veo/generate';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${veo3ApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(videoRequestData)
    };

    const videoResponse = await fetch(url, options);

    if (!videoResponse.ok) {
      const videoError = await videoResponse.text();
      console.error('❌ Veo3 video generation failed:', videoError);
      throw new Error(`Veo3 video generation failed: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoResult = await videoResponse.json();
    console.log('🎬 Video generation response:', videoResult);
    
    if (!videoResult.data || !videoResult.data.taskId) {
      console.error('❌ Video generation failed - no task ID:', videoResult);
      throw new Error(`Video generation failed: ${videoResult.msg || 'No task ID in response'}`);
    }
    
    const taskId = videoResult.data.taskId;
    console.log('✅ Veo3 task created:', taskId);

    // Poll for task completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.veo3api.ai/api/v1/veo/record-info?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${veo3ApiKey}`
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('❌ Failed to get task status:', {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          error: errorText
        });
        continue;
      }

      const statusResult = await statusResponse.json();
      console.log('📊 Task status:', statusResult.data);

      if (statusResult.data.successFlag === 1) {
        // Video generation completed successfully
        const videoUrls = statusResult.data.response.resultUrls;
        console.log('✅ Video generated successfully!');
        console.log('📥 Video URLs:', videoUrls);
        
        // Download the first video URL
        const videoUrl = videoUrls[0];
        const downloadResponse = await fetch(videoUrl);
        const videoBuffer = await downloadResponse.arrayBuffer();

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', videoBuffer.byteLength);
        res.send(Buffer.from(videoBuffer));
        return;
      } else if (statusResult.data.successFlag === 0) {
        console.log('⏳ Still generating...');
        // Continue polling
      } else {
        // Check if this is a fallback-eligible error
        const errorMessage = statusResult.data.errorMessage || 'Unknown error';
        if (errorMessage.includes('public error minor upload') || 
            errorMessage.includes('content policy violations') || 
            errorMessage.includes('public error prominent people upload')) {
          console.log('🔄 Fallback-eligible error detected, waiting for fallback to complete...');
          // Continue polling to see if fallback completes
        } else {
          throw new Error(`Veo3 task failed: ${errorMessage}`);
        }
      }

      attempts++;
    }

    throw new Error('Veo3 task timed out after 5 minutes');

  } catch (error) {
    console.error('❌ Error generating video with Veo3:', error);
    
    // Handle specific Veo3 errors
    if (error.message && error.message.includes('credits')) {
      res.status(402).json({
        error: 'Insufficient credits',
        message: 'You do not have enough Veo3 credits to generate this video.',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Veo3 video generation failed',
        message: error.message
      });
    }
  }
});

app.listen(port, () => {
  console.log(`🚀 Veo3 backend server running on http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
});
