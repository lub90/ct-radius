from .Config import Config
from .PasswordDatabase import PasswordDatabase
from churchtools import CtGroupManager, CtPersonManager

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

        # Ct person manager setup
        self.person_manager = CtPersonManager(
            self.config.basic.ct_server_url,
            self.config.basic.ct_api_user,
            self.config.basic.ct_api_user_pwd,
            self.config.basic.timeout
        )

    @property
    def pwd_db(self):
        # Setup the pwd database on each request to prevent long locking times of the file
        # Should not be too resource intensive
        # Yet, is bad for transaction based stuff, that we do not really have here
        return PasswordDatabase(self.config.basic.path_to_pwd_db, self.config.basic.ct_pwd_db_secret)
