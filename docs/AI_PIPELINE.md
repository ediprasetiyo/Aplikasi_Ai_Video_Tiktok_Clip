# AI Pipeline — Detail Worker

Pipeline lengkap dari video panjang → clip viral, dioptimalkan untuk **laptop CPU only** (tanpa GPU).

## Overview

```
[1] Download  →  [2] Transcribe  →  [3] Score  →  [4] Cut  →  [5] Re-frame 9:16  →  [6] Subtitle  →  [7] Render  →  [8] Upload R2
   yt-dlp        faster-whisper     Groq Llama    FFmpeg       OpenCV+MediaPipe     FFmpeg+ASS      FFmpeg
   ~10s/100MB    ~0.3x realtime     ~5s/segmen    ~3s          ~realtime           ~2s/clip        ~realtime
```

**Estimasi total**: Video 60 menit → 5 clip selesai dalam **~12-18 menit** di laptop CPU modern (Ryzen 5 / i5 gen 11+).

## Step 1: Download / Ingest

**Tool**: `yt-dlp` (bukan youtube-dl, lebih maintained).

```python
# src/pipeline/download.py
import yt_dlp
from pathlib import Path

def download_video(url: str, output_dir: Path) -> Path:
    opts = {
        'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        'outtmpl': str(output_dir / '%(id)s.%(ext)s'),
        'merge_output_format': 'mp4',
        'quiet': True,
        'noplaylist': True,
        # Hanya download URL dari domain whitelist (Google Drive, YouTube user sendiri)
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return Path(ydl.prepare_filename(info))
```

**Untuk file upload**: skip step ini, langsung ambil dari R2 via presigned GET URL.

**Security**:
- ⚠️ Validasi URL whitelist domain di API (cek [SECURITY.md](SECURITY.md))
- Limit durasi max 3 jam, ukuran 2GB
- Timeout download 10 menit

## Step 2: Transcribe (Whisper)

**Tool**: `faster-whisper` (4x lebih cepat dari openai-whisper di CPU dengan akurasi sama).

```python
# src/pipeline/transcribe.py
from faster_whisper import WhisperModel

# CPU-only config — laptop friendly
MODEL = WhisperModel(
    "small",                    # ~500MB, akurasi cukup. Upgrade ke "medium" (~1.5GB) kalau hasil kurang
    device="cpu",
    compute_type="int8",        # quantized, lebih cepat di CPU
    cpu_threads=4,              # sesuai core fisik laptop
)

def transcribe(audio_path: Path, language: str = "id"):
    segments, info = MODEL.transcribe(
        str(audio_path),
        language=None if language == "auto" else language,
        beam_size=5,
        vad_filter=True,        # skip silence — penting biar gak salah segmen
        word_timestamps=True,   # WAJIB untuk subtitle word-level
    )

    result = []
    for seg in segments:
        result.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text,
            "words": [{"start": w.start, "end": w.end, "word": w.word} for w in seg.words],
        })
    return result, info.language
```

**Pilihan model di CPU**:
| Model | Size | Speed (CPU i7) | Akurasi ID |
|---|---|---|---|
| tiny | 75MB | 6x realtime | ~70% |
| base | 145MB | 4x realtime | ~80% |
| **small** ⭐ | 500MB | 1x realtime | ~88% |
| medium | 1.5GB | 0.4x realtime | ~92% |
| large-v3 | 3GB | 0.1x realtime (slow) | ~95% |

**Tip**: Mulai dengan `small`. Kalau hasil scoring jelek, upgrade ke `medium`.

## Step 3: Scoring — Pilih Momen Viral (LLM)

Algoritma:
1. **Chunk transcript** jadi segmen kandidat 30-90 detik (overlap sliding window 15 detik)
2. **Score tiap segmen** pakai Groq Llama 3.3 70B (free tier 14.4k req/hari, cukup banget)
3. **Pilih top-N** dengan non-max suppression (hindari overlap)

