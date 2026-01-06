# VNeID Voice AI Backend - Kaggle Notebook
# Chạy trên Kaggle với GPU T4/P100

# ==========================================
# CELL 1: Install dependencies
# ==========================================

!pip install -q transformers accelerate bitsandbytes
!pip install -q openai-whisper
!pip install -q gradio
!pip install -q pyngrok

# ==========================================
# CELL 2: Load Models
# ==========================================

import torch
import whisper
from transformers import AutoModelForCausalLM, AutoTokenizer
import re
import json

print("🔄 Loading Whisper model...")
whisper_model = whisper.load_model("medium")  # Dùng medium cho Kaggle (large cần nhiều RAM)
print("✅ Whisper loaded!")

print("🔄 Loading Vietnamese LLM...")
# Dùng PhoGPT cho nhẹ hơn, hoặc Vistral nếu đủ RAM
model_name = "vinai/PhoGPT-4B-Chat"
# model_name = "vilm/Vistral-7B-Chat"  # Uncomment nếu đủ RAM

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto",
    load_in_8bit=True  # Quantization để tiết kiệm RAM
)
print("✅ LLM loaded!")

# ==========================================
# CELL 3: Define System Prompt & Functions
# ==========================================

SYSTEM_PROMPT = """Bạn là trợ lý AI của ứng dụng VNeID, giúp người dùng điền form xin cấp Phiếu Lý lịch Tư pháp.

Form Lý lịch Tư pháp có các trường thông tin sau:
1. ho_ten: Họ và tên đầy đủ
2. ngay_sinh: Ngày tháng năm sinh (định dạng DD/MM/YYYY)
3. cccd: Số Căn cước công dân (12 chữ số)
4. gioi_tinh: Giới tính (Nam/Nữ)
5. que_quan: Quê quán
6. thuong_tru: Nơi thường trú
7. muc_dich: Mục đích xin cấp (xin việc, du học, kết hôn với người nước ngoài, cấp visa, bổ sung hồ sơ công chức, kinh doanh có điều kiện, khác)

Nhiệm vụ của bạn:
1. Phân tích những gì người dùng nói và trích xuất thông tin phù hợp với các trường trên
2. Trả lời BẰNG TIẾNG VIỆT, thân thiện, dễ hiểu (người dùng có thể là người già hoặc người khuyết tật)
3. Cuối câu trả lời, LUÔN kèm theo JSON với format: {"extracted": {...}, "missing": [...], "next_question": "..."}

Ví dụ:
- User: "Tôi tên là Nguyễn Văn An, sinh năm 1990"
- Assistant: "Dạ, em đã ghi nhận anh/chị Nguyễn Văn An, sinh năm 1990. Anh/chị cho em xin ngày tháng sinh cụ thể và số căn cước công dân được không ạ?
{"extracted": {"ho_ten": "Nguyễn Văn An", "ngay_sinh": "1990"}, "missing": ["ngay_sinh_day_month", "cccd", "gioi_tinh", "que_quan", "thuong_tru", "muc_dich"], "next_question": "ngay_sinh_day_month"}"

Lưu ý quan trọng:
- Nếu người dùng nói số, hãy lọc ra số (VD: "không một hai ba" → "0123")
- Nếu người dùng nói địa chỉ, format lại cho chuẩn
- Sử dụng ngôn ngữ lịch sự, xưng hô "em" với người dùng
"""

def process_audio(audio_path):
    """Xử lý audio file và trả về text + form data"""
    
    # 1. Speech-to-Text với Whisper
    print("🎤 Transcribing audio...")
    result = whisper_model.transcribe(
        audio_path, 
        language="vi",
        task="transcribe"
    )
    transcript = result["text"].strip()
    print(f"📝 Transcript: {transcript}")
    
    if not transcript:
        return {
            "success": False,
            "error": "Không nhận được giọng nói. Vui lòng nói to và rõ hơn.",
            "transcript": ""
        }
    
    # 2. LLM xử lý để hiểu ngữ cảnh
    print("🤖 Processing with LLM...")
    
    messages = f"### Câu hỏi: {transcript}\n### Trả lời:"
    
    inputs = tokenizer(
        SYSTEM_PROMPT + "\n\n" + messages, 
        return_tensors="pt"
    ).to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=300,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # Lấy phần sau "### Trả lời:"
    if "### Trả lời:" in response:
        response = response.split("### Trả lời:")[-1].strip()
    
    print(f"💬 LLM Response: {response}")
    
    # 3. Extract JSON từ response
    form_data = extract_json_from_response(response)
    
    # 4. Clean response (bỏ JSON để hiển thị)
    clean_response = re.sub(r'\{[^}]+\}', '', response).strip()
    
    return {
        "success": True,
        "transcript": transcript,
        "response": clean_response,
        "form_data": form_data.get("extracted", {}),
        "missing_fields": form_data.get("missing", []),
        "next_question": form_data.get("next_question", "")
    }

