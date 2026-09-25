# Stream and DSP Worker

**1) Description**
This module combines audio ingestion and digital signal processing into a single, highly efficient "stream-and-discard" pipeline. It uses `yt-dlp` to pipe audio streams directly into an in-memory buffer, and `librosa` to extract mathematical representations (12-D Chroma and 12-D Timbre/MFCC). It then applies beat-synchronous pooling and a Takens delay embedding (creating a 48-D point cloud) before immediately discarding the audio buffer. This bypasses Spotify API restrictions and eliminates raw audio storage overhead.

**2) Architecture & Logic**
1. **Stream:** Triggered via Celery, spins up `yt-dlp` to fetch a stream url and stream the audio to an `io.BytesIO` buffer.
2. **DSP Extraction:** `librosa` loads the buffer. It extracts 12-D Chroma (pitch) and 12-D MFCC (timbre).
3. **Beat-Synchronous Pooling:** Uses `librosa.onset.onset_detect` and `librosa.util.sync` to pool the chroma and timbre features along beat frames, ensuring rhythm doesn't corrupt the geometric distance metric.
4. **Takens Delay Embedding:** Concatenates `[p(t), c(t), p(t+tau), c(t+tau)]` to form a 48-D point cloud.
5. **Egress:** Pushes the 48-D matrix to the Topology Engine queue and frees the memory buffer.

**3) Tech Stack & Libraries**
- `yt-dlp`
- `librosa`
- `numpy`
- `ffmpeg` (system level)

**4) Constraints**
- Audio is never written to disk.
- Processing must be fast to free memory.
