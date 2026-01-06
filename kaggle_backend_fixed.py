# VNeID Voice AI Backend - Kaggle Notebook (CONVERSATIONAL)
# Natural, short responses for voice interaction

# ==========================================
# CELL 1: Install dependencies
# ==========================================
# !pip install -q openai-whisper anthropic flask flask-cors pyngrok pydub

# ==========================================
# CELL 2: Load Whisper Model
# ==========================================

import whisper
print("Loading Whisper...")
# Use "base" model for faster response (vs "large" which is slow)
whisper_model = whisper.load_model("base")
print("Whisper ready!")

# ==========================================
# CELL 3: Setup Claude & Helper Functions
# ==========================================

import anthropic
import json
import re
import hashlib
import tempfile
import os

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "your-claude-api-key-here")
client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# ==========================================
# DYNAMIC AI VOICE ASSISTANT MODULE
# Fully AI-driven, works with any screen/form
# Pass screen_context from frontend for flexibility
# ==========================================

response_cache = {}
conversation_history = []
MAX_HISTORY = 10  # Keep last 5 exchanges for better context

def get_system_prompt(user_context, screen_context):
    """Generate dynamic system prompt based on screen context"""

    # Extract user info
    user_info = ""
    if user_context:
        user_info = f"""
THÔNG TIN USER (đã có sẵn, KHÔNG hỏi lại):
- Họ tên: {user_context.get('hoTen', '')}
- CCCD: {user_context.get('cccd', '')}
- Ngày sinh: {user_context.get('ngaySinh', '')}
- Giới tính: {user_context.get('gioiTinh', '')}
- Địa chỉ: {user_context.get('thuongTru', '')}
- Email: {user_context.get('email', '')}
- SĐT: {user_context.get('sdt', '')}
"""

    # Extract screen context
    screen_info = ""
    if screen_context:
        screen_name = screen_context.get('screen_name', '')
        screen_desc = screen_context.get('screen_description', '')
        current_step = screen_context.get('current_step', 0)
        total_steps = screen_context.get('total_steps', 1)
        fields_to_fill = screen_context.get('fields_to_fill', [])
        filled_data = screen_context.get('filled_data', {})
        available_actions = screen_context.get('available_actions', [])

        # Build fields description
        fields_desc = ""
        if fields_to_fill:
            missing = []
            filled = []
            for f in fields_to_fill:
                key = f.get('key', '')
                label = f.get('label', '')
                required = f.get('required', False)
                options = f.get('options', [])

                if key in filled_data and filled_data[key]:
                    filled.append(f"- {label}: {filled_data[key]} ✓")
                else:
                    opt_str = f" (options: {', '.join(options)})" if options else ""
                    req_str = " *bắt buộc*" if required else " (tùy chọn)"
                    missing.append(f"- {label}{req_str}{opt_str}")

            if filled:
                fields_desc += "Đã điền:\n" + "\n".join(filled) + "\n"
            if missing:
                fields_desc += "Cần điền:\n" + "\n".join(missing)

        screen_info = f"""
SCREEN HIỆN TẠI: {screen_name}
Mô tả: {screen_desc}
Bước: {current_step}/{total_steps}

{fields_desc}

Actions có thể: {', '.join(available_actions) if available_actions else 'none'}
"""

    user_name = user_context.get('hoTen', '').split()[-1] if user_context and user_context.get('hoTen') else 'anh'

    return f"""Bạn là trợ lý ảo VNeID, nói chuyện như một người bạn thân thiện, tự nhiên.

{user_info}
{screen_info}

CÁCH NÓI CHUYỆN:
- Xưng "em", gọi user là "anh {user_name}" hoặc "anh"
- Nói ngắn gọn, tự nhiên như nhắn tin với bạn
- KHÔNG đọc danh sách, KHÔNG liệt kê
- Hỏi 1 câu thôi, đợi trả lời rồi hỏi tiếp
- Khi user hỏi gì, trả lời xong rồi quay lại flow

VÍ DỤ HỘI THOẠI TỰ NHIÊN:

User: "Xin chào"
AI: "Chào anh {user_name}! Em giúp gì được anh ạ? @@AI@@{{"action": "none", "data": {{}}}}@@END@@"

User: "Tôi muốn làm lý lịch tư pháp"
AI: "Dạ em hỗ trợ anh ngay! Anh làm LLTP để xin việc hay mục đích khác ạ? @@AI@@{{"action": "navigate", "navigate_to": "lltp", "data": {{}}, "field_asking": "muc_dich"}}@@END@@"

User: "Xin việc"
AI: "Ok anh, anh cần mấy bản ạ? @@AI@@{{"action": "fill_field", "data": {{"muc_dich": "Xin việc làm"}}, "field_asking": "so_ban"}}@@END@@"

User: "2"
AI: "2 bản nhé. Em chuyển sang bước xác nhận nha! @@AI@@{{"action": "fill_field", "data": {{"so_ban": "2"}}, "next_step": true}}@@END@@"

User: "Khoan, phiếu số 1 với số 2 khác nhau sao?"
AI: "Số 1 là cho cá nhân anh tự xin, số 2 là cơ quan yêu cầu cấp cho anh. Anh cần loại nào ạ? @@AI@@{{"action": "none", "data": {{}}, "field_asking": "loai_phieu"}}@@END@@"

User: "Số 1"
AI: "Ok số 1. Tiếp tục nhé anh! @@AI@@{{"action": "fill_field", "data": {{"loai_phieu": "so1"}}}}@@END@@"

User: "Bao lâu có kết quả?"
AI: "Thường 3-5 ngày làm việc anh ạ. Mình tiếp tục điền form nhé? @@AI@@{{"action": "none", "data": {{}}}}@@END@@"

User: "Ừ"
AI: "Ok, anh kiểm tra thông tin rồi xác nhận giúp em nha! @@AI@@{{"action": "next_step", "data": {{}}}}@@END@@"

ACTIONS: "none" (chat), "navigate" (chuyển màn), "fill_field" (điền data), "next_step" (bước tiếp), "prev_step" (quay lại), "submit" (gửi)
OUTPUT: Câu tự nhiên @@AI@@{{"action": "...", "data": {{}}, "navigate_to": "...", "next_step": true/false, "field_asking": "..."}}@@END@@
"""


