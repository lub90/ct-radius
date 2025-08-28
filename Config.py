import os
import yaml

from types import SimpleNamespace
from PasswordDatabase import PasswordDatabase

class AttrDict(dict):
    def __getattr__(self, item):
        try:
            value = self[item]
            if isinstance(value, dict):
                return AttrDict(value)
            return value
        except KeyError:
            raise AttributeError(f"{item} not found in config")

    def __setattr__(self, key, value):
        self[key] = value


class Config(AttrDict):
    ENV_KEYS = [
        "CT_SERVER_URL",
        "CT_API_USER",
        "CT_API_USER_PWD",
        "PWD_DB_SECRET"
    ]

    def __init__(self, config_path: str, env_file = None):
        super().__init__()

        if env_file:
            from dotenv import load_dotenv
            if not os.path.isfile(env_file):
                raise FileNotFoundError(f"Environment file not found: {env_file}")
            load_dotenv(dotenv_path=env_file)

        self._load_yaml(config_path)
        self._merge_env_into_basic()
        self._validate_native_vars()
        self._build_all_wifi_access_groups()


    def getCommunicationConfigFor(self, person_id):
        result = SimpleNamespace()
        result.pwd_display_time = self.communication.pwd_display_time
        result.reset_command = self.communication.reset_command
        result.auto_reset = self.communication.auto_reset
        result.chat_room_id = None

        if person_id in self.communication.custom_settings:
            result.__dict__.update(self.communication.custom_settings[person_id].__dict__)

        return result


    def _load_yaml(self, path: str):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Config file not found: {path}")
        with open(path, "r") as f:
            yaml_data = yaml.safe_load(f)
        self.update(yaml_data)

    def _merge_env_into_basic(self):
        basic = self.get("basic", {})
        for key in self.ENV_KEYS:
            value = os.environ.get(key)
            if value:
                basic[key.lower()] = value
        self["basic"] = basic

    def _validate_native_vars(self):
        # Check environment variables
        missing_env = [key for key in self.ENV_KEYS if key.lower() not in self.basic]
        if missing_env:
            raise OSError(
                f"Missing required environment variables: {', '.join(missing_env)}"
            )

        if "basic" not in self or not self.basic:
            raise ValueError("basic must be present and non-empty.")

        if "vlans" not in self or not self.vlans:
            raise ValueError("vlans must be present and non-empty.")

        if "communication" not in self or not self.vlans:
            raise ValueError("communication must be present and non-empty.")

        basic = self.basic
        vlans = self.vlans
        communication = self.communication

        # Check required basic fields
        if "wifi_access_groups" not in basic or not basic.wifi_access_groups:
            raise ValueError("basic.wifi_access_groups must be present and non-empty.")

        if not all(isinstance(k, int) for k in self.basic.wifi_access_groups):
            raise ValueError("basic.wifi_access_groups should only contain integers")

        if "include_assignment_groups_in_access_groups" not in basic:
            raise ValueError("Missing key: basic.include_assignment_groups_in_access_groups")

        if not isinstance(self.basic.include_assignment_groups_in_access_groups, bool):
            raise TypeError("basic.include_assignment_groups_in_access_groups mus be a boolean")

        if "vlan_separator" not in basic:
            raise ValueError("Missing key: basic.vlan_separator")

        if "timeout" not in basic:
            raise ValueError("Missing key: basic.timeout")

        if not isinstance(self.basic.timeout, int):
            raise TypeError("basic.timeout must be an integer")

        if self.basic.timeout < 1:
            raise ValueError("basic.timeout must be greater than 0")

        if "path_to_pwd_db" not in basic:
            raise ValueError("Missing key: basic.path_to_pwd_db")

        if "username_field_name" not in basic:
            raise ValueError("Missing key: basic.username_field_name")

        if "pwd_length" not in basic:
            raise ValueError("Missing key: basic.pwd_length")

        if not isinstance(self.basic.pwd_length, int):
            raise TypeError("basic.pwd_length must be of type integer")

        if self.basic.pwd_length < PasswordDatabase.MIN_PASSWORD_LENGTH:
            raise ValueError(f"basic.pwd_length must be greater or equal to {PasswordDatabase.MIN_PASSWORD_LENGTH}")

        # Check required vlans fields
        if "default_vlan" not in vlans:
            raise ValueError("Missing key: vlans.default_vlan")

        if not isinstance(self.vlans.default_vlan, int):
            raise TypeError("vlans.default_vlan must be an integer")

        if self.vlans.default_vlan < 0:
            raise ValueError("vlans.default_vlan must be greater than or equal to 0")

        if "assignments" not in vlans:
            raise ValueError("Missing key: vlans.assignments")

        if "assignments_if_requested" not in vlans:
            raise ValueError("Missing key: vlans.assignments_if_requested")

        # Ensure assignments are dicts
        if not isinstance(vlans.assignments, dict):
            raise TypeError("vlans.assignments must be a dictionary.")

        if not isinstance(vlans.assignments_if_requested, dict):
            raise TypeError("vlans.assignments_if_requested must be a dictionary.")

        # Ensure assignments are dicts of integers to integeres
        if not all(isinstance(k, int) and isinstance(v, int) for k, v in self.vlans.assignments.items()):
            raise TypeError("vlans.assignments are only allowed to be mappings of integers to integers!")

        if not all(isinstance(k, int) and isinstance(v, int) for k, v in self.vlans.assignments_if_requested.items()):
            raise TypeError("vlans.assignments_if_requested are only allowed to be mappings of integers to integers!")

        # Ensure no negative vlan ids
        if any(v < 0 for v in self.vlans.assignments.values()):
            raise ValueError("The vlan ids for vlans.assignments are only allowed to be equalt to or greather than 0")

        if any(v < 0 for v in self.vlans.assignments_if_requested.values()):
            raise ValueError("The vlan ids for vlans.assignments_if_requested are only allowed to be equalt to or greather than 0")

        if "server_url" not in communication:
            raise ValueError("Missing key: communication.server_url")

        if not isinstance(self.communication.server_url, str):
            raise TypeError("communication.server_url must be a string")

        if "language" not in communication:
            raise ValueError("Missing key: communication.language")

        if not isinstance(self.communication.language, str):
            raise TypeError("communication.language must be a string")

        if "pwd_display_time" not in communication:
            raise ValueError("Missing key: communication.pwd_display_time")

        if not isinstance(self.communication.pwd_display_time, int):
            raise TypeError("communication.pwd_display_time must be an integer")

        if "reset_command" not in communication:
            raise ValueError("Missing key: communication.reset_command")

        if not isinstance(self.communication.reset_command, str):
            raise TypeError("communication.reset_command must be a string")

        if "auto_reset" not in communication:
            raise ValueError("communication.auto_reset must be set")

        if not isinstance(self.communication.auto_reset, int):
            raise TypeError("communication.auto_reset must be an integer")

        if "custom_settings" in communication:
            for custom_setting_id, custom_setting in communication.custom_settings.items():
                self._validate_custom_communication_setting(custom_setting_id, custom_setting)

    def _validate_custom_communication_setting(self, custom_setting_id, custom_setting):
        if (not isinstance(custom_setting_id, int)) or (custom_setting_id < 0):
            raise TypeError("The key for custom settings in the communication part must be of type integer and greater than/equal to 0, representing a ChurchTools person id.")

        if ("pwd_display_time" in custom_setting) and not isinstance(custom_setting["pwd_display_time"], int):
            raise TypeError("custom_setting.pwd_display_time must be an integer")

        if ("reset_command" in custom_setting) and not isinstance(custom_setting["reset_command"], str):
            raise TypeError("custom_setting.reset_command must be a string")

        if ("chat_room_id" in custom_setting) and not isinstance(custom_setting["chat_room_id"], str):
            raise TypeError("custom_setting.chat_room_id must be a string")

        if ("auto_reset"in custom_setting) and not isinstance(custom_setting["auto_reset"], int):
            raise TypeError("custom_setting.auto_reset must be an integer")

    def _build_all_wifi_access_groups(self):
        basic = self.basic
        vlan_cfg = self.vlans

        wifi_group_ids = basic.wifi_access_groups

        if basic.get("include_assignment_groups_in_access_groups"):
            extended_ids = set(wifi_group_ids)
            extended_ids.update(map(int, vlan_cfg.assignments.keys()))
            extended_ids.update(map(int, vlan_cfg.assignments_if_requested.keys()))
            basic["all_wifi_access_groups"] = list(sorted(extended_ids))
        else:
            basic["all_wifi_access_groups"] = wifi_group_ids

        # Reassign updated basic block
        self["basic"] = basic

