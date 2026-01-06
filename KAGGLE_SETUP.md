# HUONG DAN SETUP KAGGLE BACKEND

## TONG QUAN

```
+------------------+       +-------------------+       +------------------+
|   MOBILE APP     |  -->  |  KAGGLE BACKEND   |  -->  |   WHISPER AI     |
|   (React Native) |       |  (Flask + ngrok)  |       |   (Speech-to-    |
|                  |  <--  |                   |  <--  |    Text)         |
+------------------+       +-------------------+       +------------------+
```

---

## BUOC 1: TAO KAGGLE ACCOUNT

1. Truy cap: https://www.kaggle.com
2. Dang ky tai khoan (free)
3. Xac nhan email

---

## BUOC 2: TAO NOTEBOOK MOI

1. Click **"Create"** > **"New Notebook"**
2. Dat ten: `vneid-voice-backend`

---

## BUOC 3: BAT GPU

1. Click **Settings** (goc phai)
2. **Accelerator** > Chon **GPU T4 x2**
3. **Persistence** > **Files only** (de giu file khi restart)

---

## BUOC 4: COPY CODE VAO NOTEBOOK

### Cell 1: Cai dat thu vien
```python
!pip install -q flask flask-cors pyngrok
!pip install -q openai-whisper
!pip install -q transformers accelerate
```

### Cell 2: Import va setup
```python
import os
import json
import re
import torch
import whisper
from flask import Flask, request, jsonify
from flask_cors import CORS
from threading import Thread
import warnings
warnings.filterwarnings('ignore')

print(f"GPU available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
```

### Cell 3: Load Whisper
```python
print("Loading Whisper model...")
whisper_model = whisper.load_model("medium")
print("Whisper loaded!")
```

### Cell 4: Xu ly logic
```python
PURPOSE_MAPPING = {
    'xin viec': 'Xin viec lam',
    'du hoc': 'Du hoc, hoc tap tai nuoc ngoai',
    'dinh cu': 'Dinh cu, doan tu gia dinh o nuoc ngoai',
    'ket hon': 'Ket hon voi nguoi nuoc ngoai',
    'cong chuc': 'Bo tuc ho so xin viec lam co quan Nha nuoc',
    'dau thau': 'Thuc hien hoat dong dau thau',
}

def transcribe_audio(audio_path):
    result = whisper_model.transcribe(audio_path, language="vi")
    return result["text"].strip()

def process_text(text):
    text_lower = text.lower()
    result = {"understood": False, "data": {}, "response": "", "action": None}

    # Check navigation
    if 'ly lich' in text_lower or 'tu phap' in text_lower:
        result["action"] = "navigate_lltp"
        result["response"] = "Da mo man hinh Ly lich Tu phap."
        result["understood"] = True
        return result

    # Extract purpose
    for keyword, purpose in PURPOSE_MAPPING.items():
        if keyword in text_lower:
            result["data"]["muc_dich"] = purpose
            result["understood"] = True

    # Extract quantity
    import re
    match = re.search(r'(\d+)\s*(ban|to)', text_lower)
    if match:
        result["data"]["so_ban"] = match.group(1)
        result["understood"] = True

    # Generate response
    if result["understood"]:
        result["action"] = "fill_form"
        if result["data"].get("muc_dich") and result["data"].get("so_ban"):
            result["response"] = f"Da ghi nhan: {result['data']['muc_dich']}, {result['data']['so_ban']} ban."
        elif result["data"].get("muc_dich"):
            result["response"] = f"Da chon: {result['data']['muc_dich']}. Can bao nhieu ban?"
    else:
        result["response"] = "Xin loi, toi chua hieu. Ban noi lai duoc khong?"

    return result
```

### Cell 5: Flask server
```python
app = Flask(__name__)
CORS(app)

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/process_voice', methods=['POST'])
def process_voice():
    try:
        audio_file = request.files['audio']
        audio_path = "/tmp/audio.wav"
        audio_file.save(audio_path)

        transcript = transcribe_audio(audio_path)
        result = process_text(transcript)
        result["success"] = True
        result["transcript"] = transcript

        os.remove(audio_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/process_text', methods=['POST'])
def process_text_api():
    data = request.get_json()
    result = process_text(data.get('text', ''))
    result["success"] = True
    return jsonify(result)

# Run server
def run():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

Thread(target=run, daemon=True).start()
print("Server running on port 5000")
```

### Cell 6: Ngrok public URL
```python
from pyngrok import ngrok

# Optional: Them auth token de co URL on dinh hon
# ngrok.set_auth_token("your_token_here")

public_url = ngrok.connect(5000)
print("=" * 50)
print("BACKEND DA SAN SANG!")
print(f"URL: {public_url}")
print("=" * 50)
```

---

## BUOC 5: LAY URL VA CAP NHAT APP

1. Sau khi chay Cell 6, ban se thay URL dang:
   ```
   https://xxxx-xx-xxx-xxx-xx.ngrok-free.app
   ```

2. Mo file `api_integration.js` va thay URL:
   ```javascript
   const BACKEND_URL = 'https://xxxx-xx-xxx-xxx-xx.ngrok-free.app';
   ```

3. Trong `App.jsx`, import va su dung:
   ```javascript
   import { processVoiceWithBackend, BACKEND_URL } from './api_integration';
   ```

---

## BUOC 6: TEST BACKEND

### Test tren Kaggle:
```python
import requests

# Test health
r = requests.get("http://localhost:5000/health")
print(r.json())

# Test process text
r = requests.post(
    "http://localhost:5000/process_text",
    json={"text": "xin viec can 2 ban"}
)
print(r.json())
```

### Test tu terminal:
```bash
curl https://your-ngrok-url.ngrok-free.app/health
```

---

## LUU Y QUAN TRONG

### Gioi han Kaggle:
- GPU: 30 gio/tuan (free tier)
- Session: 12 gio lien tuc
- RAM: 13GB (T4)

### Neu het GPU quota:
- Dung CPU (cham hon): Bo chon GPU trong Settings
- Dung model nho hon: `whisper.load_model("small")`

### Ngrok URL:
- URL thay doi moi lan restart
- Dang ky ngrok account de co authtoken (URL on dinh hon)
- Free ngrok co banner warning - click "Visit Site" de tiep tuc

### Khi Kaggle session het:
1. Restart notebook
2. Chay lai tat ca cell
3. Lay URL moi tu ngrok
4. Cap nhat URL trong app

---

## TROUBLESHOOTING

### Loi "CUDA out of memory":
```python
# Dung model nho hon
whisper_model = whisper.load_model("small")
```

### Loi "Connection refused":
- Dam bao Flask server da chay (Cell 5)
- Dam bao ngrok da connect (Cell 6)
- Check firewall/network

### Loi "Audio format not supported":
- Dam bao gui file WAV
- Check sample rate (nen la 16000 Hz)

### Ngrok loi "Too many connections":
- Dang ky ngrok account (free)
- Lay authtoken va them vao code

---

## THAM KHAO

- Kaggle Docs: https://www.kaggle.com/docs
- Whisper: https://github.com/openai/whisper
- ngrok: https://ngrok.com/docs
