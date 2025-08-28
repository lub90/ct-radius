import sys
import types
import os

# Create a dummy radiusd module
sys.modules["radiusd"] = types.SimpleNamespace(
    RLM_MODULE_OK=0,
    RLM_MODULE_FAIL=1,
    L_INFO=1,
    L_ERR=2,
    radlog=lambda level, msg: None
)


import pytest
from unittest.mock import MagicMock, patch
from CtAuthProvider import CtAuthProvider
from AuthenticationError import AuthenticationError
from authorize import authorize

import env_loader
import authorization_loader



@pytest.fixture(params=env_loader.VALID_ENVS, autouse=True)
def patch_env_valid(request, monkeypatch):
    for key, val in request.param.items():
        monkeypatch.setenv(key, val)

# Fixture for mocked CtAuthProvider
@pytest.fixture(params=authorization_loader.VALID_CONFIGS)
def authorizer(request):
    app = CtAuthProvider(request.param)

    # Mock user ID resolution via ChurchTools
    members = authorization_loader.get_group_members()
    app.group_manager = MagicMock()
    app.group_manager.login.return_value = None
    app.group_manager.get_members_by_id_and_attribute.side_effect = lambda gid, attr: members.get(gid, {})
    app.group_manager.get_user_groups.side_effect = authorization_loader.get_user_groups()

    app.pwd_db = MagicMock()
    app.pwd_db.db = None
    app.pwd_db.getPwd.side_effect = authorization_loader.get_user_pwds()

    return app

# --- CORE TEST CASES ---
@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_valid_user_with_assignment(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    p = {"User-Name": username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 0  # RLM_MODULE_OK
    assert p["Cleartext-Password"] == expected_pwd
    assert p["Tunnel-Type"] == "13"
    assert p["Tunnel-Medium-Type"] == "6"
    assert p["Tunnel-Private-Group-Id"] == str(expected_vlan)



@pytest.mark.parametrize("not_allowed", authorization_loader.get_not_allowed_users())
def test_user_not_in_pwd_db(authorizer, not_allowed):
    with pytest.raises(AuthenticationError):
        authorizer.authorize(not_allowed)

@pytest.mark.parametrize("empty_users", [
    "",
    None,
    " ",         # Single space
    "\t",        # Tab
    "\n",        # Newline
    "\r",        # Carriage return
    "\f",        # Form feed
    "\v",        # Vertical tab
    "  \t  ",    # Multiple spaces and a tab
    "\n\r\t "    # Mixed whitespace characters
])
def test_empty_username(authorizer, empty_users):
    p = {"User-Name": empty_users, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)
    
    assert result == 1  # RLM_MODULE_FAIL
    assert p["Auth-Type"] == "Reject"



# --- REQUESTED VLAN CASES ---
@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_requested_vlan())
def test_valid_requested_assignment(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator + str(requested_vlan)

    p = {"User-Name": full_username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 0  # RLM_MODULE_OK
    assert p["Cleartext-Password"] == expected_pwd
    assert p["Tunnel-Type"] == "13"
    assert p["Tunnel-Medium-Type"] == "6"
    assert p["Tunnel-Private-Group-Id"] == str(requested_vlan)




@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_requested_invalid_vlan())
def test_invalid_vlan_request(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator + str(requested_vlan)

    p = {"User-Name": full_username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 1  # RLM_MODULE_FAIL
    assert p["Auth-Type"] == "Reject"



# --- INPUT EDGE CASES ---
@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_variants_pwds_default_vlan())
def test_username_cleanup_and_case(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    p = {"User-Name": username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 0  # RLM_MODULE_OK
    assert p["Cleartext-Password"] == expected_pwd
    assert p["Tunnel-Type"] == "13"
    assert p["Tunnel-Medium-Type"] == "6"
    assert p["Tunnel-Private-Group-Id"] == str(expected_vlan)


@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_non_numeric_vlan_request(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator + chr(username_pwd_vlan[2]) + "te"

    p = {"User-Name": full_username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 1  # RLM_MODULE_FAIL
    assert p["Auth-Type"] == "Reject"



@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_empty_numeric_vlan_request(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator

    p = {"User-Name": full_username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 1  # RLM_MODULE_FAIL
    assert p["Auth-Type"] == "Reject"



@pytest.mark.parametrize("username", authorization_loader.get_invalid_usernames())
def test_invalid_usernames(authorizer, username):
    p = {"User-Name": username, "Ct-Config-Path": "somePath", "Ct-Env-Path": "someEnvPath"}

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 1  # RLM_MODULE_FAIL
    assert p["Auth-Type"] == "Reject"


def test_missing_config_path(authorizer):
    p = {"User-Name": "someuser"}  # No Ct-Config-Path

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        result = authorize(p)

    assert result == 1
    assert p["Auth-Type"] == "Reject"


@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_invalid_env_file_assignment(username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    p = {"User-Name": username, "Ct-Config-Path": "someNonexistentPath.yaml"}

    result = authorize(p)
    assert result == 1
    assert p["Auth-Type"] == "Reject"