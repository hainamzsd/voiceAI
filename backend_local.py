# VNeID Voice AI - Local Backend
# Run: python backend_local.py
# Then update BACKEND_URL to http://10.0.2.2:5000 (Android emulator)
# Or http://YOUR_LOCAL_IP:5000 for real device
#
# Uses local models:
# - VieNeu-TTS for Vietnamese text-to-speech
# - Whisper for Vietnamese speech-to-text

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import base64
import tempfile
import anthropic
import numpy as np

load_dotenv(".env.local")

app = Flask(__name__)
CORS(app)

# API Keys
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")

# Local model configuration
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large
VIENEU_VOICE = os.getenv("VIENEU_VOICE", "Binh")
VIENEU_QUALITY = os.getenv("VIENEU_QUALITY", "fast")

# Initialize Claude
claude = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# Local models (lazy loaded)
_whisper_model = None
_vieneu_tts = None

# Conversation history
conversation_history = []
MAX_HISTORY = 10

def get_system_prompt(user_context, screen_context):
    """Generate system prompt based on context"""

    user_info = ""
    if user_context:
        user_info = f"""
THONG TIN USER (DA CO SAN - KHONG HOI LAI):
- Ho ten: {user_context.get('hoTen', 'N/A')}
- CCCD: {user_context.get('cccd', 'N/A')}
- Ngay sinh: {user_context.get('ngaySinh', 'N/A')}
- Dia chi: {user_context.get('thuongTru', 'N/A')}
"""

    screen_info = ""
    if screen_context:
        screen_name = screen_context.get('screen_name', 'home')
        screen_desc = screen_context.get('screen_description', '')
        step = screen_context.get('current_step', 0)
        total = screen_context.get('total_steps', 1)
        actions = screen_context.get('available_actions', [])
        filled = screen_context.get('filled_data', {})
        fields = screen_context.get('fields_to_fill', [])

        screen_info = f"""
MAN HINH HIEN TAI: {screen_name}
Mo ta: {screen_desc}
Buoc: {step}/{total}
Actions co the dung: {', '.join(actions)}
Du lieu da dien: {json.dumps(filled, ensure_ascii=False)}
Truong can dien: {json.dumps([f['label'] for f in fields], ensure_ascii=False) if fields else 'Khong co'}
"""

    user_name = "anh"
    if user_context and user_context.get('hoTen'):
        name_parts = user_context.get('hoTen', '').split()
        if name_parts:
            user_name = f"anh {name_parts[-1]}"

    return f"""Ban la tro ly ao VNeID, ho tro nguoi dung lam thu tuc hanh chinh bang giong noi.

{user_info}
{screen_info}

CACH GIAO TIEP:
- Xung "em", goi user la "{user_name}"
- Noi ngan gon, tu nhien, than thien
- KHONG dung emoji
- Hoi tung cau mot, doi tra loi
- Khi user noi "tiep tuc", "ok", "duoc" => chuyen sang buoc tiep

KHI CAN THUC HIEN ACTION, TRA LOI THEO FORMAT:
@@ACTION@@{{"action": "ten_action", "data": {{}}}}@@END@@

CAC ACTION:
- navigate_lltp: Mo trang LLTP
- navigate_home: Ve trang chu
- next_step: Chuyen sang buoc tiep theo
- prev_step: Quay lai buoc truoc
- fill_field: Dien form, data chua: muc_dich, so_ban, loai_phieu
- submit: Gui yeu cau

VI DU:
- User: "lam ly lich tu phap" => @@ACTION@@{{"action": "navigate_lltp"}}@@END@@
- User: "tiep tuc" => @@ACTION@@{{"action": "next_step"}}@@END@@
- User: "muc dich xin viec, 2 ban" => @@ACTION@@{{"action": "fill_field", "data": {{"muc_dich": "Xin viec lam", "so_ban": "2"}}}}@@END@@

MUC DICH HOP LE: Xin viec lam, Du hoc, Dinh cu, Ket hon voi nguoi nuoc ngoai, Bo tuc ho so, Dau thau, Muc dich khac
"""


def process_with_claude(text, user_context, screen_context):
    """Process text with Claude"""
    global conversation_history

    conversation_history.append({"role": "user", "content": text})
    if len(conversation_history) > MAX_HISTORY * 2:
        conversation_history = conversation_history[-MAX_HISTORY * 2:]

    try:
        response = claude.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=500,
            system=get_system_prompt(user_context, screen_context),
            messages=conversation_history
        )

        result = response.content[0].text
        conversation_history.append({"role": "assistant", "content": result})

        # Extract action
        action = None
        data = {}
        next_step = False

        import re
        match = re.search(r'@@ACTION@@(.+?)@@END@@', result, re.DOTALL)
        if match:
            try:
                action_json = json.loads(match.group(1).strip())
                action = action_json.get('action')
                data = action_json.get('data', {})
            except:
                pass

        # Check for next_step in response
        if action == 'next_step':
            next_step = True

        # Clean response text
        clean_text = re.sub(r'@@ACTION@@.*?@@END@@', '', result, flags=re.DOTALL)
        clean_text = clean_text.strip()

        return clean_text, action, data, next_step

    except Exception as e:
        print(f"Claude Error: {e}")
        return "Xin loi, em gap loi. Anh thu lai nhe?", None, {}, False


def get_whisper_model():
    """Lazy load Whisper model"""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"

            print(f"Loading Whisper model ({WHISPER_MODEL}) on {device}...")
            _whisper_model = WhisperModel(
                WHISPER_MODEL,
                device=device,
                compute_type=compute_type,
            )
            print("Whisper model loaded successfully")
        except ImportError:
            # Fallback to transformers pipeline
            from transformers import pipeline
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Loading Whisper model (transformers) on {device}...")
            _whisper_model = pipeline(
                "automatic-speech-recognition",
                model=f"openai/whisper-{WHISPER_MODEL}",
                device=device,
            )
            print("Whisper model loaded successfully")

    return _whisper_model


