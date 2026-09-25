import io
import base64
from datetime import datetime, timezone
import yt_dlp
import requests
import librosa
import numpy as np
from celery import Celery

app = Celery('stream_dsp', broker='redis://localhost:6379/0')

@app.task(name='stream_dsp.process_stream', bind=True)
def process_stream(self, payload):
    url = payload.get('url')
    if not url:
        return {"status": "failed", "reason": "missing url"}

    try:
        # Extract stream info with yt-dlp
        ydl_opts = {
            'format': 'bestaudio/best',
            'noplaylist': True,
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get('url')
            if not stream_url:
                raise yt_dlp.utils.DownloadError("Could not extract stream url")

        # Download stream to BytesIO buffer
        response = requests.get(stream_url, stream=True, timeout=10.0)
        response.raise_for_status()

        buffer = io.BytesIO()
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                buffer.write(chunk)

        buffer.seek(0)

        # Load audio from buffer
        # sr=22050 and mono=True for consistency
        y, sr = librosa.load(buffer, sr=22050, mono=True)

        if len(y) == 0:
             raise ValueError("Empty audio data")

        # Extract 12-D Chroma and 12-D MFCCs
        chroma = librosa.feature.chroma_stft(y=y, sr=sr, n_chroma=12)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=12)

        # 24-D feature matrix
        features = np.vstack([chroma, mfcc])

        # Beat-synchronous pooling
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)

        # Handle cases where beat tracking returns empty beats array
        if len(beats) == 0:
            # Fallback: create mock beats if none are detected
            beats = np.array([len(y) // 2])

        sync_features = librosa.util.sync(features, beats)

        # 48-D Takens delay embedding (dim=2, delay=1)
        delay = 1
        if sync_features.shape[1] > delay:
            embedded = np.vstack([sync_features[:, :-delay], sync_features[:, delay:]])
        else:
            # Fallback if track is too short for delay embedding, just pad to match 48-D shape
            # Though realistically beats will be > 1
            embedded = np.vstack([sync_features, sync_features])

        matrix_bytes = embedded.astype(np.float32).tobytes()
        encoded_data = base64.b64encode(matrix_bytes).decode('utf-8')

        result = {
            "source_url": url,
            "dsp_matrix": {
                "shape": list(embedded.shape),
                "data": encoded_data
            },
            "extraction_timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Return result directly for ease of testing / downstream processing
        # In a full pipeline, we'd chain using app.send_task
        return {"status": "success", "url": url, "result_payload": result}

    except yt_dlp.utils.DownloadError as e:
        return {"status": "failed", "reason": f"yt-dlp error: {str(e)}"}
    except requests.exceptions.RequestException as e:
        return {"status": "failed", "reason": f"stream download error: {str(e)}"}
    except Exception as e:
        return {"status": "failed", "reason": f"processing error: {str(e)}"}
