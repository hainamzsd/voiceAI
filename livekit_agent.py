# VNeID Voice AI Agent - LiveKit Implementation
# Compatible with livekit-agents v1.3.x
#
# Setup:
# 1. pip install -r requirements.txt
# 2. Create .env.local with: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, CLAUDE_API_KEY, ELEVENLABS_API_KEY
# 3. Run: python livekit_agent.py dev

from dotenv import load_dotenv
import os
import json
import re
import asyncio
import anthropic

from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm, stt, tts, APIConnectOptions
from livekit.agents.voice import AgentSession, Agent, RunContext
from livekit.plugins import silero

# Custom plugins for local inference
from vieneu_tts_plugin import VieNeuTTS, create_vieneu_tts
from whisper_local_plugin import create_whisper_stt, WhisperLocalSTT, FasterWhisperSTT

load_dotenv(".env.local")

# ==========================================
# Configuration
# ==========================================

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")

# VieNeu-TTS Configuration
VIENEU_VOICE = os.getenv("VIENEU_VOICE", "Binh")
VIENEU_QUALITY = os.getenv("VIENEU_QUALITY", "fast")  # fast, balanced, best

# Whisper Local Configuration
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "vi")

# Initialize Claude
claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# Conversation state
conversation_history = []
MAX_HISTORY = 20

# Current context (updated by frontend)
current_user_context = {}
current_screen_context = {}
current_room = None

# ==========================================
# AI Functions
# ==========================================

def get_system_prompt():
    """Generate system prompt based on current context"""

    user_info = ""
    if current_user_context:
        user_info = f"""
THONG TIN USER (da co san, KHONG hoi lai):
- Ho ten: {current_user_context.get('hoTen', '')}
- CCCD: {current_user_context.get('cccd', '')}
- Ngay sinh: {current_user_context.get('ngaySinh', '')}
"""

    screen_info = ""
    if current_screen_context:
        screen_name = current_screen_context.get('screen_name', '')
        step = current_screen_context.get('current_step', 0)
        actions = current_screen_context.get('available_actions', [])
        filled_data = current_screen_context.get('filled_data', {})

        screen_info = f"""
MAN HINH HIEN TAI: {screen_name}
Buoc: {step}/4
Hanh dong kha dung: {', '.join(actions)}
Du lieu da dien: {json.dumps(filled_data, ensure_ascii=False) if filled_data else 'Chua co'}
"""

    user_name = "anh"
    if current_user_context.get('hoTen'):
        user_name = f"anh {current_user_context.get('hoTen', '').split()[-1]}"

    return f"""Ban la tro ly ao VNeID, ho tro nguoi dung lam thu tuc hanh chinh qua giong noi.

{user_info}
{screen_info}

CACH NOI:
- Xung "em", goi user la "{user_name}"
- Noi ngan gon, tu nhien, KHONG dung emoji
- Hoi 1 cau, doi tra loi

KHI CAN THUC HIEN HANH DONG, tra loi kem JSON o cuoi:
@@ACTION@@{{"action": "ten_action", "data": {{}}}}@@END@@

CAC ACTION:
- navigate_lltp: Mo form Ly lich tu phap
- navigate_home: Ve trang chu
- next_step: Chuyen buoc tiep theo
- prev_step: Quay lai buoc truoc
- fill_field: Dien thong tin vao form (data: muc_dich, so_ban, loai_phieu)
- submit: Gui yeu cau

VI DU:
User: "Em muon lam ly lich tu phap"
-> "Vang, em se mo form Ly lich tu phap cho anh nhe! @@ACTION@@{{"action": "navigate_lltp"}}@@END@@"

User: "Tiep theo di"
-> "Em chuyen sang buoc tiep theo nhe! @@ACTION@@{{"action": "next_step"}}@@END@@"
"""


async def process_with_claude(user_message: str) -> tuple[str, dict]:
    """Process message with Claude and extract response + action"""
    global conversation_history, current_room

    conversation_history.append({"role": "user", "content": user_message})
    if len(conversation_history) > MAX_HISTORY:
        conversation_history = conversation_history[-MAX_HISTORY:]

    try:
        response = claude_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=300,
            system=get_system_prompt(),
            messages=conversation_history
        )

        result = response.content[0].text
        conversation_history.append({"role": "assistant", "content": result})

        # Extract action if present
        action_data = {}
        match = re.search(r'@@ACTION@@(.+?)@@END@@', result, re.DOTALL)
        if match:
            try:
                action_data = json.loads(match.group(1).strip())
            except:
                pass

        # Clean response for speech
        clean_text = re.sub(r'@@ACTION@@.*?@@END@@', '', result, flags=re.DOTALL)
        clean_text = clean_text.strip()

        # Send action to frontend if present
        if action_data and current_room:
            try:
                await current_room.local_participant.publish_data(
                    json.dumps(action_data).encode(),
                    reliable=True
                )
                print(f"Action sent: {action_data}")
            except Exception as e:
                print(f"Error sending action: {e}")

        return clean_text, action_data

    except Exception as e:
        print(f"Claude Error: {e}")
        return "Xin loi, em gap loi. Anh thu lai nhe?", {}


# ==========================================
# Custom LLM for Claude
# ==========================================

class ClaudeLLM(llm.LLM):
    """Custom LLM wrapper for Claude API"""

    def __init__(self):
        super().__init__()

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        tools: list | None = None,
        conn_options: APIConnectOptions = APIConnectOptions(),
        parallel_tool_calls: bool | None = None,
        extra_body: dict | None = None,
    ) -> "ClaudeLLMStream":
        return ClaudeLLMStream(self, chat_ctx, conn_options)


