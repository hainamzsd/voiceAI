# Local Whisper STT Plugin for LiveKit Agents
# Uses OpenAI Whisper model locally via transformers
# Compatible with livekit-agents v1.3.x

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import AsyncIterator
import io
import wave
import tempfile
import os

from livekit.agents import stt, APIConnectOptions
import numpy as np


class WhisperLocalSTT(stt.STT):
    """
    Local Whisper STT implementation for LiveKit Agents.
    Uses OpenAI Whisper model running locally via transformers.

    Supports Vietnamese language with good accuracy.
    """

    def __init__(
        self,
        *,
        model_size: str = "base",  # tiny, base, small, medium, large
        language: str = "vi",
        device: str = "auto",  # auto, cpu, cuda
    ):
        """
        Initialize Local Whisper STT.

        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
            language: Language code (e.g., "vi" for Vietnamese)
            device: Device to run on (auto, cpu, cuda)
        """
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False)
        )

        self._model_size = model_size
        self._language = language
        self._device = device

        # Lazy load the model
        self._pipe = None
        self._lock = asyncio.Lock()

    def _ensure_loaded(self):
        """Lazy load the Whisper model"""
        if self._pipe is None:
            import torch
            from transformers import pipeline

            # Determine device
            if self._device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
            else:
                device = self._device

            model_id = f"openai/whisper-{self._model_size}"
            print(f"WhisperLocal: Loading model {model_id} on {device}...")

            # Use float16 on GPU for faster inference
            torch_dtype = torch.float16 if device == "cuda" else torch.float32

            self._pipe = pipeline(
                "automatic-speech-recognition",
                model=model_id,
                device=device,
                torch_dtype=torch_dtype,
            )

            print(f"WhisperLocal: Model loaded successfully")

    def recognize(
        self,
        *,
        buffer: stt.AudioBuffer,
        language: str | None = None,
        conn_options: APIConnectOptions = APIConnectOptions(),
    ) -> "WhisperRecognizeStream":
        return WhisperRecognizeStream(
            stt=self,
            buffer=buffer,
            language=language or self._language,
            conn_options=conn_options,
        )

    def _transcribe(self, audio_data: np.ndarray, sample_rate: int, language: str) -> str:
        """Transcribe audio data to text"""
        self._ensure_loaded()

        # Resample if needed (Whisper expects 16kHz)
        if sample_rate != 16000:
            from scipy import signal
            num_samples = int(len(audio_data) * 16000 / sample_rate)
            audio_data = signal.resample(audio_data, num_samples)
            sample_rate = 16000

        # Normalize to float32 in range [-1, 1]
        if audio_data.dtype == np.int16:
            audio_data = audio_data.astype(np.float32) / 32768.0
        elif audio_data.dtype == np.int32:
            audio_data = audio_data.astype(np.float32) / 2147483648.0

        # Run inference
        result = self._pipe(
            {"array": audio_data, "sampling_rate": sample_rate},
            generate_kwargs={"language": language, "task": "transcribe"},
        )

        return result.get("text", "").strip()

    def close(self):
        """Clean up resources"""
        if self._pipe is not None:
            del self._pipe
            self._pipe = None
            print("WhisperLocal: Closed")


class WhisperRecognizeStream(stt.RecognizeStream):
    """Recognition stream for local Whisper"""

    def __init__(
        self,
        *,
        stt: WhisperLocalSTT,
        buffer: stt.AudioBuffer,
        language: str,
        conn_options: APIConnectOptions,
    ):
        super().__init__(stt=stt, conn_options=conn_options)
        self._whisper_stt = stt
        self._buffer = buffer
        self._language = language

    async def _run(self) -> None:
        """Process audio and yield transcription"""
        try:
            # Collect all audio frames
            frames = []
            sample_rate = 16000  # Default

            async for frame in self._buffer:
                # Convert frame to numpy array
                audio_bytes = frame.data
                sample_rate = frame.sample_rate

                # Convert bytes to numpy array (assuming int16)
                audio_np = np.frombuffer(audio_bytes, dtype=np.int16)
                frames.append(audio_np)

            if not frames:
                return

            # Concatenate all frames
            audio_data = np.concatenate(frames)

            # Run transcription in thread pool
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                None,
                self._whisper_stt._transcribe,
                audio_data,
                sample_rate,
                self._language,
            )

            if text:
                # Create speech event
                event = stt.SpeechEvent(
                    type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                    alternatives=[
                        stt.SpeechData(
                            text=text,
                            language=self._language,
                            confidence=0.9,
                        )
                    ],
                )
                self._event_ch.send_nowait(event)

        except Exception as e:
            print(f"WhisperLocal Error: {e}")
            import traceback
            traceback.print_exc()
            raise


