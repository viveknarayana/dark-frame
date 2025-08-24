#!/usr/bin/env python3
"""
Clean Video Transcriber using OpenAI Whisper API
- Uses .env file for API key
- Better error handling
- Cleaner output
- Drag & drop support
"""

import os
import sys
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import List, Tuple
from openai import OpenAI
from moviepy.editor import VideoFileClip
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Filler word detection patterns
FILLER_PATTERNS = [
    r"\buh+\b", r"\bum+\b", r"\berm?\b", r"\ber+\b",
    r"\blike\b", r"\bactually\b", r"\bbasically\b", r"\bliterally\b",
    r"\bkinda\b", r"\bsorta\b", r"\bright\b",
    r"\byou know\b", r"\bi mean\b", r"\bkind of\b", r"\bsort of\b",
]

_filler_re = re.compile("|".join(FILLER_PATTERNS), re.IGNORECASE)

def detect_filler_word_ids(words: list) -> List[int]:
    """Return indices (0-based) of words that look like fillers."""
    ids = []
    for i, w in enumerate(words):
        txt = (w.get("word") or w.get("text") or "").strip()
        if _filler_re.fullmatch(txt):
            # light heuristic: treat 'like' as filler only if short (<0.35s)
            dur = float(w["end"]) - float(w["start"])
            if txt.lower() == "like" and dur > 0.35:
                continue
            ids.append(i)
    return ids

def merge_intervals(intervals: List[Tuple[float,float]]) -> List[Tuple[float,float]]:
    """Merge overlapping [start,end] intervals in seconds."""
    if not intervals: 
        return []
    intervals = sorted(intervals)
    merged = [intervals[0]]
    for s,e in intervals[1:]:
        last_s,last_e = merged[-1]
        if s <= last_e:
            merged[-1] = (last_s, max(last_e, e))
        else:
            merged.append((s,e))
    return merged

def invert_intervals(removes: List[Tuple[float,float]], duration_s: float) -> List[Tuple[float,float]]:
    """Return keep ranges by inverting removes over [0, duration]."""
    keeps = []
    cursor = 0.0
    for s,e in removes:
        s = max(0.0, s)
        e = min(duration_s, e)
        if s > cursor:
            keeps.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < duration_s:
        keeps.append((cursor, duration_s))
    # strip zero/negative segments
    return [(s,e) for (s,e) in keeps if e - s > 0.01]

