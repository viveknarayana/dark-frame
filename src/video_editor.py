import os
import sys
import json
import re
from pathlib import Path
from typing import List, Tuple
from openai import OpenAI
from moviepy.editor import VideoFileClip, concatenate_videoclips
from dotenv import load_dotenv

load_dotenv()

FILLER_PATTERNS = [
    r"\buh+\b", r"\bum+\b", r"\berm?\b", r"\ber+\b",
    r"\blike\b", r"\bactually\b", r"\bbasically\b", r"\bliterally\b",
    r"\byou know\b", r"\bi mean\b"
]

class VideoEditor:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            print("Error: OPENAI_API_KEY not found in .env file")
            sys.exit(1)
        self.client = OpenAI(api_key=self.api_key)
    
    def transcribe(self, video_path: str):
        video_path = Path(video_path)
        if not video_path.exists():
            print(f"File not found: {video_path}")
            return
        
        print(f"Transcribing: {video_path.name}")
        
        audio_path = video_path.with_suffix('.temp.mp3')
        video = VideoFileClip(str(video_path))
        video.audio.write_audiofile(str(audio_path), verbose=False, logger=None)
        video.close()
        
        with open(audio_path, "rb") as audio_file:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        audio_path.unlink()
        
        words_data = []
        for word in transcript.words:
            words_data.append({
                'word': word.word,
                'start': word.start,
                'end': word.end
            })
        
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        base_name = video_path.stem
        transcript_file = output_dir / f"{base_name}_transcript.txt"
        words_file = output_dir / f"{base_name}_words.json"
        
        with open(transcript_file, 'w') as f:
            f.write(transcript.text)
        
        with open(words_file, 'w') as f:
            json.dump(words_data, f, indent=2)
        
        print(f"Transcript saved: {transcript_file}")
        print(f"Words data saved: {words_file}")
        
        return words_data
    
    def detect_fillers(self, words: List[dict]) -> List[int]:
        filler_re = re.compile("|".join(FILLER_PATTERNS), re.IGNORECASE)
        ids = []
        for i, w in enumerate(words):
            txt = w["word"].strip()
            if filler_re.fullmatch(txt):
                if txt.lower() == "like" and (w["end"] - w["start"]) > 0.35:
                    continue
                ids.append(i)
        return ids
    
    def build_cuts(self, words: List[dict], word_ids: List[int], 
                   pad_before: float = 0.12, pad_after: float = 0.15) -> List[Tuple[float, float]]:
        removes = []
        for idx in word_ids:
            if 0 <= idx < len(words):
                w = words[idx]
                start = max(0.0, w["start"] - pad_before)
                end = w["end"] + pad_after
                removes.append((start, end))
        
        removes = sorted(removes)
        merged = []
        for start, end in removes:
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))
        
        duration = words[-1]["end"]
        keeps = []
        cursor = 0.0
        for start, end in merged:
            if start > cursor:
                keeps.append((cursor, start))
            cursor = max(cursor, end)
        if cursor < duration:
            keeps.append((cursor, duration))
        
        return [(s, e) for s, e in keeps if e - s > 0.01]
    
    def cut_video(self, video_path: str, keeps: List[Tuple[float, float]], output_name: str = None):
        video_path = Path(video_path)
        
        if output_name is None:
            output_name = f"{video_path.stem}_edited.mp4"
        
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / output_name
        
        print(f"Cutting video into {len(keeps)} segments")
        
        video = VideoFileClip(str(video_path))
        clips = []
        
        for start, end in keeps:
            clip = video.subclip(start, end)
            clips.append(clip)
        
        final_video = concatenate_videoclips(clips)
        final_video.write_videofile(str(output_path), verbose=False, logger=None)
        
        video.close()
        final_video.close()
        for clip in clips:
            clip.close()
        
        print(f"Saved: {output_path}")
        return str(output_path)
    
    def remove_fillers(self, video_path: str):
        words_file = Path("output") / f"{Path(video_path).stem}_words.json"
        
        if not words_file.exists():
            print("No words file found. Run transcription first.")
            return
        
        words = json.loads(words_file.read_text())
        filler_ids = self.detect_fillers(words)
        
        if not filler_ids:
            print("No filler words found")
            return
        
        print(f"Removing {len(filler_ids)} filler words")
        keeps = self.build_cuts(words, filler_ids)
        return self.cut_video(video_path, keeps, f"{Path(video_path).stem}_clean.mp4")
    
    def remove_words(self, video_path: str, word_ids: List[int]):
        words_file = Path("output") / f"{Path(video_path).stem}_words.json"
        
        if not words_file.exists():
            print("No words file found. Run transcription first.")
            return
        
        words = json.loads(words_file.read_text())
        print(f"Removing words: {word_ids}")
        
        keeps = self.build_cuts(words, word_ids)
        return self.cut_video(video_path, keeps, f"{Path(video_path).stem}_edited.mp4")
    
    def show_words(self, video_path: str, count: int = 20):
        words_file = Path("output") / f"{Path(video_path).stem}_words.json"
        
        if not words_file.exists():
            print("No words file found. Run transcription first.")
            return
        
        words = json.loads(words_file.read_text())
        print(f"First {count} words (ID: word @ time):")
        
        for i in range(min(count, len(words))):
            w = words[i]
            print(f"  {i:2d}: '{w['word']}' @ {w['start']:.1f}s")

def main():
    editor = VideoEditor()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python video_editor.py transcribe video.mp4")
        print("  python video_editor.py clean video.mp4")
        print("  python video_editor.py remove video.mp4 1,5,10")
        print("  python video_editor.py words video.mp4")
        return
    
    command = sys.argv[1]
    video_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if command == "transcribe" and video_path:
        editor.transcribe(video_path)
    
    elif command == "clean" and video_path:
        editor.remove_fillers(video_path)
    
    elif command == "remove" and video_path and len(sys.argv) > 3:
        word_ids = [int(x.strip()) for x in sys.argv[3].split(',')]
        editor.remove_words(video_path, word_ids)
    
    elif command == "words" and video_path:
        editor.show_words(video_path)
    
    else:
        print("Invalid command or missing arguments")

if __name__ == "__main__":
    main()