import argparse
from PasswordManager import PasswordManager

def main():
    parser = argparse.ArgumentParser(
        description="Add a new churchtools user to the radius password database."
    )
    parser.add_argument("user_id", type=int, help="User ID (integer)")
    parser.add_argument("password", type=str, help="User's password")
    parser.add_argument("config_file", type=str, help="Path to ct-radius config file")
    parser.add_argument("env_file", type=str, help="Path to ctr-radius environment file")

    args = parser.parse_args()

    manager = PasswordManager(args.config_file, args.env_file)
    manager.add_user(args.user_id, args.password)
    print(f"User ID {args.user_id} added successfully.")

if __name__ == "__main__":
    main()
