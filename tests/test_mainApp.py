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
from mainApp import CtAuthProvider
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


@pytest.mark.parametrize("nonexistent", mainApp_loader.get_nonexistent_users())
def test_user_not_in_pwd_db(authorizer, nonexistent):
    with pytest.raises(AuthenticationError):
        authorizer.authorize(nonexistent)

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


# TODO: Continue tests here

'''

# --- REQUESTED VLAN CASES ---
def test_valid_requested_assignment(authorizer):
    pwd, vlan = authorizer.authorize("user1#10")
    assert vlan == 10

def test_valid_requested_assignment_if_requested(authorizer):
    pwd, vlan = authorizer.authorize("user3#50")
    assert vlan == 50

def test_invalid_vlan_request(authorizer):
    with pytest.raises(AuthenticationError):
        authorizer.authorize("user1#999")

# --- INPUT EDGE CASES ---
@pytest.mark.parametrize("username", [" user1 ", "USER1", "user1#10", " USeR1"])
def test_username_cleanup_and_case(authorizer, username):
    pwd, vlan = authorizer.authorize(username)
    assert vlan == 10

def test_non_numeric_vlan_request(authorizer):
    with pytest.raises(AuthenticationError):
        authorizer.authorize("user1#abc")

def test_numeric_vlan_not_assigned(authorizer):
    with pytest.raises(AuthenticationError):
        authorizer.authorize("user1#99")

def test_empty_string_password_handling(authorizer):
    authorizer.pwd_db.getPwd.side_effect = None
    authorizer.pwd_db.getPwd.return_value = ""
    with pytest.raises(ValueError):
        authorizer.authorize("user1")

def test_multiple_vlan_assignments(authorizer):
    pwd, vlan = authorizer.authorize("multiuser")
    assert vlan == 10

def test_overlap_assignments_and_request(authorizer):
    pwd, vlan = authorizer.authorize("overlap#50")
    assert vlan == 50

def test_requested_vlan_is_default(authorizer):
    pwd, vlan = authorizer.authorize("userX#1")
    assert vlan == 1

def test_group_lookup_failure(authorizer):
    authorizer.group_manager.get_user_groups.side_effect = None
    authorizer.group_manager.get_user_groups.return_value = []
    pwd, vlan = authorizer.authorize("user1")
    assert vlan == authorizer.config.vlans.default_vlan

def test_multiple_users_in_group(authorizer):
    pwd, vlan = authorizer.authorize("user1")
    assert vlan == 10
'''
