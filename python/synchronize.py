import argparse
import sys
import logging
import random
from ctradius import CtPwdSyncProvider
import time

def main():
    parser = argparse.ArgumentParser(description="")
    parser.add_argument("--log", required=False, type=str, help="Path to your log file")
    parser.add_argument("--config", required=True, type=str, help="Path to your ChurchTools config file")
    parser.add_argument("--env", required=False, type=str, help="Path to your .env file")
    parser.add_argument("--interval", type=int, default=15, help="Sleep interval in seconds between sync runs")


    try:
        args = parser.parse_args()
    except Exception as e:
        print("Auth-Type := Reject")
        # We need to print directly, because logging module has not been setup yet...
        print(f"Internal Error: {e}")
        sys.exit(1)


    if args.log:
        logging.basicConfig(
            filename=args.log,
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )



    # Setup is finished, now run the real stuff here

    run = True

    while True:
        try:
            # Sync
            app = CtPwdSyncProvider(config_path=args.config, env_file=args.env)
            app.login()
            app.sync()

            # Wait for a certain time before starting the next sync part
            time.sleep(args.interval)
        
        except Exception as e:
            logging.error(f"Internal Error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
