# VNeID Voice AI Backend - STREAMING VERSION
# Real-time audio streaming like Discord
# Uses WebSocket for continuous conversation

# ==========================================
# CELL 1: Install dependencies
# ==========================================
# !pip install -q openai-whisper anthropic flask flask-cors flask-socketio pyngrok webrtcvad numpy

# ==========================================
# CELL 2: Imports and Setup
# ==========================================

import whisper
import anthropic
import json
import re
import tempfile
import os
import base64
import numpy as np
import wave
import requests
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit

print("Loading Whisper...")
whisper_model = whisper.load_model("base")
print("Whisper ready!")

# ==========================================
# CELL 3: Claude API Setup
# ==========================================

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "your-claude-api-key-here")
client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# ElevenLabs TTS
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "your-elevenlabs-api-key-here")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "your-voice-id-here")
ELEVENLABS_MODEL = "eleven_v3"

# Conversation state
conversation_history = []
MAX_HISTORY = 10

# ==========================================
# CELL 4: Audio Buffer & VAD
# ==========================================

class AudioBuffer:
    """Accumulates audio chunks and detects speech boundaries"""
    def __init__(self, sample_rate=16000):
        self.sample_rate = sample_rate
        self.buffer = bytearray()
        self.is_speaking = False
        self.silence_frames = 0
        self.speech_frames = 0
        self.min_speech_frames = 3  # Minimum frames to consider as speech
        self.max_silence_frames = 15  # ~750ms of silence to end speech (at 50ms frames)
        self.energy_threshold = 500  # Adjust based on testing

    def add_chunk(self, chunk_base64):
        """Add audio chunk and return True if speech ended"""
        try:
            chunk = base64.b64decode(chunk_base64)
            self.buffer.extend(chunk)

            # Calculate energy of this chunk
            audio_data = np.frombuffer(chunk, dtype=np.int16)
            energy = np.sqrt(np.mean(audio_data.astype(np.float32) ** 2))

            if energy > self.energy_threshold:
                # Speech detected
                self.speech_frames += 1
                self.silence_frames = 0
                if self.speech_frames >= self.min_speech_frames:
                    self.is_speaking = True
            else:
                # Silence
                if self.is_speaking:
                    self.silence_frames += 1
                    if self.silence_frames >= self.max_silence_frames:
                        # End of speech detected
                        return True

            return False
        except Exception as e:
            print(f"Error processing chunk: {e}")
            return False

    def get_audio(self):
        """Get accumulated audio as bytes"""
        return bytes(self.buffer)

    def reset(self):
        """Reset buffer for next utterance"""
        self.buffer = bytearray()
        self.is_speaking = False
        self.silence_frames = 0
        self.speech_frames = 0

# Per-client audio buffers
audio_buffers = {}

# ==========================================
# CELL 5: AI Processing Functions
# ==========================================

def get_system_prompt(user_context, screen_context):
    """Generate dynamic system prompt"""
    user_info = ""
    if user_context:
        user_info = f"""
THÔNG TIN USER (đã có sẵn, KHÔNG hỏi lại):
- Họ tên: {user_context.get('hoTen', '')}
- CCCD: {user_context.get('cccd', '')}
- Ngày sinh: {user_context.get('ngaySinh', '')}
- Giới tính: {user_context.get('gioiTinh', '')}
- Địa chỉ: {user_context.get('thuongTru', '')}
"""

    screen_info = ""
    if screen_context:
        screen_name = screen_context.get('screen_name', '')
        screen_desc = screen_context.get('screen_description', '')
        current_step = screen_context.get('current_step', 0)
        total_steps = screen_context.get('total_steps', 1)
        fields_to_fill = screen_context.get('fields_to_fill', [])
        filled_data = screen_context.get('filled_data', {})
        available_actions = screen_context.get('available_actions', [])

        fields_desc = ""
        if fields_to_fill:
            missing = []
            for f in fields_to_fill:
                key = f.get('key', '')
                label = f.get('label', '')
                if key not in filled_data or not filled_data[key]:
                    missing.append(f"- {label}")
            if missing:
                fields_desc = "Cần điền:\n" + "\n".join(missing)

        screen_info = f"""
SCREEN: {screen_name} - {screen_desc}
Bước: {current_step}/{total_steps}
{fields_desc}
Actions: {', '.join(available_actions)}
"""

    user_name = user_context.get('hoTen', '').split()[-1] if user_context and user_context.get('hoTen') else 'anh'

    return f"""Bạn là trợ lý ảo VNeID, nói chuyện tự nhiên như bạn bè.
{user_info}
{screen_info}

CÁCH NÓI:
- Xưng "em", gọi "anh {user_name}"
- Ngắn gọn, tự nhiên
- Hỏi 1 câu, đợi trả lời

OUTPUT: Câu trả lời @@AI@@{{"action": "...", "data": {{}}, "next_step": true/false}}@@END@@
ACTIONS: none, navigate_lltp, navigate_home, fill_field, next_step, prev_step, submit
"""


