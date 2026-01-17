# VieNeu-TTS Plugin for LiveKit Agents
# Custom TTS implementation using pnnbao-ump/VieNeu-TTS from Hugging Face
# Compatible with livekit-agents v1.3.x

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import AsyncIterator

from livekit import rtc
from livekit.agents import tts, APIConnectOptions
import numpy as np


class VieNeuTTS(tts.TTS):
    """
    VieNeu-TTS implementation for LiveKit Agents.
    Uses the vieneu SDK for Vietnamese text-to-speech synthesis.

    Audio output: 24kHz, mono, int16
    """

    def __init__(
        self,
        *,
        voice: str = "Binh",
        temperature: float = 1.0,
        top_k: int = 50,
        backbone_repo: str | None = None,
    ):
        """
        Initialize VieNeu-TTS.

        Args:
            voice: Preset voice name (e.g., "Binh")
            temperature: Generation temperature (0.1 = stable, 1.0+ = expressive)
            top_k: Top-k sampling parameter
            backbone_repo: Optional model repo (defaults to q4 quantized for speed)
        """
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=24000,
            num_channels=1,
        )

        self._voice_name = voice
        self._temperature = temperature
        self._top_k = top_k
        self._backbone_repo = backbone_repo

        # Lazy load the model
        self._vieneu = None
        self._current_voice = None
        self._lock = asyncio.Lock()

    def _ensure_loaded(self):
        """Lazy load the VieNeu model"""
        if self._vieneu is None:
            from vieneu import Vieneu

            print(f"VieNeu-TTS: Loading model...")
            if self._backbone_repo:
                self._vieneu = Vieneu(backbone_repo=self._backbone_repo)
            else:
                self._vieneu = Vieneu()  # Default q4 quantized

            # Get preset voice
            self._current_voice = self._vieneu.get_preset_voice(self._voice_name)
            print(f"VieNeu-TTS: Model loaded, using voice '{self._voice_name}'")
            print(f"VieNeu-TTS: Available voices: {self._vieneu.list_preset_voices()}")

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = APIConnectOptions(),
    ) -> "VieNeuChunkedStream":
        return VieNeuChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
        )

    def _synthesize_audio(self, text: str) -> np.ndarray:
        """Synthesize audio from text"""
        self._ensure_loaded()

        audio = self._vieneu.infer(
            text=text,
            voice=self._current_voice,
            temperature=self._temperature,
            top_k=self._top_k,
        )

        return audio

    def set_voice(self, voice_name: str):
        """Change the voice"""
        self._voice_name = voice_name
        if self._vieneu is not None:
            self._current_voice = self._vieneu.get_preset_voice(voice_name)
            print(f"VieNeu-TTS: Switched to voice '{voice_name}'")

    def close(self):
        """Clean up resources"""
        if self._vieneu is not None:
            self._vieneu.close()
            self._vieneu = None
            print("VieNeu-TTS: Closed")


class VieNeuChunkedStream(tts.ChunkedStream):
    """Chunked stream implementation for VieNeu-TTS"""

    def __init__(
        self,
        *,
        tts: VieNeuTTS,
        input_text: str,
        conn_options: APIConnectOptions,
    ):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._vieneu_tts = tts

    async def _run(self) -> None:
        """Generate speech and yield audio frames"""
        request_id = f"vieneu-{id(self)}"

        try:
            # Run synthesis in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            audio_data = await loop.run_in_executor(
                None,
                self._vieneu_tts._synthesize_audio,
                self._input_text,
            )

            # Convert to int16 for LiveKit
            # VieNeu outputs float32 in range [-1, 1]
            if audio_data.dtype == np.float32 or audio_data.dtype == np.float64:
                audio_int16 = (audio_data * 32767).astype(np.int16)
            else:
                audio_int16 = audio_data.astype(np.int16)

            # Create audio frame using rtc.AudioFrame
            audio_frame = rtc.AudioFrame(
                data=audio_int16.tobytes(),
                sample_rate=24000,
                num_channels=1,
                samples_per_channel=len(audio_int16),
            )

            # Create synthesized audio event
            synthesized = tts.SynthesizedAudio(
                request_id=request_id,
                frame=audio_frame,
            )

            self._event_ch.send_nowait(synthesized)

        except Exception as e:
            print(f"VieNeu-TTS Error: {e}")
            import traceback
            traceback.print_exc()
            raise


# Helper function to create TTS instance
def create_vieneu_tts(
    voice: str = "Binh",
    temperature: float = 1.0,
    top_k: int = 50,
    quality: str = "fast",  # "fast", "balanced", "best"
) -> VieNeuTTS:
    """
    Create a VieNeu-TTS instance with preset quality configurations.

    Args:
        voice: Voice name (e.g., "Binh")
        temperature: Generation temperature
        top_k: Top-k sampling
        quality: Quality preset:
            - "fast": q4 quantized (default, CPU optimized)
            - "balanced": q8 quantized (better quality)
            - "best": Full 0.5B PyTorch model

    Returns:
        VieNeuTTS instance
    """
    backbone_map = {
        "fast": None,  # Default q4
        "balanced": "pnnbao-ump/VieNeu-TTS-0.3B-q8-gguf",
        "best": "pnnbao-ump/VieNeu-TTS",  # 0.5B PyTorch
    }

    return VieNeuTTS(
        voice=voice,
        temperature=temperature,
        top_k=top_k,
        backbone_repo=backbone_map.get(quality),
    )
