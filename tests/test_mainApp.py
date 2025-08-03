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

from envs import VALID_ENVS



@pytest.fixture(params=VALID_ENVS, autouse=True)
def patch_env_valid(request, monkeypatch):
    for key, val in request.param.items():
        monkeypatch.setenv(key, val)

# Fixture for mocked CtAuthProvider
@pytest.fixture
def authorizer():

    config_path = os.path.join(os.path.dirname(__file__), "./valid_config_1.yaml")

    app = CtAuthProvider(config_path)

    # Mock user ID resolution via ChurchTools
    members = {
        100: {"1": "user1", "2": "user2"},
        200: {"3": "user3", "4": "multiuser", "5": "overlap", "6": "userX"}
    }
    app.group_manager = MagicMock()
    app.group_manager.login.return_value = None
    app.group_manager.get_members_by_id_and_attribute.side_effect = lambda gid, attr: members.get(gid, {})
    app.group_manager.get_user_groups.side_effect = lambda pid: {
        "1": [1],
        "2": [3],
        "3": [5],
        "4": [1, 2],
        "5": [1, 5],
        "6": []
    }.get(pid, [])

    app.pwd_db = MagicMock()
    app.pwd_db.getPwd.side_effect = lambda pid: {
        "1": "pass1",
        "2": "pass2",
        "3": "pass3",
        "4": "pass4",
        "5": "pass5",
        "6": "passX"
    }.get(pid)

    return app

# --- CORE TEST CASES ---
def test_valid_user_with_assignment(authorizer):
    password, vlan = authorizer.authorize("user1")
    assert password == "pass1"
    assert vlan == 10

def test_user_not_in_pwd_db(authorizer):
    with pytest.raises(AuthenticationError):
        authorizer.authorize("nonexistent")

def test_empty_username(authorizer):
    with pytest.raises(ValueError):
        authorizer.authorize("")

def test_user_without_vlan_assignment(authorizer):
    pwd, vlan = authorizer.authorize("userX")
    assert pwd == "passX"
    assert vlan == authorizer.config.vlans.default_vlan

def test_first_vlan_match_selected(authorizer):
    pwd, vlan = authorizer.authorize("multiuser")
    assert vlan == 10

def test_ignore_assignments_if_not_requested(authorizer):
    pwd, vlan = authorizer.authorize("user3")
    assert vlan == authorizer.config.vlans.default_vlan

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