def call_claude(user_message, user_context=None, screen_context=None):
    """Call Claude API"""
    global conversation_history

    try:
        conversation_history.append({"role": "user", "content": user_message})
        if len(conversation_history) > MAX_HISTORY:
            conversation_history = conversation_history[-MAX_HISTORY:]

        system_prompt = get_system_prompt(user_context, screen_context)

        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=200,
            system=system_prompt,
            messages=conversation_history
        )
        result = response.content[0].text
        conversation_history.append({"role": "assistant", "content": result})
        return result
    except Exception as e:
        print(f"Claude Error: {e}")
        return None


def extract_ai_response(text):
    """Extract AI response data"""
    if not text:
        return {"action": "none", "data": {}}

    try:
        match = re.search(r'@@AI@@(.+?)@@END@@', text, re.DOTALL)
        if match:
            parsed = json.loads(match.group(1).strip())
            return {
                "action": parsed.get("action", "none"),
                "data": parsed.get("data", {}),
                "next_step": parsed.get("next_step"),
                "navigate_to": parsed.get("navigate_to")
            }
    except:
        pass
    return {"action": "none", "data": {}}


def clean_response(text):
    """Clean response for speech"""
    if not text:
        return ""
    cleaned = re.sub(r'@@AI@@.*?@@END@@', '', text, flags=re.DOTALL)
    cleaned = re.sub(r'\{[^{}]*\}', '', cleaned)
    cleaned = re.sub(r'[\{\}\[\]"]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def generate_tts(text):
    """Generate TTS audio"""
    try:
        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
            headers={
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY,
            },
            json={
                "text": text,
                "model_id": ELEVENLABS_MODEL,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
            }
        )
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print(f"TTS Error: {e}")
    return None


def process_audio_buffer(audio_bytes, user_context, screen_context):
    """Process accumulated audio"""
    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            # Write WAV header + data
            with wave.open(tmp.name, 'wb') as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)  # 16-bit
                wav.setframerate(16000)
                wav.writeframes(audio_bytes)
            tmp_path = tmp.name

        # Transcribe
        result = whisper_model.transcribe(tmp_path, language="vi")
        transcript = (result.get("text") or "").strip()

        # Cleanup
        os.unlink(tmp_path)

        if not transcript:
            return None

        print(f"Transcript: {transcript}")

        # Get AI response
        claude_resp = call_claude(transcript, user_context, screen_context)
        if not claude_resp:
            return None

        ai_data = extract_ai_response(claude_resp)
        clean_resp = clean_response(claude_resp)

        # Generate TTS
        audio_base64 = generate_tts(clean_resp) if clean_resp else None

        # Build action
        action = ai_data.get("action", "none")
        if action == "navigate" and ai_data.get("navigate_to"):
            action = f"navigate_{ai_data['navigate_to']}"

        return {
            "transcript": transcript,
            "response": clean_resp,
            "audio": audio_base64,
            "data": ai_data.get("data", {}),
            "action": action,
            "next_step": ai_data.get("next_step")
        }

    except Exception as e:
        print(f"Process error: {e}")
        import traceback
        traceback.print_exc()
        return None


