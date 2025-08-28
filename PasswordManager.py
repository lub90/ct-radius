from RadiusRelevantApp import RadiusRelevantApp

class PasswordManager(RadiusRelevantApp):
    """
    High-level interface for managing user passwords.
    Inherits configuration and password DB setup from RadiusRelevantApp.
    """

    def __init__(self, config_path: str, env_file=None):
        """
        Initializes PasswordManager by forwarding parameters to RadiusRelevantApp.
        """
        super().__init__(config_path, env_file)

    def user_exists(self, user_id: int) -> bool:
        """
        Checks if a user ID exists in the password database.
        """
        return self.pwd_db.containsUser(user_id)

    def list_all_users(self) -> list[int]:
        """
        Returns a list of all user IDs stored in the password database.

        Returns:
            list[int]: List of user IDs.
        """
        return [int(user_id.decode("utf-8")) for user_id in self.pwd_db.db.keys()]


    def add_user(self, user_id: int, password: str) -> None:
        """
        Adds a new user with the given password.
        Raises KeyError if the user already exists.
        """
        if self.user_exists(user_id):
            raise KeyError(f"User ID {user_id} already exists.")
        self.pwd_db.setPwd(user_id, password)

    def update_user(self, user_id: int, password: str) -> None:
        """
        Updates the password for an existing user.
        """
        self.pwd_db.update(user_id, password)

    def delete_user(self, user_id: int) -> None:
        """
        Deletes the user from the password database.
        """
        self.pwd_db.deleteUser(user_id)
