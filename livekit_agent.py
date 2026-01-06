# VNeID Voice AI Agent - LiveKit Implementation
# Real-time voice streaming with automatic turn detection
#
# Setup:
# 1. pip install "livekit-agents[silero,turn-detector]~=1.3" "livekit-plugins-noise-cancellation~=0.2" anthropic python-dotenv
# 2. Create .env.local with: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL
# 3. Run: python livekit_agent.py dev

from dotenv import load_dotenv
import os
import json
import re
import anthropic

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")

# ==========================================
# Configuration
# ==========================================

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "your-claude-api-key-here")

# Initialize Claude
claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# Conversation state
conversation_history = []
MAX_HISTORY = 20

# Current context (updated by frontend)
current_user_context = {}
current_screen_context = {}

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
        screen_desc = current_screen_context.get('screen_description', '')
        step = current_screen_context.get('current_step', 0)
        total = current_screen_context.get('total_steps', 1)
        actions = current_screen_context.get('available_actions', [])

        screen_info = f"""
SCREEN: {screen_name} - {screen_desc}
Buoc: {step}/{total}
Actions: {', '.join(actions)}
"""

    user_name = "anh"
    if current_user_context.get('hoTen'):
        user_name = f"anh {current_user_context.get('hoTen', '').split()[-1]}"

    return f"""Ban la tro ly ao VNeID, noi chuyen tu nhien nhu ban be.

{user_info}
{screen_info}

CACH NOI:
- Xung "em", goi user la "{user_name}"
- Ngan gon, tu nhien
- Hoi 1 cau, doi tra loi

Khi can action, tra loi kem JSON:
@@ACTION@@{{"action": "...", "data": {{}}}}@@END@@

Actions: navigate_lltp, navigate_home, next_step, prev_step, fill_field, submit
Data fields: muc_dich, so_ban, loai_phieu
"""


def process_with_claude(user_message: str) -> tuple[str, dict]:
    """Process message with Claude and extract response + action"""
    global conversation_history

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

        return clean_text, action_data

    except Exception as e:
        print(f"Claude Error: {e}")
        return "Xin loi, em gap loi. Anh thu lai nhe?", {}


# ==========================================
# VNeID Voice Assistant
# ==========================================

class VNeIDAssistant(Agent):
    """VNeID Voice AI Assistant"""

    def __init__(self):
        super().__init__(
            instructions="""Ban la tro ly ao VNeID, ho tro nguoi dung lam thu tuc hanh chinh.
            Xung "em", goi user la "anh".
            Noi ngan gon, tu nhien, khong dung emoji.
            Hoi tung cau mot, doi tra loi roi hoi tiep.""",
        )


# ==========================================
# Agent Entry Point
# ==========================================

async def entrypoint(ctx: agents.JobContext):
    """Main agent entrypoint"""
    global current_user_context, current_screen_context

    print(f"Agent connected to room: {ctx.room.name}")

    # Default context
    current_user_context = {
        "hoTen": "Nguyen Van A",
        "cccd": "012345678901",
        "ngaySinh": "01/01/1990",
    }

    current_screen_context = {
        "screen_name": "home",
        "screen_description": "Trang chu VNeID",
        "current_step": 0,
        "total_steps": 1,
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
                print(f"Context updated: {current_screen_context.get('screen_name')}")
        except Exception as e:
            print(f"Data error: {e}")

    # Create assistant
    assistant = VNeIDAssistant()

    # Create session with Vietnamese-friendly models
    # Note: You may need to adjust model IDs based on your LiveKit Cloud setup
    session = AgentSession(
        stt="deepgram/nova-2-general",      # Good multilingual STT
        llm="openai/gpt-4o-mini",            # Fast LLM
        tts="cartesia/sonic-multilingual",   # Vietnamese TTS support
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    # Custom message handler to use Claude instead of default LLM
    @session.on("user_message")
    async def on_user_message(message: str):
        print(f"User said: {message}")

        # Process with Claude
        response_text, action_data = process_with_claude(message)

        # Send action to frontend if present
        if action_data:
            await ctx.room.local_participant.publish_data(
                json.dumps(action_data).encode(),
                reliable=True
            )
            print(f"Action sent: {action_data}")

        # Return response for TTS
        return response_text

    # Start session
    await session.start(
        room=ctx.room,
        agent=assistant,
    )

    # Initial greeting
    await session.generate_reply(
        instructions="Chao user bang tieng Viet. Xung 'em', goi user la 'anh'. Hoi user can giup gi."
    )

    print("Agent ready, waiting for user...")


# ==========================================
# Main
# ==========================================

if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint),
    )
