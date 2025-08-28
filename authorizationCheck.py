import argparse
import sys
import types
from dotenv import load_dotenv

# --- Mock radiusd module ---
sys.modules["radiusd"] = types.SimpleNamespace(
    RLM_MODULE_OK=0,
    RLM_MODULE_FAIL=1,
    L_INFO=1,
    L_ERR=2,
    radlog=lambda level, msg: print(f"[radiusd log level {level}] {msg}")
)

from authorize import authorize

def main():
    parser = argparse.ArgumentParser(
        description="Run a manual authorization check using authorize.py"
    )
    parser.add_argument("username", type=str, help="Username to authorize")
    parser.add_argument("config_path", type=str, help="Path to ct config file")
    parser.add_argument("env_path", type=str, help="Path to ct .env file")

    args = parser.parse_args()

    # Prepare RADIUS-like packet dictionary
    p = {
        "User-Name": args.username,
        "Ct-Config-Path": args.config_path,
        "Ct-Env-Path": args.env_path
    }

    # Run authorization
    try:
        result = authorize(p)
        print(f"\n✅ Authorization result: {result}")
        print("📦 Packet contents after authorization:")
        for key, value in p.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"\n❌ Authorization failed: {e}")

if __name__ == "__main__":
    main()
