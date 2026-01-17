# NeuTTS-Air Vietnamese TTS Plugin for LiveKit Agents
# Custom TTS using dinhthuan/neutts-air-vi from Hugging Face
# Fully local - no API keys required
# Compatible with livekit-agents v1.3.x

from __future__ import annotations

import asyncio
import os
import re
from pathlib import Path

import torch
import numpy as np
from livekit import rtc
from livekit.agents import tts, APIConnectOptions


class NeuTTSAirViTTS(tts.TTS):
    """
    NeuTTS-Air Vietnamese TTS implementation for LiveKit Agents.

    Uses dinhthuan/neutts-air-vi model for high-quality Vietnamese speech.
    Requires a reference audio file for voice cloning.

    Audio output: 24kHz, mono, int16
    """

    def __init__(
        self,
        *,
        ref_audio_path: str | None = None,
        ref_text: str | None = None,
        device: str = "auto",
        temperature: float = 1.0,
        top_k: int = 50,
    ):
        """
        Initialize NeuTTS-Air Vietnamese TTS.

        Args:
            ref_audio_path: Path to reference audio file (3-10 seconds, wav format)
            ref_text: Transcript of reference audio (Vietnamese)
            device: "cuda", "cpu", or "auto"
            temperature: Generation temperature
            top_k: Top-k sampling parameter
        """
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=24000,
            num_channels=1,
        )

        self._ref_audio_path = ref_audio_path
        self._ref_text = ref_text or ""
        self._temperature = temperature
        self._top_k = top_k

        # Auto-detect device
        if device == "auto":
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self._device = device

        # Lazy loaded components
        self._model = None
        self._tokenizer = None
        self._codec = None
        self._phonemizer = None
        self._ref_codes = None
        self._ref_phones = None
        self._loaded = False

    def _ensure_loaded(self):
        """Lazy load all models"""
        if self._loaded:
            return

        print(f"NeuTTS-Air-Vi: Loading models on {self._device}...")

        from transformers import AutoTokenizer, AutoModelForCausalLM
        from neucodec import NeuCodec
        from phonemizer.backend import EspeakBackend
        from vinorm import TTSnorm
        import librosa

        # Load model
        model_id = "dinhthuan/neutts-air-vi"
        print(f"NeuTTS-Air-Vi: Loading {model_id}...")

        self._tokenizer = AutoTokenizer.from_pretrained(model_id)

        dtype = torch.bfloat16 if self._device == "cuda" else torch.float32
        self._model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=dtype,
            trust_remote_code=True,
        ).to(self._device)
        self._model.eval()

        # Load codec
        print("NeuTTS-Air-Vi: Loading NeuCodec...")
        self._codec = NeuCodec.from_pretrained("neuphonic/neucodec").to(self._device)
        self._codec.eval()

        # Initialize phonemizer
        print("NeuTTS-Air-Vi: Initializing phonemizer...")
        self._phonemizer = EspeakBackend(
            language='vi',
            preserve_punctuation=True,
            with_stress=True
        )

        # Store TTSnorm for text normalization
        self._ttsnorm = TTSnorm

        # Encode reference audio if provided
        if self._ref_audio_path and os.path.exists(self._ref_audio_path):
            print(f"NeuTTS-Air-Vi: Encoding reference audio: {self._ref_audio_path}")
            wav, _ = librosa.load(self._ref_audio_path, sr=16000, mono=True)
            wav_tensor = torch.from_numpy(wav).float().unsqueeze(0).unsqueeze(0).to(self._device)

            with torch.no_grad():
                self._ref_codes = self._codec.encode_code(audio_or_path=wav_tensor).squeeze(0).squeeze(0).cpu()

            # Phonemize reference text
            if self._ref_text:
                ref_text_norm = self._ttsnorm(self._ref_text, punc=False, unknown=True, lower=False, rule=False)
                self._ref_phones = self._phonemizer.phonemize([ref_text_norm])[0]
            else:
                self._ref_phones = ""
        else:
            print("NeuTTS-Air-Vi: No reference audio - using zero-shot mode")
            self._ref_codes = None
            self._ref_phones = ""

        self._loaded = True
        print("NeuTTS-Air-Vi: Ready!")

    def set_reference(self, audio_path: str, text: str):
        """Set or change reference audio for voice cloning"""
        import librosa

        self._ensure_loaded()

        print(f"NeuTTS-Air-Vi: Setting new reference: {audio_path}")
        wav, _ = librosa.load(audio_path, sr=16000, mono=True)
        wav_tensor = torch.from_numpy(wav).float().unsqueeze(0).unsqueeze(0).to(self._device)

        with torch.no_grad():
            self._ref_codes = self._codec.encode_code(audio_or_path=wav_tensor).squeeze(0).squeeze(0).cpu()

        ref_text_norm = self._ttsnorm(text, punc=False, unknown=True, lower=False, rule=False)
        self._ref_phones = self._phonemizer.phonemize([ref_text_norm])[0]
        self._ref_text = text

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = APIConnectOptions(),
    ) -> "NeuTTSAirViChunkedStream":
        return NeuTTSAirViChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
        )

    def _synthesize_audio(self, text: str) -> np.ndarray:
        """Synthesize audio from text"""
        self._ensure_loaded()

        # Normalize and phonemize input text
        text_norm = self._ttsnorm(text, punc=False, unknown=True, lower=False, rule=False)
        phones = self._phonemizer.phonemize([text_norm])[0]

        # Build prompt
        if self._ref_codes is not None and len(self._ref_codes) > 0:
            # Voice cloning mode
            codes_str = "".join([f"<|speech_{i}|>" for i in self._ref_codes.tolist()])
            combined_phones = self._ref_phones + " " + phones if self._ref_phones else phones
        else:
            # Zero-shot mode (no reference)
            codes_str = ""
            combined_phones = phones

        chat = f"""user: Convert the text to speech:<|TEXT_PROMPT_START|>{combined_phones}<|TEXT_PROMPT_END|>\nassistant:<|SPEECH_GENERATION_START|>{codes_str}"""

        input_ids = self._tokenizer.encode(chat, return_tensors="pt").to(self._device)
        speech_end_id = self._tokenizer.convert_tokens_to_ids("<|SPEECH_GENERATION_END|>")

        # Generate
        with torch.no_grad():
            output = self._model.generate(
                input_ids,
                max_new_tokens=2048,
                temperature=self._temperature,
                top_k=self._top_k,
                eos_token_id=speech_end_id,
                pad_token_id=self._tokenizer.eos_token_id,
            )

        # Decode output
        output_text = self._tokenizer.decode(output[0], skip_special_tokens=False)

        # Extract speech codes
        speech_pattern = r'<\|speech_(\d+)\|>'
        speech_codes = [int(m) for m in re.findall(speech_pattern, output_text)]

        if not speech_codes:
            print("NeuTTS-Air-Vi: Warning - no speech codes generated")
            return np.zeros(24000, dtype=np.float32)  # 1 second of silence

        # Skip reference codes if present
        if self._ref_codes is not None:
            ref_len = len(self._ref_codes)
            speech_codes = speech_codes[ref_len:]

        if not speech_codes:
            print("NeuTTS-Air-Vi: Warning - no new speech codes after removing reference")
            return np.zeros(24000, dtype=np.float32)

        # Decode to audio
        codes_tensor = torch.tensor(speech_codes).unsqueeze(0).unsqueeze(0).to(self._device)

        with torch.no_grad():
            audio = self._codec.decode_code(codes_tensor)

        audio_np = audio.squeeze().cpu().numpy()
        return audio_np

    def close(self):
        """Clean up resources"""
        if self._model is not None:
            del self._model
            self._model = None
        if self._codec is not None:
            del self._codec
            self._codec = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        self._loaded = False
        print("NeuTTS-Air-Vi: Closed")