def get_vieneu_tts():
    """Lazy load VieNeu-TTS model"""
    global _vieneu_tts
    if _vieneu_tts is None:
        from vieneu import Vieneu

        quality_map = {
            "fast": None,
            "balanced": "pnnbao-ump/VieNeu-TTS-0.3B-q8-gguf",
            "best": "pnnbao-ump/VieNeu-TTS",
        }

        print(f"Loading VieNeu-TTS (voice={VIENEU_VOICE}, quality={VIENEU_QUALITY})...")
        backbone = quality_map.get(VIENEU_QUALITY)
        if backbone:
            _vieneu_tts = Vieneu(backbone_repo=backbone)
        else:
            _vieneu_tts = Vieneu()

        print("VieNeu-TTS loaded successfully")
        print(f"Available voices: {_vieneu_tts.list_preset_voices()}")

    return _vieneu_tts


def text_to_speech(text):
    """Convert text to speech using VieNeu-TTS (local)"""
    if not text:
        return None

    try:
        vieneu = get_vieneu_tts()
        voice = vieneu.get_preset_voice(VIENEU_VOICE)

        # Generate audio
        audio = vieneu.infer(
            text=text,
            voice=voice,
            temperature=1.0,
            top_k=50,
        )

        # Convert to int16
        if audio.dtype == np.float32 or audio.dtype == np.float64:
            audio_int16 = (audio * 32767).astype(np.int16)
        else:
            audio_int16 = audio.astype(np.int16)

        # Create WAV file in memory
        import io
        import wave

        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(24000)  # VieNeu outputs 24kHz
            wav_file.writeframes(audio_int16.tobytes())

        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')

    except Exception as e:
        print(f"TTS Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def transcribe_audio(audio_file):
    """Transcribe audio using local Whisper"""
    try:
        model = get_whisper_model()

        # Check if it's faster-whisper or transformers
        if hasattr(model, 'transcribe'):
            # faster-whisper
            segments, info = model.transcribe(
                audio_file,
                language="vi",
                beam_size=5,
                vad_filter=True,
            )
            text = " ".join([segment.text for segment in segments])
            return text.strip()
        else:
            # transformers pipeline
            result = model(
                audio_file,
                generate_kwargs={"language": "vi", "task": "transcribe"},
            )
            return result.get("text", "").strip()

    except Exception as e:
        print(f"Transcription Error: {e}")
        import traceback
        traceback.print_exc()
        return ""


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "vneid-voice-backend"})


@app.route('/reset', methods=['POST'])
def reset():
    global conversation_history
    conversation_history = []
    return jsonify({"status": "ok"})


@app.route('/process_text', methods=['POST'])
def process_text():
    try:
        data = request.json
        text = data.get('text', '')
        user_context = data.get('user_context')
        screen_context = data.get('screen_context')

        if not text:
            return jsonify({"success": False, "error": "No text provided"})

        # Process with Claude
        response_text, action, action_data, next_step = process_with_claude(
            text, user_context, screen_context
        )

        # Generate TTS
        audio_b64 = text_to_speech(response_text)

        return jsonify({
            "success": True,
            "transcript": text,
            "response": response_text,
            "audio": audio_b64,
            "action": action,
            "data": action_data,
            "next_step": next_step,
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/process_voice', methods=['POST'])
def process_voice():
    try:
        # Get audio file
        if 'audio' not in request.files:
            return jsonify({"success": False, "error": "No audio file"})

        audio_file = request.files['audio']
        user_context = request.form.get('user_context')
        screen_context = request.form.get('screen_context')

        if user_context:
            user_context = json.loads(user_context)
        if screen_context:
            screen_context = json.loads(screen_context)

        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        # Transcribe
        transcript = transcribe_audio(tmp_path)
        os.unlink(tmp_path)  # Clean up

        if not transcript:
            return jsonify({
                "success": True,
                "transcript": "",
                "response": "Em khong nghe ro, anh noi lai duoc khong?",
                "audio": text_to_speech("Em khong nghe ro, anh noi lai duoc khong?"),
                "action": None,
                "data": {},
                "next_step": False,
            })

        print(f"Transcript: {transcript}")

        # Process with Claude
        response_text, action, action_data, next_step = process_with_claude(
            transcript, user_context, screen_context
        )

        # Generate TTS
        audio_b64 = text_to_speech(response_text)

        return jsonify({
            "success": True,
            "transcript": transcript,
            "response": response_text,
            "audio": audio_b64,
            "action": action,
            "data": action_data,
            "next_step": next_step,
        })

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})


if __name__ == '__main__':
    print("=" * 50)
    print("VNeID Voice AI Backend (Local)")
    print("=" * 50)
    print(f"Claude API: {'OK' if CLAUDE_API_KEY else 'MISSING'}")
    print(f"Whisper STT: model={WHISPER_MODEL} (local)")
    print(f"VieNeu-TTS: voice={VIENEU_VOICE}, quality={VIENEU_QUALITY} (local)")
    print()
    print("Starting server on http://0.0.0.0:5000")
    print("For Android emulator: http://10.0.2.2:5000")
    print("For real device: http://<YOUR_IP>:5000")
    print()
    print("Models will be downloaded on first use:")
    print("  - Whisper: ~150MB-3GB depending on model size")
    print("  - VieNeu-TTS: ~500MB")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)