class ClaudeLLMStream(llm.LLMStream):
    """Stream implementation for Claude responses"""

    def __init__(self, llm_instance: ClaudeLLM, chat_ctx: llm.ChatContext, conn_options: APIConnectOptions):
        super().__init__(llm_instance, chat_ctx=chat_ctx, tools=None, conn_options=conn_options)
        self._output_text = ""

    async def _run(self):
        # Get the last user message from chat context
        user_message = ""
        for msg in reversed(self._chat_ctx.items):
            if hasattr(msg, 'role') and msg.role == "user":
                if hasattr(msg, 'content'):
                    for content in msg.content:
                        if hasattr(content, 'text'):
                            user_message = content.text
                            break
                break

        if not user_message:
            return

        print(f"User said: {user_message}")

        # Process with Claude
        response_text, action_data = await process_with_claude(user_message)
        self._output_text = response_text

        print(f"Claude response: {response_text}")

        # Create request ID for this response
        request_id = f"claude-{id(self)}"

        # Yield the response as a chunk
        self._event_ch.send_nowait(
            llm.ChatChunk(
                request_id=request_id,
                choices=[
                    llm.Choice(
                        delta=llm.ChoiceDelta(
                            role="assistant",
                            content=response_text,
                        ),
                        index=0,
                    )
                ]
            )
        )


# ==========================================
# TTS Plugin Selection
# ==========================================

def get_tts_plugin():
    """Get TTS plugin - using VieNeu-TTS (Vietnamese neural TTS)"""
    try:
        print(f"Using VieNeu-TTS (voice={VIENEU_VOICE}, quality={VIENEU_QUALITY})")
        return create_vieneu_tts(
            voice=VIENEU_VOICE,
            temperature=1.0,
            top_k=50,
            quality=VIENEU_QUALITY,
        )
    except Exception as e:
        print(f"VieNeu-TTS error: {e}")

    # Fallback to OpenAI TTS if VieNeu fails
    if OPENAI_API_KEY:
        try:
            print("Fallback: Using OpenAI for TTS")
            return openai_plugin.TTS(voice="alloy")
        except Exception as e:
            print(f"OpenAI TTS error: {e}")

    return None


def get_stt_plugin():
    """Get STT plugin - using local Whisper"""
    try:
        print(f"Using Local Whisper for STT (model={WHISPER_MODEL}, lang={WHISPER_LANGUAGE})")
        return create_whisper_stt(
            model_size=WHISPER_MODEL,
            language=WHISPER_LANGUAGE,
            use_faster_whisper=True,  # Prefer faster-whisper for better performance
        )
    except Exception as e:
        print(f"Local Whisper STT error: {e}")
        import traceback
        traceback.print_exc()
    return None


# ==========================================
# Agent Entry Point
# ==========================================

async def entrypoint(ctx: JobContext):
    """Main agent entrypoint"""
    global current_user_context, current_screen_context, current_room

    # Wait for participant
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    current_room = ctx.room
    print(f"Agent connected to room: {ctx.room.name}")

    # Default context
    current_user_context = {
        "hoTen": "Nguyen Van A",
        "cccd": "012345678901",
        "ngaySinh": "01/01/1990",
    }

    current_screen_context = {
        "screen_name": "home",
        "current_step": 0,
        "available_actions": ["navigate_lltp"],
    }

    # Handle context updates from frontend
    @ctx.room.on("data_received")
    def on_data(data: rtc.DataPacket):
        global current_user_context, current_screen_context
        try:
            msg = json.loads(data.data.decode())
            if msg.get("type") == "update_context":
                if msg.get("user_context"):
                    current_user_context = msg["user_context"]
                if msg.get("screen_context"):
                    current_screen_context = msg["screen_context"]
                print(f"Context updated: screen={current_screen_context.get('screen_name')}")
        except Exception as e:
            print(f"Data parse error: {e}")

    # Get plugins
    tts_plugin = get_tts_plugin()
    stt_plugin = get_stt_plugin()

    if not tts_plugin:
        print("ERROR: No TTS plugin available!")
        print("Please set ELEVENLABS_API_KEY or OPENAI_API_KEY in .env.local")
        return

    if not stt_plugin:
        print("ERROR: No STT plugin available!")
        print("Please set ELEVENLABS_API_KEY or OPENAI_API_KEY in .env.local")
        return

    # Create Claude LLM
    claude_llm = ClaudeLLM()

    # Create agent session
    session = AgentSession(
        stt=stt_plugin,
        llm=claude_llm,
        tts=tts_plugin,
        vad=silero.VAD.load(),
    )

    # Create agent with instructions
    agent = Agent(instructions=get_system_prompt())

    # Start the session
    await session.start(
        agent=agent,
        room=ctx.room,
    )

    # Initial greeting
    await asyncio.sleep(1)
    await session.say(
        "Xin chao anh! Em la tro ly ao VNeID. Anh can em ho tro gi a?",
        allow_interruptions=True
    )

    print("Agent ready, waiting for user...")


# ==========================================
# Main
# ==========================================

if __name__ == "__main__":
    print("=" * 50)
    print("VNeID Voice AI Agent (Local)")
    print("=" * 50)
    print(f"Claude API: {'OK' if CLAUDE_API_KEY else 'MISSING'}")
    print(f"VieNeu-TTS: voice={VIENEU_VOICE}, quality={VIENEU_QUALITY}")
    print(f"Whisper STT: model={WHISPER_MODEL}, lang={WHISPER_LANGUAGE}")
    print("=" * 50)

    if not CLAUDE_API_KEY:
        print("\nERROR: CLAUDE_API_KEY not configured!")
        exit(1)

    print("\nStarting agent...")
    print("VieNeu-TTS model will be downloaded on first use (~500MB)")
    print("Whisper model will be downloaded on first use")
    print()

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        ),
    )