def call_claude(user_message, user_context=None, screen_context=None):
    """Call Claude API with full context"""
    global conversation_history

    try:
        # Add user message to history
        conversation_history.append({"role": "user", "content": user_message})

        # Keep history manageable
        if len(conversation_history) > MAX_HISTORY:
            conversation_history = conversation_history[-MAX_HISTORY:]

        # Generate dynamic system prompt
        system_prompt = get_system_prompt(user_context, screen_context)

        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=300,
            system=system_prompt,
            messages=conversation_history
        )
        result = response.content[0].text

        # Add to history
        conversation_history.append({"role": "assistant", "content": result})

        return result
    except Exception as e:
        print(f"Claude API Error: {e}")
        return None


def reset_conversation():
    """Reset conversation state"""
    global conversation_history, response_cache
    conversation_history = []
    response_cache = {}


def extract_ai_response(text):
    """Extract AI response data from @@AI@@...@@END@@ format"""
    if not text:
        return {"action": "none", "data": {}, "navigate_to": None, "next_step": None}

    result = {"action": "none", "data": {}, "navigate_to": None, "next_step": None}

    try:
        # Try @@AI@@ format
        match = re.search(r'@@AI@@(.+?)@@END@@', text, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
            parsed = json.loads(json_str)
            return {
                "action": parsed.get("action", "none"),
                "data": parsed.get("data", {}),
                "navigate_to": parsed.get("navigate_to"),
                "next_step": parsed.get("next_step"),
                "field_asking": parsed.get("field_asking")
            }

        # Fallback: try @@DATA@@ format
        match = re.search(r'@@DATA@@(.+?)@@END@@', text, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
            parsed = json.loads(json_str)
            return {
                "action": parsed.get("action", "none"),
                "data": parsed.get("extracted", parsed.get("data", {})),
                "navigate_to": parsed.get("navigate_to"),
                "next_step": parsed.get("next_step")
            }

    except Exception as e:
        print(f"JSON parse error: {e}")

    return result


def clean_response_for_speech(text):
    """Remove ALL JSON and technical content from response"""
    if not text:
        return ""

    # Remove @@AI@@...@@END@@ block
    cleaned = re.sub(r'@@AI@@.*?@@END@@', '', text, flags=re.DOTALL)

    # Remove @@DATA@@...@@END@@ block
    cleaned = re.sub(r'@@DATA@@.*?@@END@@', '', text, flags=re.DOTALL)

    # Remove any remaining JSON objects
    cleaned = re.sub(r'\{[^{}]*\}', '', cleaned)
    cleaned = re.sub(r'\{[\s\S]*?\}', '', cleaned)

    # Remove JSON-like artifacts
    cleaned = re.sub(r'[\{\}\[\]"]', '', cleaned)

    # Remove extra whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = cleaned.strip()

    # Remove trailing punctuation artifacts
    cleaned = re.sub(r'^[,.\s]+', '', cleaned)
    cleaned = re.sub(r'[,.\s]+$', '', cleaned)

    return cleaned


def convert_audio_to_wav(input_path):
    """Convert audio to WAV format using pydub (more reliable than ffmpeg CLI)"""
    try:
        from pydub import AudioSegment
        output_path = input_path.rsplit('.', 1)[0] + '_converted.wav'

        # Detect format from extension
        ext = input_path.rsplit('.', 1)[-1].lower()
        format_map = {
            'm4a': 'mp4',
            'mp4': 'mp4',
            'caf': 'caf',
            'wav': 'wav',
            'webm': 'webm',
            '3gp': '3gp',
        }
        input_format = format_map.get(ext, ext)

        print(f"Converting {input_path} (format: {input_format}) to WAV...")

        # Load audio file
        audio = AudioSegment.from_file(input_path, format=input_format)

        # Convert to mono 16kHz WAV (optimal for Whisper)
        audio = audio.set_channels(1).set_frame_rate(16000)

        # Export as WAV
        audio.export(output_path, format='wav')

        print(f"Audio converted successfully: {output_path}")
        return output_path

    except Exception as e:
        print(f"Pydub conversion failed: {e}")
        # Fallback to ffmpeg CLI
        try:
            import subprocess
            output_path = input_path.rsplit('.', 1)[0] + '_converted.wav'

            cmd = [
                'ffmpeg', '-y', '-i', input_path,
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                output_path
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0 and os.path.exists(output_path):
                print(f"FFmpeg conversion successful: {output_path}")
                return output_path
            else:
                print(f"FFmpeg failed: {result.stderr}")
        except Exception as e2:
            print(f"FFmpeg fallback failed: {e2}")

        return None


def process_audio(audio_path, user_context=None, screen_context=None):
    """Process audio file with Whisper - always convert first for reliability"""
    converted_path = None
    try:
        print(f"Processing audio: {audio_path}")

        # ALWAYS convert to WAV first for maximum compatibility
        converted_path = convert_audio_to_wav(audio_path)

        if converted_path and os.path.exists(converted_path):
            print(f"Using converted file: {converted_path}")
            result = whisper_model.transcribe(converted_path, language="vi")
        else:
            # Fallback: try original file
            print("Conversion failed, trying original file...")
            result = whisper_model.transcribe(audio_path, language="vi")

        transcript = (result.get("text") or "").strip()

        if not transcript:
            return {
                "success": False,
                "error": "Không nghe rõ, bạn nói lại được không?",
                "transcript": ""
            }

        print(f"Transcript: {transcript}")
        return process_text(transcript, user_context, screen_context)

    except Exception as e:
        print(f"Whisper Error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

    finally:
        # Cleanup converted file
        if converted_path and os.path.exists(converted_path):
            try:
                os.unlink(converted_path)
            except:
                pass


def process_text(text, user_context=None, screen_context=None):
    """
    DYNAMIC AI VOICE ASSISTANT
    Fully AI-driven - passes screen context to Claude for intelligent responses
    """
    try:
        print(f"Processing: {text}")
        print(f"Screen context: {screen_context}")

        # Call Claude with full context
        claude_resp = call_claude(text, user_context, screen_context)

        if not claude_resp:
            return {
                "success": False,
                "error": "Xin lỗi, bạn nói lại được không?",
                "transcript": text
            }

        print(f"Claude response: {claude_resp}")

        # Extract AI response data
        ai_data = extract_ai_response(claude_resp)

        # Clean response for speech
        clean_resp = clean_response_for_speech(claude_resp)

        # Build action based on AI response
        action = ai_data.get("action", "none")
        if action == "navigate" and ai_data.get("navigate_to"):
            action = f"navigate_{ai_data['navigate_to']}"
        elif action == "next_step" or ai_data.get("next_step"):
            action = "next_step"
        elif action == "prev_step":
            action = "prev_step"
        elif action == "submit":
            action = "submit"
        elif action == "fill_field":
            action = "fill_field"

        # Generate TTS audio
        audio_base64 = None
        if clean_resp:
            audio_base64 = generate_tts_audio(clean_resp)

        return {
            "success": True,
            "transcript": text,
            "response": clean_resp,
            "audio": audio_base64,  # Base64 encoded MP3
            "data": ai_data.get("data", {}),
            "action": action,
            "next_step": ai_data.get("next_step"),
            "field_asking": ai_data.get("field_asking")
        }

    except Exception as e:
        print(f"Process Error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": "Có lỗi xảy ra ạ", "transcript": text}


# ==========================================
# CELL 4: Flask API Server
# ==========================================

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "models": ["whisper-base", "claude-haiku"]})


@app.route('/reset', methods=['POST'])
def api_reset():
    """Reset conversation history"""
    reset_conversation()
    return jsonify({"success": True, "message": "Conversation reset"})


@app.route('/process_voice', methods=['POST'])
def api_process_voice():
    try:
        if 'audio' not in request.files:
            return jsonify({"success": False, "error": "No audio file"})

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"success": False, "error": "Empty filename"})

        # Get file extension from filename
        filename = audio_file.filename
        ext = os.path.splitext(filename)[1] if filename else '.wav'
        if not ext:
            ext = '.wav'
        print(f"Received audio file: {filename}, extension: {ext}")

        # Get user context from form data
        user_context = None
        if 'user_context' in request.form:
            try:
                user_context = json.loads(request.form['user_context'])
            except:
                pass

        # Get screen context from form data
        screen_context = None
        if 'screen_context' in request.form:
            try:
                screen_context = json.loads(request.form['screen_context'])
            except:
                pass

        # Save with correct extension for Whisper to detect format
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        try:
            result = process_audio(tmp_path, user_context, screen_context)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})


@app.route('/process_text', methods=['POST'])
def api_process_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text"})

        # Get user context and screen context
        user_context = data.get('user_context')
        screen_context = data.get('screen_context')

        result = process_text(data['text'], user_context, screen_context)
        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)})


# ==========================================
# CELL 5: ElevenLabs TTS Integration
# ==========================================

import requests
import base64

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "your-elevenlabs-api-key-here")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "your-voice-id-here")
ELEVENLABS_MODEL = "eleven_v3"

def generate_tts_audio(text):
    """Generate TTS audio using ElevenLabs API"""
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
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                }
            }
        )
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
        else:
            print(f"ElevenLabs error: {response.status_code}")
            return None
    except Exception as e:
        print(f"TTS Error: {e}")
        return None


# ==========================================
# CELL 6: Start Server with ngrok
# ==========================================

from pyngrok import ngrok

NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "your-ngrok-token-here")
ngrok.kill()
ngrok.set_auth_token(NGROK_TOKEN)

public_url = ngrok.connect(5000)
print(f"API URL: {public_url}")
print("Copy this URL to the app!")

app.run(port=5000)
