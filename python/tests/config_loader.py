import yaml
from pathlib import Path
from typing import List
from fixture_loader import get_all_files

def get_all_yaml_files(subfolder: str) -> List[str]:
    return get_all_files(subfolder, ["*.yaml", "*.yml"])

def get_invalid_configs() -> List[str]:
    return get_all_yaml_files("invalid_configs")

def get_valid_configs() -> List[str]:
    return get_all_yaml_files("valid_configs")

def load_raw_configs(filepath):
    with open(filepath, "r") as file:
        return yaml.safe_load(file)