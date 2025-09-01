import os
import dbm
import base64
import string
from cryptography.fernet import Fernet
import time

class PasswordDatabase:
    """
    A simple password storage system using DBM and symmetric encryption.
    Stores encrypted passwords keyed by user ID.
    """

    MIN_PASSWORD_LENGTH = 8
    ALLOWED_CHARS = (
        string.ascii_letters + string.digits +
        "!@$%&*-_+=?."
    )

    def open(path, mode="c", timeout=5.0, interval=0.05):
        """
        Attempts to open a DBM file with retries.
        If the file is temporarily unavailable (e.g. locked by another process),
        it waits and retries until the timeout is reached.

        Parameters:
            path (str): Path to the DBM file.
            mode (str): Mode for opening the DBM file ('c' = create if needed).
            timeout (float): Maximum time to wait in seconds.
            interval (float): Time to wait between retries in seconds.

        Returns:
            dbm object if successful.

        Raises:
            TimeoutError: If the file could not be opened within the timeout.
        """
        start_time = time.time()
        while True:
            try:
                db = dbm.open(path, mode)
                return db  # Successfully opened
            except (OSError, BlockingIOError):  # Backend-dependent errors
                if time.time() - start_time > timeout:
                    raise TimeoutError(f"Failed to open DBM file '{path}' within {timeout} seconds.")
                time.sleep(interval)  # Wait before retrying


    def __init__(self, db_path, encryption_password, open_timeout=5.0, open_interval=0.05):
        """
        Initializes the PasswordDatabase.

        Args:
            db_path (str): Path to the DBM database file.
            encryption_password (str): Password used to derive the encryption key.
        """
        # Pad/truncate password to 32 bytes and encode as Fernet key
        self.key = base64.urlsafe_b64encode(encryption_password.ljust(32).encode("utf-8")[:32])
        self.fernet = Fernet(self.key)
        # Take care of the home use sign ~
        db_path = os.path.expanduser(db_path)
        self.db = PasswordDatabase.open(db_path, mode='c', timeout=open_timeout, interval=open_interval)  # Open/create DB file

    def __del__(self):
        """
        Ensures database is closed when the instance is destroyed.
        """
        if hasattr(self, "db") and (self.db is not None):
            self.db.close()

    def __enter__(self):
        """
        Enables context manager support.
        Returns:
            self
        """
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Closes the database upon exiting context manager.
        """
        if self.db is not None:
            self.db.close()

    def _to_key(self, user_id: int) -> bytes:
        """
        Converts user ID to byte key for DB access.

        Args:
            user_id (int): Numeric user ID.

        Returns:
            bytes: Encoded user ID key.

        Raises:
            TypeError: If user_id is not an integer.
            ValueError: If user_id is negative.
        """
        if not isinstance(user_id, int):
            raise TypeError(f"user_id must be an int, got {type(user_id).__name__}")
        if user_id < 0:
            raise ValueError(f"The user_id must be a positive int, got {user_id}")
        return str(user_id).encode("utf-8")

    def _validate_password(self, password: str) -> None:
        """
        Validates password format against length and character set.

        Args:
            password (str): Password to validate.

        Raises:
            TypeError: If password is not a string.
            ValueError: If password is too short or contains disallowed characters.
        """
        if not isinstance(password, str):
            raise TypeError(f"Password must be a string, got {type(password).__name__}")
        if len(password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {self.MIN_PASSWORD_LENGTH} characters long.")
        if not all(char in self.ALLOWED_CHARS for char in password):
            raise ValueError("Password contains invalid characters.")

    def containsUser(self, user_id: int) -> bool:
        """
        Checks if a user ID exists in the database.

        Args:
            user_id (int): User identifier.

        Returns:
            bool: True if user exists, False otherwise.
        """
        return self._to_key(user_id) in self.db

    def getPwd(self, user_id: int) -> str:
        """
        Retrieves the decrypted password for the specified user.

        Args:
            user_id (int): User identifier.

        Returns:
            str: Decrypted password.

        Raises:
            KeyError: If the user ID does not exist.
        """
        key = self._to_key(user_id)
        if key not in self.db:
            raise KeyError(f"User ID {user_id} not found.")
        encrypted = self.db[key]
        decrypted = self.fernet.decrypt(encrypted)
        return decrypted.decode("utf-8")

    def setPwd(self, user_id: int, password: str) -> None:
        """
        Stores a new encrypted password for a user.

        Args:
            user_id (int): User identifier.
            password (str): Password to store.

        Raises:
            TypeError, ValueError: If inputs are invalid.
        """
        self._validate_password(password)
        key = self._to_key(user_id)
        encrypted = self.fernet.encrypt(password.encode("utf-8"))
        self.db[key] = encrypted

    def update(self, user_id: int, password: str) -> None:
        """
        Updates the password for an existing user.

        Args:
            user_id (int): User identifier.
            password (str): New password to store.

        Raises:
            TypeError, ValueError: If inputs are invalid.
            KeyError: If user does not exist.
        """
        self._validate_password(password)
        key = self._to_key(user_id)
        if key not in self.db:
            raise KeyError(f"Cannot update password: User ID {user_id} not found.")
        encrypted = self.fernet.encrypt(password.encode("utf-8"))
        self.db[key] = encrypted

    def deleteUser(self, user_id: int) -> None:
        """
        Deletes the password entry for a user.

        Args:
            user_id (int): User identifier.
        """
        key = self._to_key(user_id)
        if key in self.db:
            del self.db[key]

    def list_all_users(self) -> list[int]:
        """
        Returns a list of all user IDs stored in the password database.

        Returns:
            list[int]: List of user IDs.
        """
        return [int(user_id.decode("utf-8")) for user_id in self.db.keys()]
