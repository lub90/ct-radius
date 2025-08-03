# --- ENV configs for different scenarios ---
FULL_ENV_1 = {
    "CT_SERVER_URL": "https://example.com",
    "CT_API_USER": "admin",
    "CT_API_USER_PWD": "securepassword",
    "PWD_DB_SECRET": "topsecret"
}

FULL_ENV_2 = {
    "CT_SERVER_URL": "https://api.devcloud.io",
    "CT_API_USER": "user_dev_93",
    "CT_API_USER_PWD": "d3vP@ssw0rd!",
    "PWD_DB_SECRET": "alpha_secret_01"
}

FULL_ENV_3 = {
    "CT_SERVER_URL": "https://services.staginghub.net",
    "CT_API_USER": "stage_user_17",
    "CT_API_USER_PWD": "St@g3Acc3ss#2025",
    "PWD_DB_SECRET": "beta_secret_02"
}

FULL_ENV_4 = {
    "CT_SERVER_URL": "https://backend.testingzone.org",
    "CT_API_USER": "test_admin_42",
    "CT_API_USER_PWD": "T3st!ngP@ss987",
    "PWD_DB_SECRET": "gamma_secret_03"
}

FULL_ENV_5 = {
    "CT_SERVER_URL": "https://platform.prodengine.com",
    "CT_API_USER": "prod_user_88",
    "CT_API_USER_PWD": "Pr0duct!0n#Key",
    "PWD_DB_SECRET": "delta_secret_04"
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


VALID_ENVS = [FULL_ENV_1, FULL_ENV_2, FULL_ENV_3, FULL_ENV_4, FULL_ENV_5]
INVALID_ENVS = [PARTIAL_ENV_CT_SERVER_URL, PARTIAL_ENV_CT_API_USER, PARTIAL_ENV_CT_API_USER_PWD, PARTIAL_ENV_PWD_DB_SECRET, EMPTY_ENV]