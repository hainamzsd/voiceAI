# Simple LiveKit Token Server for Development
# Run: python token_server.py
# Then the app can fetch tokens from http://localhost:3001/token

from http.server import HTTPServer, BaseHTTPRequestHandler
from livekit import api
from dotenv import load_dotenv
import os
import json
import urllib.parse
import sys

load_dotenv(".env.local")

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://dang-7j9lholr.livekit.cloud")
PORT = int(os.getenv("TOKEN_SERVER_PORT", "3001"))

class TokenHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        """Generate and return a LiveKit token"""
        # Parse query params
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        # Get room name and identity from params or use defaults
        room_name = params.get("room", ["vneid-voice"])[0]
        identity = params.get("identity", ["mobile-user"])[0]

        try:
            # Create token
            token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            token.identity = identity
            token.name = identity

            # Grant permissions
            grant = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
            token.video_grants = grant

            jwt_token = token.to_jwt()

            # Send response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                "token": jwt_token,
                "url": LIVEKIT_URL,
                "room": room_name,
                "identity": identity,
            }
            self.wfile.write(json.dumps(response).encode())
            print(f"Token generated for {identity} in room {room_name}")

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
            print(f"Error: {e}")

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

if __name__ == "__main__":
    print("=" * 50)
    print("LiveKit Token Server")
    print("=" * 50)

    # Validate configuration
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        print("ERROR: Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in .env.local")
        sys.exit(1)

    print(f"API Key: {LIVEKIT_API_KEY[:10]}...")
    print(f"LiveKit URL: {LIVEKIT_URL}")
    print(f"Server Port: {PORT}")
    print("=" * 50)
    print(f"Token endpoint: http://localhost:{PORT}/token")
    print(f"Example: http://localhost:{PORT}/token?room=vneid-voice&identity=user123")
    print("=" * 50)
    print("Server started. Press Ctrl+C to stop.")
    print()

    try:
        server = HTTPServer(("0.0.0.0", PORT), TokenHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
