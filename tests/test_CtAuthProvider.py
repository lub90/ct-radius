import sys
import types
import os
import pytest

from unittest.mock import MagicMock, patch
from CtAuthProvider import CtAuthProvider
from AuthenticationError import AuthenticationError

import env_loader
import mainApp_loader



@pytest.fixture(params=env_loader.VALID_ENVS, autouse=True)
def patch_env_valid(request, monkeypatch):
    for key, val in request.param.items():
        monkeypatch.setenv(key, val)

# Fixture for mocked CtAuthProvider
@pytest.fixture(params=mainApp_loader.VALID_CONFIGS)
def authorizer(request):
    app = CtAuthProvider(request.param)

    # Mock user ID resolution via ChurchTools
    members = mainApp_loader.get_group_members()
    app.group_manager = MagicMock()
    app.group_manager.login.return_value = None
    app.group_manager.get_members_by_id_and_attribute.side_effect = lambda gid, attr: members.get(gid, {})
    app.group_manager.get_user_groups.side_effect = mainApp_loader.get_user_groups()

    app.pwd_db = MagicMock()
    app.pwd_db.db = None
    app.pwd_db.getPwd.side_effect = mainApp_loader.get_user_pwds()

    return app

# --- CORE TEST CASES ---
@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_default_vlan())
def test_valid_user_with_assignment(authorizer, username_pwd_vlan):
    password, vlan = authorizer.authorize(username_pwd_vlan[0])
    assert password == username_pwd_vlan[1]
    assert vlan == username_pwd_vlan[2]


@pytest.mark.parametrize("not_allowed", mainApp_loader.get_not_allowed_users())
def test_user_not_in_pwd_db(authorizer, not_allowed):
    with pytest.raises(AuthenticationError):
        authorizer.authorize(not_allowed)

@pytest.mark.parametrize("empty_users", [
    "",
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
    with pytest.raises(ValueError):
        authorizer.authorize(empty_users)

def test_none_username(authorizer):
    with pytest.raises(TypeError):
        authorizer.authorize(None)

# --- REQUESTED VLAN CASES ---
@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_requested_vlan())
def test_valid_requested_assignment(authorizer, username_pwd_vlan):
    username = username_pwd_vlan[0] + authorizer.config.basic.vlan_separator + str(username_pwd_vlan[2])
    password, vlan = authorizer.authorize(username)
    assert password == username_pwd_vlan[1]
    assert vlan == username_pwd_vlan[2]


@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_requested_invalid_vlan())
def test_invalid_vlan_request(authorizer, username_pwd_vlan):
    with pytest.raises(AuthenticationError):
        username = username_pwd_vlan[0] + authorizer.config.basic.vlan_separator + str(username_pwd_vlan[2])
        authorizer.authorize(username)


# --- INPUT EDGE CASES ---
@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_variants_pwds_default_vlan())
def test_username_cleanup_and_case(authorizer, username_pwd_vlan):
    password, vlan = authorizer.authorize(username_pwd_vlan[0])
    assert password == username_pwd_vlan[1]
    assert vlan == username_pwd_vlan[2]


@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_default_vlan())
def test_non_numeric_vlan_request(authorizer, username_pwd_vlan):
    username = username_pwd_vlan[0] + authorizer.config.basic.vlan_separator + chr(username_pwd_vlan[2]) + "te"
    with pytest.raises(AuthenticationError):
        authorizer.authorize(username)

@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_default_vlan())
def test_empty_numeric_vlan_request(authorizer, username_pwd_vlan):
    username = username_pwd_vlan[0] + authorizer.config.basic.vlan_separator
    with pytest.raises(AuthenticationError):
        authorizer.authorize(username)

@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_default_vlan())
def test_empty_string_password_handling(authorizer, username_pwd_vlan):
    authorizer.pwd_db.getPwd.side_effect = None
    authorizer.pwd_db.getPwd.return_value = ""
    with pytest.raises(ValueError):
        authorizer.authorize(username_pwd_vlan[0])

@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_default_vlan())
def test_group_lookup_failure(authorizer, username_pwd_vlan):
    authorizer.group_manager.get_user_groups.side_effect = None
    authorizer.group_manager.get_user_groups.return_value = []
    pwd, vlan = authorizer.authorize(username_pwd_vlan[0])
    assert vlan == authorizer.config.vlans.default_vlan

@pytest.mark.parametrize("username", mainApp_loader.get_invalid_usernames())
def test_invalid_usernames(authorizer, username):
    with pytest.raises((ValueError, TypeError)):
        authorizer.authorize(username)


@pytest.mark.parametrize("username_pwd_vlan", mainApp_loader.get_user_names_pwds_default_vlan())
def test_invalid_env_file_assignment(username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan


@pytest.mark.parametrize("valid_configs", mainApp_loader.VALID_CONFIGS)
def test_invalid_env_file_assignment(valid_configs):
    with pytest.raises(FileNotFoundError):
        CtAuthProvider(valid_configs, "nonexistent.env")