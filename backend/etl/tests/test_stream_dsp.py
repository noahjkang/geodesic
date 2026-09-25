import io
import base64
import numpy as np
import yt_dlp
import requests
import librosa
from unittest.mock import patch, MagicMock

from backend.etl.stream_dsp.worker import process_stream

def test_missing_url():
    payload = {}
    result = process_stream(payload)
    assert result == {"status": "failed", "reason": "missing url"}

@patch("backend.etl.stream_dsp.worker.yt_dlp.YoutubeDL.extract_info")
def test_yt_dlp_error(mock_extract_info):
    mock_extract_info.side_effect = yt_dlp.utils.DownloadError("Video unavailable")

    payload = {"url": "https://youtube.com/watch?v=fake"}
    result = process_stream(payload)

    assert result["status"] == "failed"
    assert "yt-dlp error: Video unavailable" in result["reason"]

@patch("backend.etl.stream_dsp.worker.yt_dlp.YoutubeDL.extract_info")
@patch("backend.etl.stream_dsp.worker.requests.get")
def test_stream_download_error(mock_requests_get, mock_extract_info):
    mock_extract_info.return_value = {"url": "http://stream.fake.url"}

    mock_requests_get.side_effect = requests.exceptions.Timeout("Connection timed out")

    payload = {"url": "https://youtube.com/watch?v=fake"}
    result = process_stream(payload)

    assert result["status"] == "failed"
    assert "stream download error" in result["reason"]

@patch("backend.etl.stream_dsp.worker.yt_dlp.YoutubeDL.extract_info")
@patch("backend.etl.stream_dsp.worker.requests.get")
@patch("backend.etl.stream_dsp.worker.librosa.load")
def test_process_stream_success(mock_librosa_load, mock_requests_get, mock_extract_info):
    mock_extract_info.return_value = {"url": "http://stream.fake.url"}

    mock_response = MagicMock()
    mock_response.iter_content.return_value = [b"fake audio data"]
    mock_response.raise_for_status = MagicMock()
    mock_requests_get.return_value = mock_response

    # Generate a realistic-enough mock audio signal to produce beats
    # so we can test the Takens embedding correctly returns a 48-D matrix.
    sr = 22050
    # Add a bit of noise / envelope so beat tracker finds beats
    t = np.linspace(0, 5, sr * 5)
    y = np.sin(2 * np.pi * 440 * t) * np.exp(-t)

    # Manually patch librosa load to return our array
    mock_librosa_load.return_value = (y, sr)

    payload = {"url": "https://youtube.com/watch?v=fake"}
    result = process_stream(payload)

    assert result["status"] == "success"
    assert "result_payload" in result

    payload = result["result_payload"]
    assert payload["source_url"] == "https://youtube.com/watch?v=fake"

    shape = payload["dsp_matrix"]["shape"]
    # 48-D Takens delay embedding check
    assert shape[0] == 48

    # decode to check data
    encoded_data = payload["dsp_matrix"]["data"]
    matrix_bytes = base64.b64decode(encoded_data)
    matrix = np.frombuffer(matrix_bytes, dtype=np.float32).reshape(shape)

    assert not np.isnan(matrix).any()
    assert not np.isinf(matrix).any()
