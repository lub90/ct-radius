import os

VALID_CONFIGS = [
    os.path.join(os.path.dirname(__file__), "./valid_config_1.yaml")
]

PERSON_DATA = {
    "1": {
        "username": "PixelNomad",
        "group_ids": [1, 100],
        "pwd": "Wq7mNz8VrK",
        "default_vlan": 10,
        "requested_vlan": 10
    },
    "2": {
        "username": "echoverse",
        "group_ids": [3, 100],
        "pwd": "pa!ss2",
        "default_vlan": 30,
        "requested_vlan": 1
    },
    "3": {
        "username": "CodeWarden23",
        "group_ids": [5, 100, 200],
        "pwd": "Xp4m\\Tx9RwL1d",
        "default_vlan": 1,
        "requested_vlan": 50
    },
    "4": {
        "username": "multiuser",
        "group_ids": [1, 2, 200],
        "pwd": "aX9vLq2T",
        "default_vlan": 10,
        "requested_vlan": 10
    },
    "5": {
        "username": "overlap",
        "group_ids": [1, 5, 200],
        "pwd": "Qw6vNz&8KpT3sLm9X",
        "default_vlan": 10,
        "requested_vlan": 50
    },
    "6": {
        "username": "userX",
        "group_ids": [200],
        "pwd": "passX$",
        "default_vlan": 1,
        "requested_vlan": 1
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
    return [(data["username"], data["pwd"], data["default_vlan"]) for person_id, data in PERSON_DATA.items() if person_id in valid_users()]

def get_user_names_pwds_requested_vlan():
    return [(data["username"], data["pwd"], data["requested_vlan"]) for person_id, data in PERSON_DATA.items() if person_id in valid_users()]

def get_user_names_pwds_requested_invalid_vlan():
    result = []
    for person_id, data in PERSON_DATA.items():
        if "requested_vlan" in data:
            vlan = data["requested_vlan"] + 1
        else:
            vlan = 10
        result.append( (data["username"], data["pwd"], vlan) )
    return result

def get_not_allowed_users():
    return invalid_users() + ["nonexistent", "Karl Otto", "Friedrich"]

def generate_username_variants(s):
    if not s:
        return ["", "", "", ""]

    # First: prepend with a whitespace
    variant1 = " " + s

    # Second: all capital letters
    variant2 = s.upper()

    # Third: capitalize the middle letter
    mid_index = len(s) // 2
    variant3 = (
        s[:mid_index] + s[mid_index].upper() + s[mid_index + 1:]
        if len(s) > 0
        else ""
    )

    # Fourth: append a whitespace character
    variant4 = s + " "

    return [variant1, variant2, variant3, variant4]

def get_user_names_variants_pwds_default_vlan():
    result = []
    for person_id, data in PERSON_DATA.items():
        if person_id in valid_users():
            for username_variant in generate_username_variants(data["username"]):
                result.append(
                    (username_variant, data["pwd"], data["default_vlan"])  
                )

    return result

def get_invalid_usernames():
    return [
        "gY2v@pLzJw!eTqM9bN^uZfA1oVhCTyQmB",
        "a9K3bX7mQ2LzT8vWfR1oNcY6dJpE0uMhZxA5sVqB4CgTw",
        "",
        23,
        0x498
    ]

def valid_users():
    return [u for u in PERSON_DATA if u not in ["7"]]

def invalid_users():
    return [u for u in PERSON_DATA if u not in valid_users()]




