

import re

def validate_username(username: str, max_length: int = 32) -> str:
    """
    Validates and sanitizes a RADIUS username.

    Parameters:
        username (str): The input username to validate.
        max_length (int): Maximum allowed length (default: 32).

    Returns:
        str: A cleaned and validated username.

    Raises:
        ValueError: If the username is invalid or contains disallowed characters.
    """

    if not isinstance(username, str):
        raise ValueError("Username must be a string.")

    # Strip leading/trailing whitespace
    username = username.strip()

    # Normalize Unicode (optional, but recommended)
    try:
        import unicodedata
        username = unicodedata.normalize("NFC", username)
    except ImportError:
        pass  # Skip normalization if module isn't available

    # Check length
    if not username:
        raise ValueError("Username cannot be empty.")
    if len(username) > max_length:
        raise ValueError(f"Username exceeds maximum length of {max_length} characters.")

    # Disallowed characters (NAS quirks or logging safety)
    disallowed = r"[\/#:\n\r\t\x00]"
    if re.search(disallowed, username):
        raise ValueError("Username contains disallowed characters (e.g. /, #, :, control chars).")

    return username