def extract_json_from_response(text):
    """Extract JSON object từ LLM response"""
    try:
        # Tìm JSON pattern trong text
        json_match = re.search(r'\{[^{}]*"extracted"[^{}]*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    
    # Fallback: regex extraction
    data = {"extracted": {}, "missing": [], "next_question": ""}
    
    # Extract họ tên
    name_match = re.search(r'(?:tên|họ tên)[:\s]+([A-ZÀ-Ỹa-zà-ỹ\s]+?)(?:,|\.|sinh|số|$)', text, re.IGNORECASE)
    if name_match:
        data["extracted"]["ho_ten"] = name_match.group(1).strip().title()
    
    # Extract ngày sinh
    date_match = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', text)
    if date_match:
        data["extracted"]["ngay_sinh"] = f"{date_match.group(1).zfill(2)}/{date_match.group(2).zfill(2)}/{date_match.group(3)}"
    
    # Extract CCCD
    cccd_match = re.search(r'(\d{12})', text)
    if cccd_match:
        data["extracted"]["cccd"] = cccd_match.group(1)
    
    return data

# ==========================================
# CELL 4: Create Gradio Interface
# ==========================================

import gradio as gr

def gradio_process(audio):
    """Wrapper function cho Gradio"""
    if audio is None:
        return "Vui lòng ghi âm hoặc upload file audio", "{}"
    
    result = process_audio(audio)
    
    if result["success"]:
        output_text = f"""📝 **Bạn nói:** {result['transcript']}

🤖 **AI trả lời:** {result['response']}

📋 **Thông tin đã nhận:**
{json.dumps(result['form_data'], ensure_ascii=False, indent=2)}
"""
        return output_text, json.dumps(result, ensure_ascii=False, indent=2)
    else:
        return f"❌ Lỗi: {result['error']}", json.dumps(result, ensure_ascii=False, indent=2)

# Tạo Gradio interface
demo = gr.Interface(
    fn=gradio_process,
    inputs=[
        gr.Audio(
            sources=["microphone", "upload"],
            type="filepath",
            label="🎤 Ghi âm hoặc upload file audio"
        )
    ],
    outputs=[
        gr.Textbox(label="📋 Kết quả", lines=10),
        gr.JSON(label="🔧 Raw Response (để debug)")
    ],
    title="🆔 VNeID Voice AI - Demo Backend",
    description="""
    ## Hướng dẫn test:
    1. Nhấn nút ghi âm 🎤 hoặc upload file audio
    2. Nói tiếng Việt, ví dụ: "Tôi tên là Nguyễn Văn An, sinh ngày 15 tháng 3 năm 1990"
    3. Xem kết quả AI trích xuất thông tin
    
    ## Các câu test mẫu:
    - "Tôi tên là Nguyễn Văn An, sinh ngày 15 tháng 3 năm 1990"
    - "Số căn cước của tôi là 012345678901"
    - "Quê tôi ở Hà Nội, hiện đang ở số 123 phố Huế"
    - "Tôi cần lý lịch tư pháp để xin việc"
    """,
    examples=[],
    cache_examples=False
)

# ==========================================
# CELL 5: Launch with Public URL
# ==========================================

from pyngrok import ngrok

# Set your ngrok authtoken (get from ngrok.com)
# ngrok.set_auth_token("YOUR_AUTH_TOKEN")

# Launch Gradio
print("🚀 Starting server...")
demo.launch(share=True, debug=True)

# Hoặc nếu dùng ngrok:
# public_url = ngrok.connect(7860)
# print(f"🌐 Public URL: {public_url}")
# demo.launch(server_port=7860)

# ==========================================
# CELL 6: API Endpoint (Optional - dùng Flask)
# ==========================================

# Nếu cần API thay vì Gradio UI, uncomment code dưới:

"""
from flask import Flask, request, jsonify
import tempfile
import os

app = Flask(__name__)

@app.route('/api/process_voice', methods=['POST'])
def api_process_voice():
    if 'audio' not in request.files:
        return jsonify({"success": False, "error": "No audio file"})
    
    audio_file = request.files['audio']
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        audio_file.save(tmp.name)
        result = process_audio(tmp.name)
        os.unlink(tmp.name)
    
    return jsonify(result)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "models_loaded": True})

# Run với ngrok
from pyngrok import ngrok
public_url = ngrok.connect(5000)
print(f"🌐 API URL: {public_url}")
app.run(port=5000)
"""