```python
# src/pipeline/score.py
from groq import Groq
import json

client = Groq(api_key=os.environ["GROQ_API_KEY"])

SCORING_PROMPT = """You are a viral content expert for TikTok, Instagram Reels, YouTube Shorts.

Analyze this video segment transcript and rate its viral potential (0-100) based on:
1. HOOK STRENGTH (0-30): Does the first 5 seconds grab attention? Question, shocking statement, mystery?
2. EMOTIONAL INTENSITY (0-25): Strong emotions — surprise, anger, joy, curiosity, controversy?
3. QUOTABILITY (0-20): Memorable line that can be a caption/title?
4. SELF-CONTAINED (0-15): Understandable without context? Has clear setup → payoff?
5. PAYOFF (0-10): Satisfying conclusion within the segment?

Segment ({duration}s):
{transcript}

Return ONLY valid JSON:
{{
  "score": <int 0-100>,
  "hook_line": "<exact quote of strongest hook line>",
  "reason": "<1 sentence why this is/isn't viral, in Bahasa Indonesia>",
  "best_clip_start_offset": <int, seconds from segment start where best clip begins>,
  "best_clip_duration": <int, ideal clip duration 15-90s>
}}"""

def score_segment(transcript_chunk: str, duration: float) -> dict:
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": SCORING_PROMPT.format(
            transcript=transcript_chunk, duration=int(duration)
        )}],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=400,
    )
    return json.loads(completion.choices[0].message.content)
```

**Chunking strategy** (hindari potong di tengah kalimat):
```python
def make_chunks(segments, target_duration=60, overlap=15):
    chunks = []
    i = 0
    while i < len(segments):
        chunk = []
        chunk_duration = 0
        start_idx = i
        while i < len(segments) and chunk_duration < target_duration:
            chunk.append(segments[i])
            chunk_duration = segments[i]['end'] - segments[start_idx]['start']
            i += 1
        chunks.append(chunk)
        # geser balik untuk overlap
        while i > start_idx + 1 and (segments[i-1]['end'] - segments[start_idx]['start']) > overlap:
            i -= 1
    return chunks
```

**Non-max suppression** (cegah clip overlap):
```python
def select_top_n(scored_segments, n=5, min_gap=30):
    scored_segments.sort(key=lambda s: s['score'], reverse=True)
    selected = []
    for seg in scored_segments:
        if all(abs(seg['start'] - s['start']) > min_gap for s in selected):
            selected.append(seg)
        if len(selected) == n:
            break
    return selected
```

## Step 4: Cut Source → Clip Mentah

```python
# src/pipeline/cut.py
import subprocess

def cut_clip(source: Path, start: float, duration: float, output: Path):
    subprocess.run([
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", str(source),
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        str(output)
    ], check=True, capture_output=True)
```

## Step 5: Re-frame 9:16 dengan Face Tracking

Tujuan: video 16:9 (1920×1080) → 9:16 (1080×1920) dengan wajah pembicara selalu di tengah.

```python
# src/pipeline/crop_face.py
import cv2
import mediapipe as mp
import numpy as np

mp_face = mp.solutions.face_detection

def get_face_centers(video_path: Path, sample_fps: int = 2):
    """Sample wajah tiap 0.5 detik, return list (timestamp, x_center, y_center)."""
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = int(fps / sample_fps)

    centers = []
    with mp_face.FaceDetection(min_detection_confidence=0.5) as detector:
        for i in range(0, total, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret: break
            h, w = frame.shape[:2]
            results = detector.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if results.detections:
                bbox = results.detections[0].location_data.relative_bounding_box
                cx = (bbox.xmin + bbox.width / 2) * w
                cy = (bbox.ymin + bbox.height / 2) * h
                centers.append((i / fps, cx, cy))
            else:
                centers.append((i / fps, w / 2, h / 2))
    cap.release()
    return smooth_centers(centers)

def smooth_centers(centers, window=5):
    """Moving average biar pergerakan crop tidak jerky."""
    xs = [c[1] for c in centers]
    smoothed = np.convolve(xs, np.ones(window)/window, mode='same')
    return [(c[0], smoothed[i], c[2]) for i, c in enumerate(centers)]
```

Lalu generate FFmpeg filter dynamic crop (atau pakai sendcmd / zoompan):

```python
def reframe_to_vertical(input_path: Path, output_path: Path, face_centers):
    # Build crop filter dengan timeline-based x
    src_w, src_h = 1920, 1080
    target_w, target_h = 1080, 1920
    crop_w = int(src_h * 9 / 16)  # 607

    # Bikin file sendcmd untuk dynamic x
    cmd_file = ...  # generate dari face_centers

    subprocess.run([
        "ffmpeg", "-y", "-i", str(input_path),
        "-vf",
        f"crop={crop_w}:{src_h}:x=if(gte(t\\,0)\\,...face_x...\\,960):0,"
        f"scale={target_w}:{target_h}",
        "-c:a", "copy",
        str(output_path)
    ])
```

