# Video Editor

Simple video editor that removes words based on transcripts.

## Setup

1. Install dependencies:
```bash
pip3 install openai moviepy python-dotenv
```

2. Create `.env` file with your OpenAI API key:
```bash
echo "OPENAI_API_KEY=your_key_here" > .env
```

3. Put your video files in the `input/` folder

## Quick Start

```bash
# 1. Put your video in input/ folder
cp your_video.mp4 input/

# 2. Generate transcript with word timestamps  
python3 video_editor.py transcribe input/your_video.mp4

# 3. Remove filler words (um, uh, like, etc.)
python3 video_editor.py clean input/your_video.mp4
```

That's it! Your cleaned video will be in `output/your_video_clean.mp4`

## All Commands

### 1. Transcribe video
```bash
python3 video_editor.py transcribe input/video.mp4
```
Creates:
- `output/video_transcript.txt` - Full transcript text
- `output/video_words.json` - Word-level timestamps

### 2. View words with IDs
```bash
python3 video_editor.py words input/video.mp4
```
Shows first 20 words: `ID: 'word' @ time`

### 3. Remove filler words automatically
```bash
python3 video_editor.py clean input/video.mp4
```
Removes: um, uh, like, actually, basically, you know, I mean
Creates: `output/video_clean.mp4`

### 4. Remove specific words by ID
```bash
python3 video_editor.py remove input/video.mp4 1,5,10
```
Removes words with IDs 1, 5, and 10
Creates: `output/video_edited.mp4`

## What are Word IDs?

Word IDs are just the position of each word:
- ID 0 = first word
- ID 1 = second word  
- ID 5 = sixth word
- etc.

Example from transcript:
```
0: 'Thank' @ 0.0s
1: 'you' @ 1.0s
5: 'sleeping' @ 2.2s
10: 'about' @ 3.7s
```

So `1,5,10` would remove "you", "sleeping", "about"

## File Structure

```
input/                    # Put videos here
output/                   # Generated files
  video_transcript.txt    # Full transcript
  video_words.json        # Word timestamps
  video_clean.mp4         # Auto-cleaned video
  video_edited.mp4        # Manual edits
.env                      # Your OpenAI API key
video_editor.py           # Main script
```

## Complete Example

```bash
# Put video in input folder
cp presentation.mp4 input/

# Generate transcript
python3 video_editor.py transcribe input/presentation.mp4

# See which words have which IDs
python3 video_editor.py words input/presentation.mp4

# Remove filler words automatically
python3 video_editor.py clean input/presentation.mp4

# OR remove specific words manually
python3 video_editor.py remove input/presentation.mp4 5,12,18,25
```

## Troubleshooting

- Make sure you use `python3` not `python`
- Put your OpenAI API key in `.env` file
- Videos go in `input/` folder
- Results appear in `output/` folder
