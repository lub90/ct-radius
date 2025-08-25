import os
import yaml

VALID_CONFIGS = [
    os.path.join(os.path.dirname(__file__), "./valid_config_1.yaml"),
    os.path.join(os.path.dirname(__file__), "./valid_config_2.yaml"),
    os.path.join(os.path.dirname(__file__), "./valid_config_3.yaml"),
    os.path.join(os.path.dirname(__file__), "./valid_config_4.yaml")
]


INVALID_CONFIGS = [
    os.path.join(os.path.dirname(__file__), "./invalid_config_1.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_2.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_3.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_4.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_5.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_6.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_7.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_8.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_9.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_10.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_11.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_12.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_13.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_14.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_15.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_16.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_17.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_18.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_19.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_20.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_21.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_22.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_23.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_24.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_25.yaml"),
    os.path.join(os.path.dirname(__file__), "./invalid_config_26.yaml")
]




def load_raw_configs(filepath):
    with open(filepath, "r") as file:
        return yaml.safe_load(file)