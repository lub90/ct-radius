from pathlib import Path
from typing import List

def get_all_files(subfolder: str, extensions: List[str]) -> List[str]:
    """
    Search for all files inside the 'fixtures/' + subfolder folder,
    that match one of the extensions (e.g. "*.yaml" or "*.env")
    starting from the current source file's directory.

    Returns:
        List[str]: A list of absolute paths to all .yaml/.yml files found.
    """
    # Resolve the path relative to the current file
    base_dir = Path(__file__).parent
    target_dir = base_dir / "fixtures" / subfolder

    # Ensure the directory exists
    if not target_dir.exists() or not target_dir.is_dir():
        raise FileNotFoundError(f"Directory not found: {target_dir}")

    # Collect all .yaml and .yml files
    files = []
    for extension in extensions:
        for file_path in target_dir.glob(extension):
            files.append(str(file_path))

    return sorted(files)