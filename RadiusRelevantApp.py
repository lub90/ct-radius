from Config import Config
from PasswordDatabase import PasswordDatabase
from CtGroupManager import CtGroupManager

class RadiusRelevantApp:
    def __init__(self, config_path: str, env_file=None):
        self.config = Config(config_path, env_file)

        # Ct group manager setup
        self.group_manager = CtGroupManager(
            self.config.basic.ct_server_url,
            self.config.basic.ct_api_user,
            self.config.basic.ct_api_user_pwd,
            self.config.basic.timeout
        )

        # Password database setup
        self.pwd_db = PasswordDatabase(self.config.basic.path_to_pwd_db, self.config.basic.pwd_db_secret)
