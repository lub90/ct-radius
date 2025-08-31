import argparse
import sys
import logging
import random
from ctradius import CtPwdSyncProvider
import time

def main():
    parser = argparse.ArgumentParser(description="Add a new churchtools user to the radius password database.")
    parser.add_argument("user_id", type=int, help="Churchtools User ID (integer)")
    parser.add_argument("password", type=str, help="User's password")
    parser.add_argument("--config", required=True, type=str, help="Path to your ChurchTools config file")
    parser.add_argument("--env", required=False, type=str, help="Path to your .env file")

    args = parser.parse_args()


    app = CtPwdSyncProvider(config_path=args.config, env_file=args.env)
    app.login()
    app.add_user(args.user_id, args.password)

if __name__ == "__main__":
    main()
