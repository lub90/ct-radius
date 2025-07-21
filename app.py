import os
import yaml
import requests
import radiusd

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

        access = basic["access_group"]
        self.wifi_group_id = access["wifi_group"]
        self.pwd_field = access["password_field_name"]

        vlans = cfg["vlans"]
        self.default_vlan = vlans["default_vlan"]
        self.assignments = {int(k): v for k, v in vlans["assignments"].items()}
        self.assignments_if_requested = {int(k): v for k, v in vlans["assignments_if_requested"].items()}

        self.session = requests.Session()

    def authorize(self, raw_username):
        self.login()

        raw_username = self.cleanup_username(raw_username)
        username, requested_vlan = self.split_username(raw_username)
        ct_person_id, password = self.get_wifi_credentials(username)
        ct_groups = self.get_user_groups(ct_person_id)
        assigned_vlan = self.get_vlan(ct_groups, requested_vlan)

        if not password:
            raise AuthenticationError(f"Cannot find password for user {username}!")
        
        if assigned_vlan is None:
            raise AuthenticationError(f"VLAN assignment failed for {username}!")

        return password, assigned_vlan

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
        
    def get_wifi_credentials(self, username):
        response = self.session.get(
            f"{self.server_url}/api/groups/{self.wifi_group_id}/members",
            params={
                "page": 1,
                "limit": 10,
                "person_cmsUserId": username
            },
            timeout=self.timeout
        )
        response.raise_for_status()
        members = response.json().get("data", [])

        # Check if exactly one member is returned
        if len(members) == 0:
            raise AuthenticationError(f"User {username} is not existent or not allowed to access wifi!")
        if len(members) > 1:
            raise ValueError(f"Expected exactly one group member for user ID '{username}', but found {len(members)}.")

        member = members[0]
        person_id = member.get("personId")

        # Extract WiFi password field
        field_list = member.get("fields", [])
        matching_fields = [f for f in field_list if f.get("name") == self.pwd_field]

        if len(matching_fields) != 1:
            raise ValueError(f"Expected exactly one password field named '{self.pwd_field}', but found {len(matching_fields)}.")

        password = matching_fields[0].get("value", "").strip()
        if not password:
            raise ValueError("WiFi password field is empty or missing.")

        return person_id, password

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