**Catatan**: implementasi lengkap dynamic crop kompleks. Alternatif **lebih simple di MVP**: hitung 1 face center rata-rata per clip (bukan per frame), jadi crop static — sudah cukup bagus 90% kasus.

## Step 6: Subtitle Viral-Style (ASS Format)

ASS (Advanced SubStation Alpha) bisa style per-kata, highlight warna saat kata diucapkan.

```python
# src/pipeline/subtitle.py
def generate_ass(words, style: str, output_path: Path):
    presets = {
        "bold-white": {
            "font": "Montserrat",
            "size": 72,
            "primary": "&H00FFFFFF",  # putih
            "outline": "&H00000000",   # outline hitam
            "border": 4,
        },
        "tiktok-yellow": {
            "font": "Impact",
            "size": 80,
            "primary": "&H0000FFFF",   # kuning
            "outline": "&H00000000",
            "border": 5,
        },
        "minimal-black": {
            "font": "Inter",
            "size": 60,
            "primary": "&H00FFFFFF",
            "outline": "&H80000000",   # semi-transparan
            "border": 2,
        },
    }
    p = presets[style]

    header = f"""[Script Info]
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BorderStyle, Outline, Shadow, Alignment, MarginV
Style: Default,{p['font']},{p['size']},{p['primary']},{p['outline']},1,{p['border']},0,2,300

[Events]
Format: Layer, Start, End, Style, Text
"""
    body = ""
    # Group 2-3 kata per dialog supaya readable
    for group in chunk_words(words, n=3):
        start = ass_time(group[0]['start'])
        end = ass_time(group[-1]['end'])
        text = " ".join(w['word'].strip().upper() for w in group)
        body += f"Dialogue: 0,{start},{end},Default,{text}\n"

    output_path.write_text(header + body, encoding='utf-8')

def ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:01d}:{m:02d}:{s:05.2f}"
```

## Step 7: Render Final (Burn Subtitle)

```python
def render_final(video_path: Path, ass_path: Path, output: Path):
    subprocess.run([
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", f"ass={ass_path}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "21",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",       # streaming-friendly
        str(output)
    ], check=True)
```

## Step 8: Upload ke R2

```python
import boto3

s3 = boto3.client('s3',
    endpoint_url=os.environ['R2_ENDPOINT'],
    aws_access_key_id=os.environ['R2_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET'],
)

def upload_clip(local_path: Path, key: str):
    s3.upload_file(str(local_path), 'tiktok-clips', key, ExtraArgs={
        'ContentType': 'video/mp4',
        'CacheControl': 'max-age=2592000',  # 30 hari
    })
```

## Celery Task Orchestration

```python
# src/tasks.py
@celery.task(bind=True, max_retries=2)
def process_video(self, job_id: str, config: dict):
    update_progress(job_id, 0, 'DOWNLOADING')
    source = download_or_fetch(job_id, config)

    update_progress(job_id, 15, 'TRANSCRIBING')
    segments, lang = transcribe(source, config['language'])

    update_progress(job_id, 45, 'SCORING')
    chunks = make_chunks(segments, target_duration=config['targetDuration'])
    scored = [score_segment(c, ...) for c in chunks]
    top = select_top_n(scored, n=config['clipCount'])

    update_progress(job_id, 60, 'RENDERING')
    for i, clip in enumerate(top):
        render_one_clip(source, clip, config, job_id)
        update_progress(job_id, 60 + (i+1) * 40 / len(top), 'RENDERING')

    update_progress(job_id, 100, 'COMPLETED')

    # Cleanup
    source.unlink()
```

## Tuning Tips

- **VAD filter** di Whisper hilangkan silence — penting untuk akurasi scoring
- **Beam size 5** lebih akurat dari greedy decode, tradeoff sedikit lebih lambat
- **Groq cache**: kalau test pakai video sama berulang, cache hasil scoring di Redis
- **Parallel render clip**: render 2-3 clip paralel via Celery group (kalau RAM cukup)
- **Preset "fast" FFmpeg** balance kualitas vs speed; pakai "veryfast" kalau buru-buru
