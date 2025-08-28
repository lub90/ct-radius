import os
import pytest
import tempfile
import yaml
from Config import Config
import config_loader
import env_loader

@pytest.fixture(params=env_loader.VALID_ENVS)
def patch_env_valid(request, monkeypatch):
    for key, val in request.param.items():
        monkeypatch.setenv(key, val)

@pytest.fixture(params=env_loader.INVALID_ENVS)
def patch_env_invalid(request, monkeypatch):
    for key in request.param.keys():
        value = request.param.get(key, None)
        if value:
            monkeypatch.setenv(key, value)
        else:
            monkeypatch.delenv(key, raising=False)


# --- VALID TEST CASES ---
@pytest.mark.parametrize("config_file", config_loader.VALID_CONFIGS)
def test_valid_config_reads_correctly(patch_env_valid, config_file):
    cfg = Config(config_file)

    config_data = config_loader.load_raw_configs(config_file)

    basic = config_data["basic"]
    vlans = config_data["vlans"]
    communication = config_data["communication"]

    # Basic section checks
    assert cfg.basic.wifi_access_groups == basic["wifi_access_groups"]
    assert cfg.basic.include_assignment_groups_in_access_groups == basic["include_assignment_groups_in_access_groups"]
    assert cfg.basic.vlan_separator == basic["vlan_separator"]
    assert cfg.basic.timeout == basic["timeout"]
    assert cfg.basic.path_to_pwd_db == basic["path_to_pwd_db"]
    assert cfg.basic.username_field_name == basic["username_field_name"]

    # VLAN section checks
    assert cfg.vlans.default_vlan == vlans["default_vlan"]
    assert cfg.vlans.assignments == vlans["assignments"]
    assert cfg.vlans.assignments_if_requested == vlans["assignments_if_requested"]

    # Communications check
    assert cfg.communication.server_url == communication["server_url"]
    assert cfg.communication.language == communication["language"]
    assert cfg.communication.pwd_display_time == communication["pwd_display_time"]
    assert cfg.communication.reset_command == communication["reset_command"]

    if ("custom_settings" in cfg.communication):
        assert cfg.communication.custom_settings == communication["custom_settings"]
    else:
        assert not "custom_settings" in communication

    # Derived property check
    base_ids = set(basic["wifi_access_groups"])
    if basic["include_assignment_groups_in_access_groups"]:
        base_ids.update(map(int, vlans["assignments"].keys()))
        base_ids.update(map(int, vlans["assignments_if_requested"].keys()))
    expected_combined = sorted(base_ids)

    assert cfg.basic.all_wifi_access_groups == expected_combined



@pytest.mark.parametrize("config_file", config_loader.VALID_CONFIGS)
def test_config_reads_env(patch_env_valid, config_file):
    cfg = Config(config_file)

    assert cfg.basic.ct_server_url == os.getenv("CT_SERVER_URL")
    assert cfg.basic.ct_api_user == os.getenv("CT_API_USER")
    assert cfg.basic.ct_api_user_pwd == os.getenv("CT_API_USER_PWD")
    assert cfg.basic.pwd_db_secret == os.getenv("PWD_DB_SECRET")


# --- INVALID TEST CASES ---

@pytest.mark.parametrize("config_file", config_loader.INVALID_CONFIGS)
def test_invalid_configs_throw_exception(patch_env_valid, config_file):
    with pytest.raises((TypeError, ValueError)):
        Config(config_file)

@pytest.mark.parametrize("config_file", config_loader.VALID_CONFIGS)
def test_invalid_envs_throw_exception(patch_env_invalid, config_file):
    with pytest.raises(EnvironmentError):
        Config(config_file)

# Test env loading from file
@pytest.mark.parametrize("config_file", config_loader.VALID_CONFIGS)
def test_env_file_loading(config_file):
    cfg = Config(config_file, env_file="./tests/test.env")

    assert cfg.basic.ct_server_url == "https://example.church.tools"
    assert cfg.basic.ct_api_user == "radius@example.com"
    assert cfg.basic.ct_api_user_pwd == "1990Fish!"
    assert cfg.basic.pwd_db_secret == "Blubb123456789"

def test_missing_config_file():
    with pytest.raises(FileNotFoundError):
        Config("nonexistent.yaml")

@pytest.mark.parametrize("config_file", config_loader.VALID_CONFIGS)
def test_nonexistent_env_file(config_file):
    with pytest.raises(FileNotFoundError):
        Config(config_file, "nonexistent.env")
