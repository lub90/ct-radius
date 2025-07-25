import dbm
import base64
from cryptography.fernet import Fernet

class PasswordDatabase:
    def __init__(self, db_path, encryption_password):
        # Derive fixed-size key
        self.key = base64.urlsafe_b64encode(encryption_password.ljust(32).encode("utf-8")[:32])
        self.fernet = Fernet(self.key)
        self.db = dbm.open(db_path, 'c')  # Open once, reuse

    def __del__(self):
        # Ensure clean close when the object is deleted
        if self.db is not None:
            self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db is not None:
            self.db.close()

    def _to_key(self, user_id: int) -> bytes:
        if not isinstance(user_id, int):
            raise TypeError(f"user_id must be an int, got {type(user_id).__name__}")
        if user_id < 0:
            raise ValueError(f"The user_id must be a positive int, got {user_id}")
        return str(user_id).encode("utf-8")

    def _validate_password(self, password: str) -> None:
        if not isinstance(password, str):
            raise TypeError(f"Password must be a string, got {type(password).__name__}")
        if not password or len(password) < 8:
            raise ValueError("Password cannot be empty and must be at least 8 characters long.")


    def containsUser(self, user_id: int) -> bool:
        return self._to_key(user_id) in self.db

    def getPwd(self, user_id: int) -> str:
        key = self._to_key(user_id)
        if key not in self.db:
            raise KeyError(f"User ID {user_id} not found.")
        encrypted = self.db[key]
        decrypted = self.fernet.decrypt(encrypted)
        return decrypted.decode("utf-8")

    def setPwd(self, user_id: int, password: str) -> None:
        self._validate_password(password)
        key = self._to_key(user_id)
        encrypted = self.fernet.encrypt(password.encode("utf-8"))
        self.db[key] = encrypted

    def update(self, user_id: int, password: str) -> None:
        self._validate_password(password)
        key = self._to_key(user_id)
        if key not in self.db:
            raise KeyError(f"Cannot update password: User ID {user_id} not found.")
        encrypted = self.fernet.encrypt(password.encode("utf-8"))
        self.db[key] = encrypted

    def deleteUser(self, user_id: int) -> None:
        key = self._to_key(user_id)
        if key in self.db:
            del self.db[key]
