# VNeID Voice AI - LiveKit Setup Guide

Hướng dẫn setup LiveKit cho real-time voice streaming.

## Tổng quan

LiveKit cung cấp:
- Real-time audio streaming (như Discord/Zoom)
- Automatic Voice Activity Detection (VAD)
- Turn detection - tự động biết khi user nói xong
- Noise cancellation
- Low latency

## Yêu cầu

1. **LiveKit Cloud Account** (free tier available)
2. **Expo Development Build** (không dùng Expo Go)
3. **Python 3.10+** cho agent

## Các bước setup

### Bước 1: Tạo LiveKit Cloud Account

1. Đăng ký tại: https://cloud.livekit.io/
2. Tạo project mới
3. Copy API Key và API Secret

### Bước 2: Install LiveKit CLI

**macOS:**
```bash
brew install livekit-cli
```

**Windows:**
```bash
winget install LiveKit.LiveKitCLI
```

**Linux:**
```bash
curl -sSL https://get.livekit.io/cli | bash
```

### Bước 3: Link project

```bash
lk cloud auth
```

### Bước 4: Setup Agent (Backend)

1. Cài dependencies:
```bash
pip install "livekit-agents[silero,turn-detector]~=1.3" \
            anthropic python-dotenv requests
```

2. Tạo file `.env.local`:
```bash
lk app env -w
```

3. Thêm API keys:
```env
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
CLAUDE_API_KEY=sk-ant-xxx
ELEVENLABS_API_KEY=sk_xxx
```

4. Chạy agent:
```bash
python livekit_agent.py dev
```

### Bước 5: Setup React Native App

1. Install dependencies:
```bash
npm install
```

2. Build development client:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for Android
eas build --profile development --platform android

# Or build locally
npx expo run:android
```

3. Cập nhật `AppLiveKit.jsx`:
```javascript
const LIVEKIT_URL = 'wss://your-project.livekit.cloud';
```

4. Tạo token server hoặc dùng LiveKit's token generator.

### Bước 6: Chạy app

1. Start agent:
```bash
python livekit_agent.py dev
```

2. Start app:
```bash
npm run android
```

## Cấu trúc files

```
vneid-voice-demo/
├── livekit_agent.py          # LiveKit Agent (Python backend)
├── AppLiveKit.jsx            # React Native app với LiveKit
├── src/
│   └── services/
│       └── liveKitService.js # LiveKit client service
├── .env.local                # Environment variables
└── app.json                  # Expo config với LiveKit plugins
```

## So sánh: Recording vs LiveKit

| Feature | Recording (cũ) | LiveKit |
|---------|---------------|---------|
| Latency | 2-3 giây | < 500ms |
| Turn detection | Manual/Silence | Automatic |
| Audio quality | Depends on codec | WebRTC optimized |
| Continuous | No | Yes |
| Complexity | Simple | Medium |

## Troubleshooting

### "Cannot connect to LiveKit"
- Kiểm tra LIVEKIT_URL trong app
- Kiểm tra agent đang chạy
- Kiểm tra network permissions

### "No audio from agent"
- Kiểm tra TTS API keys
- Kiểm tra agent logs

### "Build fails"
- Expo Go không hỗ trợ LiveKit
- Cần build development client

## Fallback: Dùng recording mode

Nếu không muốn setup LiveKit, có thể dùng recording mode:

1. Đổi `App.jsx` import từ file gốc (không phải AppLiveKit)
2. Chạy backend cũ: `kaggle_backend_fixed.py`

## Resources

- LiveKit Docs: https://docs.livekit.io/
- LiveKit React Native: https://docs.livekit.io/realtime/client-sdks/react-native/
- Agents Docs: https://docs.livekit.io/agents/
