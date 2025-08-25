import radiusd

from CtAuthProvider import CtAuthProvider
from AuthenticationError import AuthenticationError


def authorize(p):

    try:
        config_path = p.get("Ct-Config-Path")
        env_path = p.get("Ct-Env-Path")
        username_raw = p.get("User-Name", "")
        ct = CtAuthProvider(config_path, env_path)
        pwd, vlan_id = ct.authorize(username_raw)

        p["Cleartext-Password"] = pwd
        p["Tunnel-Type"] = "13"
        p["Tunnel-Medium-Type"] = "6"
        p["Tunnel-Private-Group-Id"] = str(vlan_id)

        return radiusd.RLM_MODULE_OK
    
    except AuthenticationError as e:

        radiusd.radlog(radiusd.L_INFO, f"[ChurchTools Authentication Error] {e}")
        p["Auth-Type"] = "Reject"
        return radiusd.RLM_MODULE_FAIL
    
    except Exception as e:

        radiusd.radlog(radiusd.L_ERR, f"[ChurchTools Internal Error] {e}")
        p["Auth-Type"] = "Reject"
        return radiusd.RLM_MODULE_FAIL
