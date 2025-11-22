from pathlib import Path
from typing import List, Dict
from dotenv import dotenv_values
from fixture_loader import get_all_files

def get_all_env_files(subfolder: str) -> List[Path]:
    return get_all_files(subfolder, ["*.env"])


def load_env_file(env_file: Path) -> Dict[str, str]:
    """
    Load a single .env file and return its contents as a dictionary.

    Args:
        env_file (Path): Path to the .env file.

    Returns:
        Dict[str, str]: Key-value pairs from the .env file.
    """
    return dotenv_values(env_file)


def get_invalid_envs() -> List[Dict[str, str]]:
    """
    Load all .env files from fixtures/invalid_envs and return them as dictionaries.
    """
    env_files = get_all_env_files("invalid_envs")
    return [load_env_file(f) for f in env_files]


def get_valid_envs() -> List[Dict[str, str]]:
    """
    Load all .env files from fixtures/valid_envs and return them as dictionaries.
    """
    env_files = get_all_env_files("valid_envs")
    return [load_env_file(f) for f in env_files]
