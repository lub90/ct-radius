import sys
import types
import os

import io
from contextlib import redirect_stdout, redirect_stderr

import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from ctradius import CtAuthProvider, AuthenticationError
from authorize import main

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


    # Prepare mock for pwd_db
    mock_pwd_db = MagicMock()
    mock_pwd_db.db = None
    mock_pwd_db.getPwd.side_effect = authorization_loader.get_user_pwds()

    # Patch the pwd_db property to return our mock
    patcher = patch.object(type(app), "pwd_db", new_callable=PropertyMock, return_value=mock_pwd_db)
    patcher.start()

    # Ensure patcher is stopped after test
    request.addfinalizer(patcher.stop)

    return app

def run_main_args_list(args_list):
    sys.argv = ["authorize.py"] + args_list
    stdout = io.StringIO()
    stderr = io.StringIO()
    with redirect_stdout(stdout), redirect_stderr(stderr):
        try:
            main()
            return 0, stdout.getvalue(), stderr.getvalue()
        except SystemExit as e:
            return e.code, stdout.getvalue(), stderr.getvalue()


def run_main(config, username):
    args = [
        "--config", config,
        "--username", username
    ]
    return run_main_args_list(args)



@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_valid_user_with_assignment(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", username)

    expected_out = [
        f"Cleartext-Password := {expected_pwd}",
        "Ct-Tunnel-Type := 13",
        "Ct-Tunnel-Medium-Type := 6",
        f"Ct-Tunnel-Private-Group-Id := {str(expected_vlan)}"
    ]

    assert code == 0
    assert out.splitlines() == expected_out
    assert err.splitlines() == []



@pytest.mark.parametrize("not_allowed", authorization_loader.get_not_allowed_users())
def test_user_not_in_pwd_db(authorizer, not_allowed):

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", not_allowed)

    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []



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

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", empty_users)
    
    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []




# --- REQUESTED VLAN CASES ---
@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_requested_vlan())
def test_valid_requested_assignment(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator + str(requested_vlan)

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", full_username)

    expected_out = [
        f"Cleartext-Password := {expected_pwd}",
        "Ct-Tunnel-Type := 13",
        "Ct-Tunnel-Medium-Type := 6",
        f"Ct-Tunnel-Private-Group-Id := {str(requested_vlan)}"
    ]

    assert code == 0
    assert out.splitlines() == expected_out
    assert err.splitlines() == []


@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_requested_invalid_vlan())
def test_invalid_vlan_request(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator + str(requested_vlan)

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", full_username)
    
    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []



@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_variants_pwds_default_vlan())
def test_username_cleanup_and_case(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", username)

    expected_out = [
        f"Cleartext-Password := {expected_pwd}",
        "Ct-Tunnel-Type := 13",
        "Ct-Tunnel-Medium-Type := 6",
        f"Ct-Tunnel-Private-Group-Id := {str(expected_vlan)}"
    ]

    assert code == 0
    assert out.splitlines() == expected_out
    assert err.splitlines() == []


@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_non_numeric_vlan_request(authorizer, username_pwd_vlan):
    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator + chr(username_pwd_vlan[2]) + "te"

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", full_username)
    
    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []



@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_empty_numeric_vlan_request(authorizer, username_pwd_vlan):

    username, expected_pwd, requested_vlan = username_pwd_vlan

    full_username = username + authorizer.config.basic.vlan_separator

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", full_username)
    
    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []





@pytest.mark.parametrize("username", authorization_loader.get_invalid_usernames())
def test_invalid_usernames(authorizer, username):

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main("someConfigPath", username)
    
    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []


@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_missing_config_path(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    # No Ct-Config-Path
    args = [
        "--env", "tests/test.env",
        "--username", username
    ]

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main_args_list(args)

    assert code == 2

@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_missing_username(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    # No env-Path
    args = [
        "--config", "tests/valid_config_1.yaml",
        "--env", "tests/test.env",
    ]

    with patch("authorize.CtAuthProvider", return_value=authorizer):
        code, out, err = run_main_args_list(args)

    assert code == 2

@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_invalid_config_file_assignment(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    # Non existant Ct-Config-Path
    args = [
        "--config", "someNonexistentPath.yaml",
        "--env", "tests/test.env",
        "--username", username
    ]

    code, out, err = run_main_args_list(args)

    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []

@pytest.mark.parametrize("username_pwd_vlan", authorization_loader.get_user_names_pwds_default_vlan())
def test_invalid_config_file_assignment(authorizer, username_pwd_vlan):
    username, expected_pwd, expected_vlan = username_pwd_vlan

    # Non existant Ct-Config-Path
    args = [
        "--config", "tests/valid_config_1.yaml",
        "--env", "not_existent_env.env",
        "--username", username
    ]

    code, out, err = run_main_args_list(args)

    expected_out = [
        "Auth-Type := Reject"
    ]

    assert code == 1
    assert out.splitlines() == expected_out
    assert err.splitlines() == []