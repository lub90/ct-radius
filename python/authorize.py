import argparse
import sys
import logging
from ctradius import CtAuthProvider, AuthenticationError

def main():

    parser = argparse.ArgumentParser(description="ChurchTools RADIUS Authenticator")
    parser.add_argument("--log", required=False, type=str, help="Path to your log file")
    parser.add_argument("--config", required=True, type=str, help="Path to your ChurchTools config file")
    parser.add_argument("--env", required=False, type=str, help="Path to your .env file")
    parser.add_argument("--username", required=True, type=str, help="Username for authentication")


    try:
        args = parser.parse_args()
    except Exception as e:
        print("Auth-Type := Reject")
        # We need to print directly, because logging module has not been setup yet...
        logging.error(f"Internal Error: {e}")
        sys.exit(1)


    if args.log:
        logging.basicConfig(
            filename=args.log,
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    try:
        ct = CtAuthProvider(args.config, args.env)
        password, vlan_id = ct.authorize(args.username)

        # RADIUS-compatible output
        print(f"Cleartext-Password := {password}")
        print("Ct-Tunnel-Type := 13")
        print("Ct-Tunnel-Medium-Type := 6")
        print(f"Ct-Tunnel-Private-Group-Id := {vlan_id}")

        logging.info(f"Successfully authorized {args.username} for VLAN {vlan_id}.")

        sys.exit(0)

    except AuthenticationError as e:
        print("Auth-Type := Reject")
        logging.warning(f"Authentication Error: {e}")
        sys.exit(1)

    except Exception as e:
        print("Auth-Type := Reject")
        logging.error(f"Internal Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
