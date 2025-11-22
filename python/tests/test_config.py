print("Test")

import os
import pytest
from ctradius import Config
import config_loader
import env_loader

@pytest.fixture(params=env_loader.get_valid_envs())
def patch_env_valid(request, monkeypatch):
    for key, val in request.param.items():
        monkeypatch.setenv(key, val)

@pytest.fixture(params=env_loader.get_invalid_envs())
def patch_env_invalid(request, monkeypatch):
    # First clear all existing environment variables
    for key in list(os.environ.keys()):
        monkeypatch.delenv(key, raising=False)

    # Then set the new ones from request.param
    for key, value in request.param.items():
        if value is not None:
            monkeypatch.setenv(key, value)


# --- VALID TEST CASES ---
@pytest.mark.parametrize("config_file", config_loader.get_valid_configs())
def test_valid_config_reads_correctly(patch_env_valid, config_file):
    cfg = Config(config_file)

    config_data = config_loader.load_raw_configs(config_file)

    basic = config_data["basic"]
    vlans = config_data["vlans"]

    # Basic section checks
    assert cfg.basic.wifi_access_groups == basic["wifi_access_groups"]
    assert cfg.basic.include_assignment_groups_in_access_groups == basic["include_assignment_groups_in_access_groups"]
    assert cfg.basic.vlan_separator == basic["vlan_separator"]
    assert cfg.basic.timeout == basic["timeout"]
    assert cfg.basic.username_field_name == basic["username_field_name"]
    assert cfg.basic.path_to_private_decryption_key == basic["path_to_private_decryption_key"]

    # VLAN section checks
    assert cfg.vlans.default_vlan == vlans["default_vlan"]
    assert cfg.vlans.assignments == vlans["assignments"]
    assert cfg.vlans.assignments_if_requested == vlans["assignments_if_requested"]

    # Derived property check
    base_ids = set(basic["wifi_access_groups"])
    if basic["include_assignment_groups_in_access_groups"]:
        base_ids.update(map(int, vlans["assignments"].keys()))
        base_ids.update(map(int, vlans["assignments_if_requested"].keys()))
    expected_combined = sorted(base_ids)

    assert cfg.basic.all_wifi_access_groups == expected_combined



@pytest.mark.parametrize("config_file", config_loader.get_valid_configs())
def test_config_reads_env(patch_env_valid, config_file):
    cfg = Config(config_file)

    assert cfg.basic.ct_server_url == os.getenv("CT_SERVER_URL")
    assert cfg.basic.ct_api_user == os.getenv("CT_API_USER")
    assert cfg.basic.ct_api_user_pwd == os.getenv("CT_API_USER_PWD")
    assert cfg.basic.ct_private_decryption_key_pwd == os.getenv("CT_PRIVATE_DECRYPTION_KEY_PWD")


# --- INVALID TEST CASES ---

@pytest.mark.parametrize("config_file", config_loader.get_invalid_configs())
def test_invalid_configs_throw_exception(patch_env_valid, config_file):
    with pytest.raises((TypeError, ValueError)):
        Config(config_file)

@pytest.mark.parametrize("config_file", config_loader.get_valid_configs())
def test_invalid_envs_throw_exception(patch_env_invalid, config_file):
    with pytest.raises(EnvironmentError):
        Config(config_file)

# Test env loading from file
@pytest.mark.parametrize("config_file", config_loader.get_valid_configs())
def test_env_file_loading(config_file):
    cfg = Config(config_file, env_file="./tests/fixtures/valid_envs/file_read_test.env")

    assert cfg.basic.ct_server_url == "https://example.church.tools"
    assert cfg.basic.ct_api_user == "radius@example.com"
    assert cfg.basic.ct_api_user_pwd == "1990Fish!"
    assert cfg.basic.ct_private_decryption_key_pwd == "Blubb123456789"

def test_missing_config_file():
    with pytest.raises(FileNotFoundError):
        Config("nonexistent.yaml")

@pytest.mark.parametrize("config_file", config_loader.get_valid_configs())
def test_nonexistent_env_file(config_file):
    with pytest.raises(FileNotFoundError):
        Config(config_file, "nonexistent.env")