class VideoTranscriber:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model = os.getenv('DEFAULT_MODEL', 'whisper-1')
        self.max_file_size = int(os.getenv('MAX_FILE_SIZE_MB', 25)) * 1024 * 1024
        
        if not self.api_key:
            print("Error: OPENAI_API_KEY not found in .env file")
            print("Make sure you have a .env file with your API key")
            sys.exit(1)
            
        self.client = OpenAI(api_key=self.api_key)
        
    def get_video_file(self):
        """Get video file path from user input or command line"""
        if len(sys.argv) > 1:
            # File path provided as command line argument
            video_path = sys.argv[1]
        else:
            video_path = input("🎬 Enter video file: ").strip()
            
            # Remove quotes if user dragged & dropped
            video_path = video_path.strip('"\'')
            
            # Default file
            if not video_path:
                video_path = "videoplayback.mp4"
        
        return Path(video_path)
    
    def validate_file(self, file_path):
        """Validate video file exists and size"""
        if not file_path.exists():
            print(f"File not found: {file_path}")
            return False
            
        file_size = file_path.stat().st_size
        if file_size > self.max_file_size:
            size_mb = file_size / (1024 * 1024)
            max_mb = self.max_file_size / (1024 * 1024)
            print(f"File too large: {size_mb:.1f}MB (max: {max_mb}MB)")
            return False
            
        # Check if it's likely a video file
        video_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'}
        if file_path.suffix.lower() not in video_extensions:
            print(f"Warning: {file_path.suffix} might not be a video file")
            
        return True
    
    def extract_audio(self, video_path):
        """Extract audio from video file"""
        print("Extracting audio from video...")
        
        try:
            video = VideoFileClip(str(video_path))
            
            # Create temp audio file
            audio_path = video_path.with_suffix('.temp.mp3')
            
            # Extract audio
            video.audio.write_audiofile(
                str(audio_path), 
                verbose=False, 
                logger=None
            )
            
            video.close()
            return audio_path
            
        except Exception as e:
            print(f"Error extracting audio: {e}")
            return None
    
    def transcribe_audio(self, audio_path):
        """Transcribe audio using OpenAI Whisper API"""
        print("Transcribing with OpenAI Whisper...")
        
        try:
            with open(audio_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["word"]
                )
            
            return transcript
            
        except Exception as e:
            print(f"Transcription failed: {e}")
            return None
        finally:
            # Clean up temp audio file
            if audio_path.exists():
                audio_path.unlink()
    
    def save_results(self, video_path, transcript):
        """Save transcript and word data"""
        base_name = video_path.stem
        
        # Save full transcript
        transcript_file = video_path.parent / f"{base_name}_transcript.txt"
        with open(transcript_file, 'w', encoding='utf-8') as f:
            f.write(transcript.text)
        
        # Save word-level data as JSON
        if hasattr(transcript, 'words') and transcript.words:
            import json
            words_file = video_path.parent / f"{base_name}_words.json"
            
            words_data = []
            for word in transcript.words:
                words_data.append({
                    'word': word.word,
                    'start': word.start,
                    'end': word.end
                })
            
            with open(words_file, 'w', encoding='utf-8') as f:
                json.dump(words_data, f, indent=2)
                
            print(f"Saved transcript: {transcript_file}")
            print(f"Saved word data: {words_file}")
        else:
            print(f"Saved transcript: {transcript_file}")
            print("No word-level timestamps available")
    
    def display_results(self, transcript):
        """Display transcription results"""
        print("\n" + "="*60)
        print("TRANSCRIPTION COMPLETE")
        print("="*60)
        
        print("\nFull Text:")
        print("-" * 50)
        print(transcript.text)
        
        if hasattr(transcript, 'words') and transcript.words:
            word_count = len(transcript.words)
            duration = transcript.words[-1].end if transcript.words else 0
            
            print(f"\nStatistics:")
            print(f"   Words: {word_count}")
            print(f"   Duration: {duration:.1f} seconds")
            print(f"   Rate: {word_count/duration*60:.1f} words/minute")
            
            print(f"\n⏱First 10 words with timestamps:")
            print("-" * 50)
            for word in transcript.words[:10]:
                print(f"   {word.start:5.1f}s - {word.end:5.1f}s: '{word.word}'")
            
            if word_count > 10:
                print(f"   ... and {word_count - 10} more words")
    
    def run(self):
        """Main transcription workflow"""
        print("Clean Video Transcriber")
        print("=" * 50)
        

        video_path = self.get_video_file()
        
        # Validate file
        if not self.validate_file(video_path):
            return
        
        print(f"\nProcessing: {video_path.name}")
        
        # Extract audio
        audio_path = self.extract_audio(video_path)
        if not audio_path:
            return
        
        # Transcribe
        transcript = self.transcribe_audio(audio_path)
        if not transcript:
            return
        
        # Display and save results
        self.display_results(transcript)
        self.save_results(video_path, transcript)
        
        print(f"\nDone! Check the files next to {video_path.name}")
    
    def build_remove_intervals(self, words_path: Path, word_ids_to_remove: List[int],
                               pad_before_ms=120, pad_after_ms=150) -> List[Tuple[float,float]]:
        """Build time intervals to remove based on word IDs"""
        words = json.loads(words_path.read_text(encoding="utf-8"))
        removes = []
        for idx in word_ids_to_remove:
            if 0 <= idx < len(words):
                w = words[idx]
                s = float(w["start"]) - (pad_before_ms/1000.0)
                e = float(w["end"]) + (pad_after_ms/1000.0)
                removes.append((max(0.0,s), max(e,0.0)))
        return merge_intervals(removes)
    
    def get_duration_seconds(self, video_path: Path) -> float:
        """Get video duration using ffprobe"""
        try:
            cmd = [
                "ffprobe","-v","error","-select_streams","v:0",
                "-show_entries","format=duration","-of","default=nw=1:nk=1",
                str(video_path)
            ]
            out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()
            return float(out)
        except Exception as e:
            print(f"Error getting duration: {e}")
            return 0.0
    
    def render_cut_video(self, master: Path, keeps: List[Tuple[float,float]], out_path: Path):
        """Cut and concatenate video using FFmpeg"""
        print("Cutting video segments...")
        
        try:
            tempdir = tempfile.TemporaryDirectory()
            parts = []
            
            for i,(s,e) in enumerate(keeps):
                part = Path(tempdir.name) / f"part_{i:03d}.mp4"
                subprocess.check_call([
                    "ffmpeg","-y","-v","error",
                    "-ss", f"{s:.3f}",
                    "-to", f"{e:.3f}",
                    "-i", str(master),
                    "-c","copy", str(part)
                ], stderr=subprocess.DEVNULL)
                parts.append(part)
            
            # write concat list
            list_file = Path(tempdir.name) / "files.txt"
            list_file.write_text("\n".join([f"file '{p.as_posix()}'" for p in parts]), encoding="utf-8")
            
            # concat
            subprocess.check_call([
                "ffmpeg","-y","-v","error","-f","concat","-safe","0",
                "-i", str(list_file),
                "-c","copy", str(out_path)
            ], stderr=subprocess.DEVNULL)
            
            tempdir.cleanup()
            
        except Exception as e:
            print(f"Error cutting video: {e}")
            return False
        return True
    
    def clean_video_by_fillers(self, video_path: Path, pad_before_ms=120, pad_after_ms=150):
        """Auto-detect and remove filler words from video"""
        words_path = video_path.with_name(f"{video_path.stem}_words.json")
        if not words_path.exists():
            print("No words.json found; run transcription first.")
            return None
        
        # load words and detect fillers
        words = json.loads(words_path.read_text(encoding="utf-8"))
        filler_ids = detect_filler_word_ids(words)
        
        if not filler_ids:
            print("No filler words detected.")
            return None
        
        print(f"Found {len(filler_ids)} filler words to remove")
        
        # Show which words will be removed
        filler_words = [words[i]["word"] for i in filler_ids]
        print(f"Removing: {', '.join(filler_words)}")
        
        removes = self.build_remove_intervals(words_path, filler_ids, pad_before_ms, pad_after_ms)
        duration_s = self.get_duration_seconds(video_path)
        keeps = invert_intervals(removes, duration_s)
        
        if not keeps:
            print("Nothing to keep after cuts. Aborting.")
            return None
        
        out_path = video_path.with_name(f"{video_path.stem}_clean.mp4")
        print(f"Cutting {len(removes)} remove-ranges -> {len(keeps)} kept segments")
        
        if self.render_cut_video(video_path, keeps, out_path):
            print(f"Saved cleaned video: {out_path}")
            return out_path
        return None
    
    def clean_video_by_word_ids(self, video_path: Path, word_ids: List[int],
                                pad_before_ms=120, pad_after_ms=150):
        """Remove specific words by their IDs"""
        words_path = video_path.with_name(f"{video_path.stem}_words.json")
        if not words_path.exists():
            print("No words.json found; run transcription first.")
            return None
            
        removes = self.build_remove_intervals(words_path, word_ids, pad_before_ms, pad_after_ms)
        duration_s = self.get_duration_seconds(video_path)
        keeps = invert_intervals(removes, duration_s)
        
        if not keeps:
            print("Nothing to keep after cuts. Aborting.")
            return None
            
        out_path = video_path.with_name(f"{video_path.stem}_edited.mp4")
        print(f"Cutting {len(removes)} remove-ranges -> {len(keeps)} kept segments")
        
        if self.render_cut_video(video_path, keeps, out_path):
            print(f"Saved edited video: {out_path}")
            return out_path
        return None

if __name__ == "__main__":
    transcriber = VideoTranscriber()
    
    # Check for cleaning commands
    if len(sys.argv) > 2 and sys.argv[2] == "--clean-fillers":
        video_path = Path(sys.argv[1])
        transcriber.clean_video_by_fillers(video_path)
    elif len(sys.argv) > 2 and sys.argv[2] == "--clean-words":
        # Manual word removal: python script.py video.mp4 --clean-words 1,5,10,15
        video_path = Path(sys.argv[1])
        if len(sys.argv) > 3:
            word_ids = [int(x.strip()) for x in sys.argv[3].split(',')]
            transcriber.clean_video_by_word_ids(video_path, word_ids)
        else:
            print("Usage: python script.py video.mp4 --clean-words 1,5,10,15")
    else:
        # Normal transcription
        transcriber.run()