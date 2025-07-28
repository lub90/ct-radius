import os
import yaml

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

    def __init__(self, config_path: str):
        super().__init__()
        self._load_yaml(config_path)
        self._merge_env_into_basic()
        self._validate_native_vars()
        self._build_all_wifi_access_groups()

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

        basic = self.basic
        vlans = self.vlans

        # Check required basic fields
        if "wifi_access_groups" not in basic or not basic.wifi_access_groups:
            raise ValueError("basic.wifi_access_groups must be present and non-empty.")

        if "include_assignment_groups_in_access_groups" not in basic:
            raise ValueError("Missing key: basic.include_assignment_groups_in_access_groups")

        if "requested_vlan_separator" not in basic:
            raise ValueError("Missing key: basic.requested_vlan_separator")

        if "timeout" not in basic:
            raise ValueError("Missing key: basic.timeout")

        if "path_to_pwd_db" not in basic:
            raise ValueError("Missing key: basic.path_to_pwd_db")

        if "username_field_name" not in basic:
            raise ValueError("Missing key: basic.username_field_name")

        # Check required vlans fields
        if "default_vlan" not in vlans:
            raise ValueError("Missing key: vlans.default_vlan")

        if "assignments" not in vlans:
            raise ValueError("Missing key: vlans.assignments")

        if "assignments_if_requested" not in vlans:
            raise ValueError("Missing key: vlans.assignments_if_requested")

        # Ensure assignments are dicts
        if not isinstance(vlans.assignments, dict):
            raise TypeError("vlans.assignments must be a dictionary.")

        if not isinstance(vlans.assignments_if_requested, dict):
            raise TypeError("vlans.assignments_if_requested must be a dictionary.")


    def _build_all_wifi_access_groups(self):
        basic = self.basic
        vlan_cfg = self.vlans

        wifi_group_ids = basic.wifi_access_groups

        if basic.get("include_assignment_groups_in_access_groups", False):
            extended_ids = set(wifi_group_ids)
            extended_ids.update(map(int, vlan_cfg.assignments.keys()))
            extended_ids.update(map(int, vlan_cfg.assignments_if_requested.keys()))
            basic["all_wifi_access_groups"] = list(sorted(extended_ids))
        else:
            basic["all_wifi_access_groups"] = wifi_group_ids

        # Reassign updated basic block
        self["basic"] = basic

