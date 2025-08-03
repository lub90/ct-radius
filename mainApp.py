import os
import yaml
import requests
import radiusd
from RadiusRelevantApp import RadiusRelevantApp
import RadiusUtils

from AuthenticationError import AuthenticationError

class CtAuthProvider(RadiusRelevantApp):

    def __init__(self, config_path):
        super().__init__(config_path)


    def _cleanup_and_check_username(self, username):
        # Use the RadiusUtils to validate the username
        username = RadiusUtils.validate_username(username)

        # Remove leading and trailing whitespace, convert to lowercase
        return username.strip().lower()


    def authorize(self, raw_username):
        self.group_manager.login()

        username, requested_vlan = self._split_username(raw_username)
        ct_person_id = self._get_person_id(username)
        password = self._get_password(ct_person_id)
        assigned_vlan = self._get_vlan(ct_person_id, requested_vlan)

        if not password:
            raise AuthenticationError(f"Cannot find password for user {username}!")
        
        if assigned_vlan is None:
            raise AuthenticationError(f"VLAN assignment failed for {username}!")

        return password, assigned_vlan

    def _get_password(self, person_id):
        # Retrieve the password from the PasswordDatabase
        try:
            password = self.pwd_db.getPwd(person_id)
        except KeyError:
            raise AuthenticationError(f"Cannot find password for user id {person_id}!")

        if not password:
            raise ValueError(f"Password for user id {person_id} is empty!")
    
        return password

    def _split_username(self, raw_username):
        if self.config.basic.vlan_separator in raw_username:
            base, vlan_str = raw_username.rsplit(self.config.basic.vlan_separator, 1)
            try:
                vlan = int(vlan_str)
            except ValueError:
                raise AuthenticationError(f"Invalid VLAN format in username: {raw_username}")
            return base.strip(), vlan
        else:
            return raw_username.strip(), None
    
    def _get_person_id(self, username):
        username = self._cleanup_and_check_username(username)

        for group_id in self.config.basic.wifi_access_groups:
            members_list = self.group_manager.get_members_by_id_and_attribute(group_id, self.config.basic.username_field_name)
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

    def _get_vlan(self, ct_person_id, requested_vlan):

        group_ids = self.group_manager.get_user_groups(ct_person_id)

        for ct_id, vlan in self.config.vlans.assignments.items():
            if ct_id in group_ids:
                if requested_vlan is None or vlan == requested_vlan:
                    return vlan
                
        if requested_vlan:
            for ct_id, vlan in self.config.vlans.assignments_if_requested.items():
                if ct_id in group_ids and vlan == requested_vlan:
                    return vlan
        
        default_vlan = self.config.vlans.default_vlan

        return default_vlan if requested_vlan in (None, default_vlan) else None


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
