import os
import yaml
import requests
import radiusd
from PasswordDatabase import PasswordDatabase
from CtGroupManager import CtGroupManager

from AuthenticationError import AuthenticationError

class CtAuthProvider:
    def __init__(self, config_path):
        with open(config_path, "r") as f:
            cfg = yaml.safe_load(f)

        basic = cfg["basic"]
        self.vlan_separator = basic["requested_vlan_separator"]
        self.username_field_name = basic.get("username_field_name")

        self.group_manager = CtGroupManager(
            os.environ.get("CTRADIUS_RADIUS_BASE_URL"),
            os.environ.get("CTRADIUS_API_USER"),
            os.environ.get("CTRADIUS_API_USER_PWD"),
            basic.get("timeout", 5)
        )

        vlans = cfg["vlans"]
        self.default_vlan = vlans["default_vlan"]
        self.assignments = {int(k): v for k, v in vlans["assignments"].items()}
        self.assignments_if_requested = {int(k): v for k, v in vlans["assignments_if_requested"].items()}

        wifi_group_ids = basic["wifi_access_groups"]
        # Check flag to optionally extend with VLAN assignment group IDs
        if basic.get("include_assignment_groups_in_access_groups", False):
            extended_ids = set(wifi_group_ids)  # Start with configured ones
            extended_ids.update(self.assignments.keys())
            extended_ids.update(self.assignments_if_requested.keys())
            self.wifi_group_ids = list(sorted(extended_ids))
        else:
            self.wifi_group_ids = wifi_group_ids

        # Password database setup
        db_path = os.path.expanduser(basic["path_to_pwd_db"])
        pwd_db_secret = os.environ.get("CTRADIUS_PWD_DB_SECRET")
        self.pwd_db = PasswordDatabase(db_path, pwd_db_secret)

        self.session = requests.Session()

    def _cleanup_and_check_username(self, username):
        if not isinstance(username, str):
            raise ValueError(f"Username must be a string, got {type(username).__name__} instead!")

        # Remove leading and trailing whitespace, convert to lowercase
        username = username.strip().lower()

        if not username:
            raise ValueError("Username is empty!")
        
        return username

    def authorize(self, raw_username):
        self.group_manager.login()

        username, requested_vlan = self.split_username(raw_username)
        ct_person_id = self.get_person_id(username)
        password = self.get_password(ct_person_id)
        assigned_vlan = self.get_vlan(ct_person_id, requested_vlan)

        if not password:
            raise AuthenticationError(f"Cannot find password for user {username}!")
        
        if assigned_vlan is None:
            raise AuthenticationError(f"VLAN assignment failed for {username}!")

        return password, assigned_vlan

    def get_password(self, person_id):
        # Retrieve the password from the PasswordDatabase
        try:
            password = self.pwd_db.getPwd(person_id)
        except KeyError:
            raise AuthenticationError(f"Cannot find password for user id {person_id}!")

        if not password:
            raise ValueError(f"Password for user id {person_id} is empty!")
    
        return password

    def split_username(self, raw_username):
        if self.vlan_separator in raw_username:
            base, vlan_str = raw_username.rsplit(self.vlan_separator, 1)
            vlan = int(vlan_str)
            return base.strip(), vlan
        else:
            return raw_username.strip(), None
    
    def get_person_id(self, username):
        username = self._cleanup_and_check_username(username)

        for group_id in self.wifi_group_ids:
            members_list = self.group_manager.get_members_by_id_and_attribute(group_id, self.username_field_name)
            for person_id, person_username in members_list.items():
                try:
                    person_username = self._cleanup_and_check_username(person_username)
                except ValueError:
                    # If the returned username is empty, we do not want to raise an error here,
                    # as it might be a valid case where the user has no username set in ChurchTools,
                    # we just skip this entry and continue to the next one
                    continue

                if username == person_username:
                    return person_id
                
        raise AuthenticationError(f"Cannot find user id for username {username}")

    def get_vlan(self, ct_person_id, requested_vlan):

        group_ids = self.group_manager.get_user_groups(ct_person_id)

        for ct_id, vlan in self.assignments.items():
            if ct_id in group_ids:
                if requested_vlan is None or vlan == requested_vlan:
                    return vlan
                
        if requested_vlan:
            for ct_id, vlan in self.assignments_if_requested.items():
                if ct_id in group_ids and vlan == requested_vlan:
                    return vlan
                
        return self.default_vlan if requested_vlan in (None, self.default_vlan) else None


def authorize(p):
    CONFIG_PATH = "/etc/freeradius/ctradius_config.yaml"

    try:
        
        username_raw = p.get("User-Name", "")
        ct = CtAuthProvider(CONFIG_PATH)
        pwd, vlan_id = ct.authorize(username_raw)

        p["Cleartext-Password"] = pwd
        p["Ct-Tunnel-Type"] = "13"
        p["Ct-Tunnel-Medium-Type"] = "6"
        p["Ct-Tunnel-Private-Group-Id"] = str(vlan_id)

        return radiusd.RLM_MODULE_OK
    
    except AuthenticationError as e:

        radiusd.radlog(radiusd.L_INFO, f"[ChurchTools Authentication Error] {e}")
        p["Auth-Type"] = "Reject"
        return radiusd.RLM_MODULE_FAIL
    
    except Exception as e:

        radiusd.radlog(radiusd.L_ERR, f"[ChurchTools Internal Error] {e}")
        p["Auth-Type"] = "Reject"
        return radiusd.RLM_MODULE_FAIL
