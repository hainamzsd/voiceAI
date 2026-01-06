# VNeID Voice AI Demo

Demo ung dung VNeID voi Voice AI ho tro nguoi yeu the lam dich vu Ly lich Tu phap.

---

## Muc luc

1. [Tong quan](#tong-quan)
2. [Tinh nang](#tinh-nang)
3. [Cau truc du an](#cau-truc-du-an)
4. [Huong dan cai dat](#huong-dan-cai-dat)
5. [Chay demo](#chay-demo)
6. [Setup Kaggle Backend](#setup-kaggle-backend)
7. [Ket noi App voi Backend](#ket-noi-app-voi-backend)
8. [Cach su dung](#cach-su-dung)
9. [Screenshots](#screenshots)
10. [Troubleshooting](#troubleshooting)

---

## Tong quan

```
+------------------+       +-------------------+       +------------------+
|                  |       |                   |       |                  |
|   MOBILE APP     |  -->  |  KAGGLE BACKEND   |  -->  |   WHISPER AI     |
|   (React Native) |       |  (Flask + ngrok)  |       |   (STT)          |
|                  |  <--  |                   |  <--  |                  |
+------------------+       +-------------------+       +------------------+
        |                                                      |
        |  expo-speech (TTS)                                   |
        +------------------------------------------------------+
```

### Doi tuong su dung
- Nguoi cao tuoi
- Nguoi khiem thi
- Nguoi kho khan trong viec su dung smartphone

### Muc tieu
- Dien form tu dong bang giong noi
- Giao dien don gian, de su dung
- Phan hoi bang giong noi (TTS)

---

## Tinh nang

| Tinh nang | Mo ta | Trang thai |
|-----------|-------|------------|
| UI giong VNeID | Giao dien chuan VNeID | ✅ |
| The CCCD dien tu | Hien thi thong tin nguoi dung | ✅ |
| Luong LLTP 4 buoc | Dang ky Ly lich Tu phap | ✅ |
| Tu dong dien form | Lay thong tin tu VNeID | ✅ |
| Voice Recording | Ghi am giong noi (expo-av) | ✅ |
| Text-to-Speech | Doc phan hoi (expo-speech) | ✅ |
| Voice Navigation | Dieu huong bang giong noi | ✅ |
| Voice Form Fill | Dien form bang giong noi | ✅ |
| Mock AI | Demo khong can backend | ✅ |
| Kaggle Backend | AI backend that | ✅ |

---

## Cau truc du an

```
vneid-voice-demo/
├── App.jsx                 # Main app component
├── package.json            # Dependencies
├── app.json                # Expo config
├── api_integration.js      # Ket noi voi Kaggle backend
├── kaggle_notebook.py      # Code chay tren Kaggle
├── kaggle_backend.py       # Backend API (legacy)
├── KAGGLE_SETUP.md         # Huong dan Kaggle chi tiet
├── README.md               # File nay
└── assets/                 # Icons, splash screen
```

---

## Huong dan cai dat

### Yeu cau
- Node.js >= 18
- npm hoac yarn
- Expo CLI
- Dien thoai co app Expo Go

### Cai dat

```bash
# 1. Clone hoac di chuyen vao thu muc du an
cd "D:\laptrinh\AI\VNeID Voice demo\vneid-voice-demo"

# 2. Cai dat dependencies
npm install

# 3. Cai dat Expo CLI (neu chua co)
npm install -g expo-cli
```

---

## Chay demo

### Cach 1: Chay voi Mock AI (khong can backend)

```bash
# Chay Expo
npx expo start

# Hoac chi dinh platform
npx expo start --android
npx expo start --ios
```

Sau do:
1. Mo app **Expo Go** tren dien thoai
2. Scan QR code hien tren terminal
3. App se load va chay

### Cach 2: Chay voi Kaggle Backend (AI that)

1. Setup Kaggle backend (xem phan duoi)
2. Lay URL tu ngrok
3. Cap nhat `BACKEND_URL` trong `api_integration.js`
4. Chay app

---

## Setup Kaggle Backend

### Buoc 1: Tao Kaggle Account

1. Truy cap: https://www.kaggle.com
2. Dang ky tai khoan mien phi
3. Xac nhan email

### Buoc 2: Tao Notebook

1. Click **Create** > **New Notebook**
2. Dat ten: `vneid-voice-backend`
3. **Settings** > **Accelerator** > **GPU T4 x2**

### Buoc 3: Copy code vao cac Cell

#### Cell 1: Cai dat thu vien
```python
!pip install -q flask flask-cors pyngrok
!pip install -q openai-whisper
!pip install -q transformers accelerate
```

#### Cell 2: Import
```python
import os
import json
import re
import torch
import whisper
from flask import Flask, request, jsonify
from flask_cors import CORS
from threading import Thread

print(f"GPU: {torch.cuda.is_available()}")
```

#### Cell 3: Load Whisper
```python
print("Loading Whisper...")
whisper_model = whisper.load_model("medium")
print("Done!")
```

#### Cell 4: Logic xu ly
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

    if 'ly lich' in text_lower or 'tu phap' in text_lower:
        result["action"] = "navigate_lltp"
        result["response"] = "Da mo man hinh Ly lich Tu phap."
        result["understood"] = True
        return result

    for keyword, purpose in PURPOSE_MAPPING.items():
        if keyword in text_lower:
            result["data"]["muc_dich"] = purpose
            result["understood"] = True

    match = re.search(r'(\d+)\s*(ban|to)', text_lower)
    if match:
        result["data"]["so_ban"] = match.group(1)
        result["understood"] = True

    if result["understood"]:
        result["action"] = "fill_form"
        parts = []
        if result["data"].get("muc_dich"):
            parts.append(result["data"]["muc_dich"])
        if result["data"].get("so_ban"):
            parts.append(f"{result['data']['so_ban']} ban")
        result["response"] = f"Da ghi nhan: {', '.join(parts)}."
    else:
        result["response"] = "Xin loi, ban noi lai duoc khong?"

    return result
```

#### Cell 5: Flask server
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

def run():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

Thread(target=run, daemon=True).start()
print("Server running on port 5000")
```

#### Cell 6: Ngrok
```python
from pyngrok import ngrok

public_url = ngrok.connect(5000)
print("=" * 50)
print("BACKEND SAN SANG!")
print(f"URL: {public_url}")
print("=" * 50)
```

### Buoc 4: Lay URL

Sau khi chay Cell 6, copy URL dang:
```
https://xxxx-xx-xxx-xxx-xx.ngrok-free.app
```

---

## Ket noi App voi Backend

### Buoc 1: Mo file `api_integration.js`

```javascript
// Thay URL nay bang URL tu Kaggle
const BACKEND_URL = 'https://xxxx-xx-xxx-xxx-xx.ngrok-free.app';
```

### Buoc 2: Cap nhat App.jsx

Thay function `stopRecording`:

```javascript
const stopRecording = async () => {
  if (!recording) return;

  setIsListening(false);
  setIsProcessing(true);
  setAiMessage('Dang xu ly...');

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    // Goi API backend
    const formData = new FormData();
    formData.append('audio', {
      uri: uri,
      type: 'audio/wav',
      name: 'audio.wav',
    });

    const response = await fetch(`${BACKEND_URL}/process_voice`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      if (result.action === 'navigate_lltp') {
        setCurrentScreen('lltp');
      }
      if (result.data.muc_dich) {
        setFormData(prev => ({ ...prev, muc_dich: result.data.muc_dich }));
      }
      if (result.data.so_ban) {
        setFormData(prev => ({ ...prev, so_ban: result.data.so_ban }));
      }
      setAiMessage(result.response);
      speakText(result.response);
    }
  } catch (error) {
    setAiMessage('Co loi xay ra. Vui long thu lai.');
  }

  setIsProcessing(false);
};
```

---

## Cach su dung

### Trang chu

1. Nhan nut **micro do** o cuoi man hinh
2. Giu nut va noi: **"Toi muon lam ly lich tu phap"**
3. AI se tu dong chuyen sang man hinh LLTP

### Man hinh Ly lich Tu phap

#### Buoc 1-2: Xem thong tin
- Thong tin ca nhan da duoc tu dong dien tu VNeID
- Nhan **Tiep tuc** de sang buoc tiep

#### Buoc 3: Chon muc dich
- **Cach 1**: Nhan vao o chon va chon tu danh sach
- **Cach 2**: Nhan nut micro va noi:
  - "Muc dich xin viec"
  - "Muc dich du hoc, can 2 ban"
  - "Xin 3 ban de ket hon"

#### Buoc 4: Xac nhan
- Kiem tra thong tin
- Chon phuong thuc thanh toan
- Nhan **Thanh toan & Gui yeu cau**

### Cau lenh voice mau

| Lenh | Hanh dong |
|------|-----------|
| "Lam ly lich tu phap" | Mo man hinh LLTP |
| "Quay lai trang chu" | Ve trang chu |
| "Muc dich xin viec" | Chon muc dich |
| "Can 2 ban" | Chon so luong |
| "Xin viec can 3 ban" | Chon ca 2 |

---

## Screenshots

### Trang chu
```
+----------------------------------+
|  [V] VNeID                    🔔 |
+----------------------------------+
|  +----------------------------+  |
|  | ★ CHXHCN VIET NAM         |  |
|  | [👤]  NGUYEN VAN AN       |  |
|  |       012345678901    [QR]|  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | 🎙️ Tro ly Giong noi AI    |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | 📋 Cap Phieu LLTP      >  |  |
|  +----------------------------+  |
|                                  |
|  [📋] [🪪] [🏥] [🚗] [🏠] [...] |
|                                  |
|        [🎤 Nhan de noi]          |
|                                  |
|  [🏠] [📋] [💳] [👤]            |
+----------------------------------+
```

### Man hinh LLTP
```
+----------------------------------+
|  ← [V] Ly lich Tu phap        🔔 |
+----------------------------------+
|  (1)-----(2)-----(3)-----(4)     |
|   ●       ○       ○       ○      |
|                                  |
|  +----------------------------+  |
|  | 🤖 Tro ly AI              |  |
|  | Thong tin da duoc tu dong |  |
|  | dien tu VNeID...          |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | 👤 Thong tin ca nhan      |  |
|  | Ho ten: NGUYEN VAN AN  🔒 |  |
|  | CCCD: 012345678901     🔒 |  |
|  +----------------------------+  |
|                                  |
|           [Tiep tuc →]           |
|                                  |
|        [🎤 Nhan de noi]          |
+----------------------------------+
```

---

## Troubleshooting

### App khong load

```bash
# Xoa cache va chay lai
npx expo start -c
```

### Loi "Unable to resolve module"

```bash
# Xoa node_modules va cai lai
rm -rf node_modules
npm install
```

### Voice khong hoat dong

1. Kiem tra quyen micro trong Settings
2. Dam bao dien thoai co mic hoat dong
3. Thu trong moi truong yen tinh

### Kaggle loi "CUDA out of memory"

```python
# Dung model nho hon
whisper_model = whisper.load_model("small")
# hoac
whisper_model = whisper.load_model("base")
```

### Ngrok loi "Too many connections"

1. Tao tai khoan ngrok: https://ngrok.com
2. Lay authtoken tu dashboard
3. Them vao code:
```python
ngrok.set_auth_token("your_token_here")
```

### URL ngrok thay doi

- URL thay doi moi khi restart Kaggle
- Cap nhat URL moi trong `api_integration.js`
- Hoac dung ngrok authtoken de URL on dinh hon

---

## Gioi han

| Platform | Gioi han |
|----------|----------|
| Kaggle GPU | 30 gio/tuan |
| Kaggle Session | 12 gio lien tuc |
| Ngrok (free) | URL thay doi, co banner |
| Expo Go | Chi chay development |

---

## Phat trien tiep

- [ ] Them xac thuc nguoi dung
- [ ] Tich hop VNeID API that
- [ ] Thanh toan online
- [ ] Offline mode
- [ ] Ho tro nhieu giong vung mien
- [ ] Build production app

---

## Lien he

Neu can ho tro them:
- Tao issue tren GitHub
- Hoi trong conversation nay

---

## License

MIT License - Free to use and modify.
