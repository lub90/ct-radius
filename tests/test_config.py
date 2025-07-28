import os
import pytest
import tempfile
import yaml
from Config import Config

# --- ENV configs for different scenarios ---
FULL_ENV = {
    "CT_SERVER_URL": "https://example.com",
    "CT_API_USER": "admin",
    "CT_API_USER_PWD": "securepassword",
    "PWD_DB_SECRET": "topsecret"
}

PARTIAL_ENV_CT_SERVER_URL = {
    "CT_SERVER_URL": None,
    "CT_API_USER": "admin",
    "CT_API_USER_PWD": "securepassword",
    "PWD_DB_SECRET": "topsecret"
}

PARTIAL_ENV_CT_API_USER = {
    "CT_SERVER_URL": "https://example.com",
    "CT_API_USER": None,
    "CT_API_USER_PWD": "securepassword",
    "PWD_DB_SECRET": "topsecret"
}

PARTIAL_ENV_CT_API_USER_PWD = {
    "CT_SERVER_URL": "https://example.com",
    "CT_API_USER": "admin",
    "CT_API_USER_PWD": None,
    "PWD_DB_SECRET": "topsecret"
}

PARTIAL_ENV_PWD_DB_SECRET = {
    "CT_SERVER_URL": "https://example.com",
    "CT_API_USER": "admin",
    "CT_API_USER_PWD": "securepassword",
    "PWD_DB_SECRET": None
}

EMPTY_ENV = {
    "CT_SERVER_URL": "",
    "CT_API_USER": "",
    "CT_API_USER_PWD": "",
    "PWD_DB_SECRET": ""
}

@pytest.fixture(params=[FULL_ENV], autouse=True)
def patch_env_valid(request, monkeypatch):
    for key, val in request.param.items():
        monkeypatch.setenv(key, val)

def patch_env_invalid(monkeypatch, env_dict):
    for key in Config.ENV_KEYS:
        value = env_dict.get(key, None)
        if value:
            monkeypatch.setenv(key, value)
        else:
            monkeypatch.delenv(key, raising=False)


# --- Helper to write temp YAML ---
def create_temp_config(data):
    tmp = tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".yaml")
    yaml.dump(data, tmp)
    tmp.close()
    return tmp.name


# --- VALID TEST CASES ---
@pytest.mark.parametrize("config_data", [
    {
        "basic": {
            "wifi_access_groups": [101, 102],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {"101": 10},
            "assignments_if_requested": {"77": 120}
        }
    },
    {
        "basic": {
            "wifi_access_groups": [194],
            "include_assignment_groups_in_access_groups": False,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 20,
            "assignments": {},
            "assignments_if_requested": {}
        }
    },
    {
        "basic": {
            "wifi_access_groups": [101, 202],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "/tmp/pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {
                "101": 10,
                "104": 10,
                "139": 20,
                "177": 1
            },
            "assignments_if_requested": {
                "231": 110,
                "77": 120
            }
        }
    }
])
def test_valid_config_reads_correctly(config_data):
    path = create_temp_config(config_data)
    cfg = Config(path)

    basic = config_data["basic"]
    vlans = config_data["vlans"]

    # Basic section checks
    assert cfg.basic.wifi_access_groups == basic["wifi_access_groups"]
    assert cfg.basic.include_assignment_groups_in_access_groups == basic["include_assignment_groups_in_access_groups"]
    assert cfg.basic.requested_vlan_separator == basic["requested_vlan_separator"]
    assert cfg.basic.timeout == basic["timeout"]
    assert cfg.basic.path_to_pwd_db == basic["path_to_pwd_db"]
    assert cfg.basic.username_field_name == basic["username_field_name"]

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




@pytest.mark.parametrize("env_vars", [
    {
        "CT_SERVER_URL": "https://env-1.com",
        "CT_API_USER": "admin1",
        "CT_API_USER_PWD": "pass1",
        "PWD_DB_SECRET": "secret1"
    },
    {
        "CT_SERVER_URL": "https://env-2.com",
        "CT_API_USER": "admin2",
        "CT_API_USER_PWD": "pass2",
        "PWD_DB_SECRET": "secret2"
    },
    {
        "CT_SERVER_URL": "https://env-3.com",
        "CT_API_USER": "admin3",
        "CT_API_USER_PWD": "pass3",
        "PWD_DB_SECRET": "secret3"
    }
])
def test_config_reads_env(monkeypatch, env_vars):
    # Set the environment vars via monkeypatch
    for key, val in env_vars.items():
        monkeypatch.setenv(key, val)

    config_data = {
        "basic": {
            "wifi_access_groups": [100],
            "include_assignment_groups_in_access_groups": False,
            "requested_vlan_separator": "#",
            "timeout": 3,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }

    path = create_temp_config(config_data)
    cfg = Config(path)

    assert cfg.basic.ct_server_url == env_vars["CT_SERVER_URL"]
    assert cfg.basic.ct_api_user == env_vars["CT_API_USER"]
    assert cfg.basic.ct_api_user_pwd == env_vars["CT_API_USER_PWD"]
    assert cfg.basic.pwd_db_secret == env_vars["PWD_DB_SECRET"]




# --- INVALID TEST CASES ---
@pytest.mark.parametrize("config_data, env_vars, exception", [
    ({}, FULL_ENV, ValueError),  # empty config
    ({
        "basic": {
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, FULL_ENV, ValueError),  # Missing wifi_access_groups
    ({
        "basic": {
            "wifi_access_groups": [],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, FULL_ENV, ValueError),  # Empty wifi_access_groups
    ({
        "basic": {
            "wifi_access_groups": [194],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": ["oops"],
            "assignments_if_requested": {}
        }
    }, FULL_ENV, TypeError),  # Invalid type for assignments
    ({
        "basic": {
            "wifi_access_groups": [194],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, EMPTY_ENV, EnvironmentError),  # All envs empty
    ({
        "basic": {
            "wifi_access_groups": [101],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, PARTIAL_ENV_CT_SERVER_URL, EnvironmentError),

    ({
        "basic": {
            "wifi_access_groups": [101],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, PARTIAL_ENV_CT_API_USER, EnvironmentError),

    ({
        "basic": {
            "wifi_access_groups": [101],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, PARTIAL_ENV_CT_API_USER_PWD, EnvironmentError),

    ({
        "basic": {
            "wifi_access_groups": [101],
            "include_assignment_groups_in_access_groups": True,
            "requested_vlan_separator": "#",
            "timeout": 5,
            "path_to_pwd_db": "pwd.db",
            "username_field_name": "cmsUserId"
        },
        "vlans": {
            "default_vlan": 10,
            "assignments": {},
            "assignments_if_requested": {}
        }
    }, PARTIAL_ENV_PWD_DB_SECRET, EnvironmentError),
])
def test_invalid_configs_throw_exception(config_data, env_vars, exception, monkeypatch):
    patch_env_invalid(monkeypatch, env_vars)
    path = create_temp_config(config_data)
    with pytest.raises(exception):
        Config(path)
