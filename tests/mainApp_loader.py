import os

VALID_CONFIGS = [
    os.path.join(os.path.dirname(__file__), "./valid_config_1.yaml")
]

PERSON_DATA = {
    "1": {
        "username": "PixelNomad",
        "group_ids": [1, 100],
        "pwd": "Wq7mNz8VrK",
        "default_vlan": 10
    },
    "2": {
        "username": "echoverse",
        "group_ids": [3, 100],
        "pwd": "pa!ss2",
        "default_vlan": 30
    },
    "3": {
        "username": "CodeWarden23",
        "group_ids": [5, 100, 200],
        "pwd": "Xp4m\Tx9RwL1d",
        "default_vlan": 1
    },
    "4": {
        "username": "multiuser",
        "group_ids": [1, 2, 200],
        "pwd": "aX9vLq2T",
        "default_vlan": 10
    },
    "5": {
        "username": "overlap",
        "group_ids": [1, 5, 200],
        "pwd": "Qw6vNz&8KpT3sLm9X",
        "default_vlan": 10
    },
    "6": {
        "username": "userX",
        "group_ids": [200],
        "pwd": "passX$",
        "default_vlan": 1
    },
    "7": {
        "username": "None",
        "group_ids": [],
        "pwd": "random"
    }
}


def get_group_members():
    members = {}

    for pid, data in PERSON_DATA.items():
        username = data["username"]
        for gid in data["group_ids"]:
            if gid not in members:
                members[gid] = {}
            members[gid][pid] = username

    return members


def get_user_groups():
    group_map = {
        pid: data["group_ids"]
        for pid, data in PERSON_DATA.items()
    }

    return lambda pid: group_map.get(pid, [])

def get_user_pwds():
    group_map = {
        pid: data["pwd"]
        for pid, data in PERSON_DATA.items()
    }

    return lambda pid: group_map.get(pid)

def get_user_names_pwds_default_vlan():
    return [(data["username"], data["pwd"], data["default_vlan"]) for person_id, data in PERSON_DATA.items() if person_id != "7"]

def get_nonexistent_users():
    return ["7", "nonexistent", "Karl Otto", "Friedrich"]