# Alternative implementation using faster-whisper (more efficient)
class FasterWhisperSTT(stt.STT):
    """
    Faster Whisper STT implementation using CTranslate2.
    More efficient than the transformers version.

    Requires: pip install faster-whisper
    """

    def __init__(
        self,
        *,
        model_size: str = "base",
        language: str = "vi",
        device: str = "auto",
        compute_type: str = "auto",  # auto, int8, float16, float32
    ):
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False)
        )

        self._model_size = model_size
        self._language = language
        self._device = device
        self._compute_type = compute_type
        self._model = None
        self._lock = asyncio.Lock()

    def _ensure_loaded(self):
        """Lazy load the faster-whisper model"""
        if self._model is None:
            from faster_whisper import WhisperModel
            import torch

            # Determine device and compute type
            if self._device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
            else:
                device = self._device

            if self._compute_type == "auto":
                compute_type = "float16" if device == "cuda" else "int8"
            else:
                compute_type = self._compute_type

            print(f"FasterWhisper: Loading {self._model_size} on {device} ({compute_type})...")

            self._model = WhisperModel(
                self._model_size,
                device=device,
                compute_type=compute_type,
            )

            print(f"FasterWhisper: Model loaded successfully")

    def recognize(
        self,
        *,
        buffer: stt.AudioBuffer,
        language: str | None = None,
        conn_options: APIConnectOptions = APIConnectOptions(),
    ) -> "FasterWhisperRecognizeStream":
        return FasterWhisperRecognizeStream(
            stt=self,
            buffer=buffer,
            language=language or self._language,
            conn_options=conn_options,
        )

    def _transcribe(self, audio_data: np.ndarray, sample_rate: int, language: str) -> str:
        """Transcribe audio using faster-whisper"""
        self._ensure_loaded()

        # Resample if needed
        if sample_rate != 16000:
            from scipy import signal
            num_samples = int(len(audio_data) * 16000 / sample_rate)
            audio_data = signal.resample(audio_data, num_samples)

        # Normalize to float32
        if audio_data.dtype != np.float32:
            if audio_data.dtype == np.int16:
                audio_data = audio_data.astype(np.float32) / 32768.0
            else:
                audio_data = audio_data.astype(np.float32)

        # Transcribe
        segments, info = self._model.transcribe(
            audio_data,
            language=language,
            beam_size=5,
            vad_filter=True,
        )

        # Combine all segments
        text = " ".join([segment.text for segment in segments])
        return text.strip()

    def close(self):
        if self._model is not None:
            del self._model
            self._model = None


class FasterWhisperRecognizeStream(stt.RecognizeStream):
    """Recognition stream for faster-whisper"""

    def __init__(
        self,
        *,
        stt: FasterWhisperSTT,
        buffer: stt.AudioBuffer,
        language: str,
        conn_options: APIConnectOptions,
    ):
        super().__init__(stt=stt, conn_options=conn_options)
        self._whisper_stt = stt
        self._buffer = buffer
        self._language = language

    async def _run(self) -> None:
        try:
            frames = []
            sample_rate = 16000

            async for frame in self._buffer:
                audio_np = np.frombuffer(frame.data, dtype=np.int16)
                sample_rate = frame.sample_rate
                frames.append(audio_np)

            if not frames:
                return

            audio_data = np.concatenate(frames)

            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                None,
                self._whisper_stt._transcribe,
                audio_data,
                sample_rate,
                self._language,
            )

            if text:
                event = stt.SpeechEvent(
                    type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                    alternatives=[
                        stt.SpeechData(
                            text=text,
                            language=self._language,
                            confidence=0.9,
                        )
                    ],
                )
                self._event_ch.send_nowait(event)

        except Exception as e:
            print(f"FasterWhisper Error: {e}")
            import traceback
            traceback.print_exc()
            raise


# Helper function
def create_whisper_stt(
    model_size: str = "base",
    language: str = "vi",
    use_faster_whisper: bool = True,
) -> stt.STT:
    """
    Create a local Whisper STT instance.

    Args:
        model_size: Model size (tiny, base, small, medium, large)
        language: Language code (vi for Vietnamese)
        use_faster_whisper: Use faster-whisper (recommended) or transformers

    Returns:
        STT instance
    """
    if use_faster_whisper:
        try:
            return FasterWhisperSTT(
                model_size=model_size,
                language=language,
            )
        except ImportError:
            print("faster-whisper not installed, falling back to transformers")

    return WhisperLocalSTT(
        model_size=model_size,
        language=language,
    )
