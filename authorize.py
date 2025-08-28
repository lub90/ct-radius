import argparse
import sys
from CtAuthProvider import CtAuthProvider
from AuthenticationError import AuthenticationError

def main():
    parser = argparse.ArgumentParser(description="ChurchTools RADIUS Authenticator")
    parser.add_argument("--config", required=True, help="Path to your ChurchTools config file")
    parser.add_argument("--env", required=True, help="Path to your .env file")
    parser.add_argument("--username", required=True, help="Username for authentication")

    args = parser.parse_args()

    try:
        ct = CtAuthProvider(args.config, args.env)
        password, vlan_id = ct.authorize(args.username)

        # RADIUS-compatible output
        print(f"Cleartext-Password := {password}")
        print("Ct-Tunnel-Type := 13")
        print("Ct-Tunnel-Medium-Type := 6")
        print(f"Ct-Tunnel-Private-Group-Id := {vlan_id}")

        sys.exit(0)

    except AuthenticationError as e:
        print("Auth-Type := Reject", file=sys.stderr)
        print(f"# ChurchTools Authentication Error: {e}", file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print("Auth-Type := Reject", file=sys.stderr)
        print(f"# ChurchTools Internal Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