class NeuTTSAirViChunkedStream(tts.ChunkedStream):
    """Chunked stream implementation for NeuTTS-Air Vietnamese"""

    def __init__(
        self,
        *,
        tts: NeuTTSAirViTTS,
        input_text: str,
        conn_options: APIConnectOptions,
    ):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._neutts_tts = tts

    async def _run(self) -> None:
        """Generate speech and yield audio frames"""
        request_id = f"neutts-{id(self)}"

        try:
            # Run synthesis in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            audio_data = await loop.run_in_executor(
                None,
                self._neutts_tts._synthesize_audio,
                self._input_text,
            )

            # Convert to int16 for LiveKit
            if audio_data.dtype == np.float32 or audio_data.dtype == np.float64:
                # Normalize if needed
                max_val = np.abs(audio_data).max()
                if max_val > 1.0:
                    audio_data = audio_data / max_val
                audio_int16 = (audio_data * 32767).astype(np.int16)
            else:
                audio_int16 = audio_data.astype(np.int16)

            # Create audio frame
            audio_frame = rtc.AudioFrame(
                data=audio_int16.tobytes(),
                sample_rate=24000,
                num_channels=1,
                samples_per_channel=len(audio_int16),
            )

            # Send synthesized audio
            synthesized = tts.SynthesizedAudio(
                request_id=request_id,
                frame=audio_frame,
            )

            self._event_ch.send_nowait(synthesized)

        except Exception as e:
            print(f"NeuTTS-Air-Vi Error: {e}")
            import traceback
            traceback.print_exc()
            raise


# Helper function
def create_neutts_air_vi(
    ref_audio_path: str | None = None,
    ref_text: str | None = None,
    device: str = "auto",
) -> NeuTTSAirViTTS:
    """
    Create a NeuTTS-Air Vietnamese TTS instance.

    Args:
        ref_audio_path: Path to reference audio (3-10 seconds wav)
        ref_text: Transcript of reference audio
        device: "cuda", "cpu", or "auto"

    Returns:
        NeuTTSAirViTTS instance
    """
    return NeuTTSAirViTTS(
        ref_audio_path=ref_audio_path,
        ref_text=ref_text,
        device=device,
    )
