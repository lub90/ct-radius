import radiusd

from CtAuthProvider import CtAuthProvider
from AuthenticationError import AuthenticationError


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