# ==========================================
# CELL 6: Flask + SocketIO Server
# ==========================================

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "mode": "streaming"})


@app.route('/reset', methods=['POST'])
def reset():
    global conversation_history
    conversation_history = []
    return jsonify({"success": True})


# Legacy REST endpoints (fallback)
@app.route('/process_text', methods=['POST'])
def api_process_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        user_context = data.get('user_context')
        screen_context = data.get('screen_context')

        claude_resp = call_claude(text, user_context, screen_context)
        if not claude_resp:
            return jsonify({"success": False, "error": "AI error"})

        ai_data = extract_ai_response(claude_resp)
        clean_resp = clean_response(claude_resp)
        audio_base64 = generate_tts(clean_resp) if clean_resp else None

        action = ai_data.get("action", "none")
        if action == "navigate" and ai_data.get("navigate_to"):
            action = f"navigate_{ai_data['navigate_to']}"

        return jsonify({
            "success": True,
            "transcript": text,
            "response": clean_resp,
            "audio": audio_base64,
            "data": ai_data.get("data", {}),
            "action": action,
            "next_step": ai_data.get("next_step")
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ==========================================
# CELL 7: WebSocket Handlers
# ==========================================

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    audio_buffers[request.sid] = AudioBuffer()
    emit('connected', {'status': 'ready'})


@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    if request.sid in audio_buffers:
        del audio_buffers[request.sid]


@socketio.on('start_listening')
def handle_start_listening(data):
    """Client starts streaming audio"""
    print(f"Start listening: {request.sid}")
    if request.sid in audio_buffers:
        audio_buffers[request.sid].reset()
    else:
        audio_buffers[request.sid] = AudioBuffer()
    emit('listening_started', {'status': 'listening'})


@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """Receive audio chunk from client"""
    sid = request.sid
    if sid not in audio_buffers:
        audio_buffers[sid] = AudioBuffer()

    buffer = audio_buffers[sid]
    chunk = data.get('chunk', '')
    user_context = data.get('user_context')
    screen_context = data.get('screen_context')

    # Add chunk and check for end of speech
    speech_ended = buffer.add_chunk(chunk)

    if speech_ended and buffer.is_speaking:
        print(f"Speech ended for {sid}, processing...")
        emit('processing', {'status': 'processing'})

        # Process the audio
        audio_bytes = buffer.get_audio()
        buffer.reset()

        result = process_audio_buffer(audio_bytes, user_context, screen_context)

        if result:
            emit('response', {
                'success': True,
                'transcript': result['transcript'],
                'response': result['response'],
                'audio': result['audio'],
                'data': result['data'],
                'action': result['action'],
                'next_step': result['next_step']
            })
        else:
            emit('response', {
                'success': False,
                'error': 'Không nghe rõ, bạn nói lại nhé?'
            })


@socketio.on('stop_listening')
def handle_stop_listening(data):
    """Force process remaining audio"""
    sid = request.sid
    if sid in audio_buffers:
        buffer = audio_buffers[sid]
        if len(buffer.buffer) > 0:
            user_context = data.get('user_context')
            screen_context = data.get('screen_context')

            emit('processing', {'status': 'processing'})

            audio_bytes = buffer.get_audio()
            buffer.reset()

            result = process_audio_buffer(audio_bytes, user_context, screen_context)

            if result:
                emit('response', {
                    'success': True,
                    'transcript': result['transcript'],
                    'response': result['response'],
                    'audio': result['audio'],
                    'data': result['data'],
                    'action': result['action'],
                    'next_step': result['next_step']
                })


# ==========================================
# CELL 8: Start Server
# ==========================================

from pyngrok import ngrok

NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "your-ngrok-token-here")
ngrok.kill()
ngrok.set_auth_token(NGROK_TOKEN)

public_url = ngrok.connect(5000)
print(f"\n{'='*50}")
print(f"🎤 STREAMING API URL: {public_url}")
print(f"{'='*50}")
print("Copy this URL to the app!")
print("Mode: WebSocket streaming (like Discord)")

socketio.run(app, host='0.0.0.0', port=5000)
