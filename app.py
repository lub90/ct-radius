import os
import yaml
import requests
import radiusd
from PasswordDatabase import PasswordDatabase

from AuthenticationError import AuthenticationError

class CtAuthProvider:
    def __init__(self, config_path):
        with open(config_path, "r") as f:
            cfg = yaml.safe_load(f)

        self.server_url = os.environ.get("CTRADIUS_RADIUS_BASE_URL")
        self.api_user = os.environ.get("CTRADIUS_API_USER")
        self.api_pwd = os.environ.get("CTRADIUS_API_USER_PWD")

        basic = cfg["basic"]
        self.vlan_separator = basic["requested_vlan_separator"]
        self.timeout = basic.get("timeout", 5)

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

    def authorize(self, raw_username):
        self.login()

        raw_username = self.cleanup_username(raw_username)
        username, requested_vlan = self.split_username(raw_username)
        ct_person_id = self.get_person_id(username)
        password = self.get_password(ct_person_id)
        ct_groups = self.get_user_groups(ct_person_id)
        assigned_vlan = self.get_vlan(ct_groups, requested_vlan)

        if not password:
            raise AuthenticationError(f"Cannot find password for user {username}!")
        
        if assigned_vlan is None:
            raise AuthenticationError(f"VLAN assignment failed for {username}!")

        return password, assigned_vlan

    def get_password(self, person_id):
        # Retrieve the password from the PasswordDatabase
        try:
            return self.pwd_db.getPwd(person_id)
        except KeyError:
            raise AuthenticationError(f"Cannot find password for user id {person_id}!")

    def cleanup_username(self, raw_username):
        return raw_username.strip().lower()

    def login(self):
        r = self.session.post(f"{self.server_url}/api/login", json={
            "username": self.api_user,
            "password": self.api_pwd
        }, timeout=self.timeout)
        r.raise_for_status()


    def split_username(self, raw_username):
        if self.vlan_separator in raw_username:
            base, vlan_str = raw_username.rsplit(self.vlan_separator, 1)
            vlan = int(vlan_str)
            return base.strip(), vlan
        else:
            return raw_username.strip(), None
    
    def get_person_id(self, username):
        for group_id in self.wifi_group_ids:
            user_id = self.get_person_id(username, group_id)
            if user_id != None:
                return user_id
        raise AuthenticationError(f"Cannot find user id for username {username}")

    def get_person_id(self, username, group_id):
        # A page limit of 100 should be sufficient, as this means that we have 100 users which have a username containing the given username
        # This is only the case if only a single or few characters are given --> Try to breach system, ignore this request
        # Or if the given (real) username is contained in another username. Thereby, it is highly unlikely that there exist more than 100 such usernames
        response = self.session.get(
            f"{self.server_url}/api/groups/{group_id}/members",
            params={
                "page": 1,
                "limit": 100,
                "person_cmsUserId": username
            },
            timeout=self.timeout
        )
        response.raise_for_status()
        members = response.json().get("data", [])

        # Check if exactly one member is returned
        for member in members:
            field_list = member.get("fields", [])
            matching_fields = [f for f in field_list if f.get("name") == "cmsUserId"]
            member_username = matching_fields[0].get("value", "").strip()
            if member_username == username:
                return member.get("personId")
        return None

    def get_user_groups(self, person_id):
        r = self.session.get(f"{self.server_url}/api/persons/{person_id}/groups", timeout=self.timeout)
        r.raise_for_status()
        return {int(g["group"]["domainIdentifier"]) for g in r.json()["data"]}

    def get_vlan(self, group_ids, requested_vlan):

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
