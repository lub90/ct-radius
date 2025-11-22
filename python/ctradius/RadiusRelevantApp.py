from .Config import Config
from .PasswordDatabase import PasswordDatabase
from churchtools import CtGroupManager, CtPersonManager, ChurchtoolsClient

class RadiusRelevantApp:
    def __init__(self, config_path: str, env_file=None):
        self.config = Config(config_path, env_file)

        # The churchtools client
        self._churchtoolsClient = ChurchtoolsClient(
            self.config.basic.ct_server_url,
            self.config.basic.ct_api_user,
            self.config.basic.ct_api_user_pwd,
            self.config.basic.timeout
        )

        # Ct group manager setup
        self._group_manager = CtGroupManager(self._churchtoolsClient)

        # Ct person manager setup
        self._person_manager = CtPersonManager(self._churchtoolsClient)

        # The password database
        self._pwd_db = PasswordDatabase(self._churchtoolsClient, self.config.basic.path_to_private_decryption_key, self.config.basic.ct_private_decryption_key_pwd)

    @property
    def pwd_db(self):
        return self._pwd_db

    @property
    def group_manager(self):
        return self._group_manager
    
    @property
    def person_manager(self):
        return self._person_manager

    @property
    def churchtoolsClient(self):
        return self._churchtoolsClient
