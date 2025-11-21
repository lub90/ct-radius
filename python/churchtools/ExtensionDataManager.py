import json
from typing import Optional, List, Dict, Any
from .AbstractCtManager import AbstractCtManager  # adjust import path as needed


class ExtensionDataManager(AbstractCtManager):

    def __init__(self, server_url: str, api_user: str, api_pwd: str, timeout: int, extension_key: str) -> None:
        super().__init__(server_url, api_user, api_pwd, timeout)
        self.login()

        self.extension_key: str = extension_key
        self.module_id: Optional[int] = None
        self.categories: Optional[List[Dict[str, Any]]] = None

    def _resolve_module_id(self) -> int:
        if self.module_id is not None:
            return self.module_id

        url = f"{self.server_url}/api/custommodules/{self.extension_key}"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        try:
            self.module_id = data["data"]["id"]
        except (KeyError, TypeError):
            raise RuntimeError("Module ID not found")
        return self.module_id

    def _fetch_categories(self) -> List[Dict[str, Any]]:
        if self.categories is not None:
            return self.categories

        module_id = self._resolve_module_id()
        url = f"{self.server_url}/api/custommodules/{module_id}/customdatacategories"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        self.categories = resp.json()["data"]
        return self.categories

    def get_category_by_name(self, name: str) -> Dict[str, Any]:
        categories = self._fetch_categories()
        for category in categories:
            if category.get("name") == name:
                return category
        raise RuntimeError(f'Category "{name}" not found.')

    def get_category_data(self, name: str, single: bool = False) -> Any:
        category = self.get_category_by_name(name)
        url = f"{self.server_url}/api/custommodules/{category['customModuleId']}/customdatacategories/{category['id']}/customdatavalues"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        result = resp.json()["data"]

        if single:
            return result[0]
        return result

    def create_category_entry(self, name: str, data: Dict[str, Any]) -> int:
        module_id = self._resolve_module_id()
        category = self.get_category_by_name(name)

        payload = {
            "dataCategoryId": category["id"],
            "value": json.dumps(data),
        }

        url = f"{self.server_url}/api/custommodules/{module_id}/customdatacategories/{category['id']}/customdatavalues"
        resp = self.session.post(url, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        body = resp.json()

        try:
            return body["data"]["id"]
        except (KeyError, TypeError):
            raise RuntimeError("Failed to create entry")

    def update_category_entry(self, name: str, value_id: int, data: Dict[str, Any]) -> int:
        module_id = self._resolve_module_id()
        category = self.get_category_by_name(name)

        payload = {
            "dataCategoryId": category["id"],
            "id": value_id,
            "value": json.dumps(data),
        }

        url = f"{self.server_url}/api/custommodules/{module_id}/customdatacategories/{category['id']}/customdatavalues/{value_id}"
        resp = self.session.put(url, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        body = resp.json()

        try:
            return body["data"]["id"]
        except (KeyError, TypeError):
            raise RuntimeError("Failed to update entry")

    def delete_category_entry(self, name: str, value_id: int) -> None:
        module_id = self._resolve_module_id()
        category = self.get_category_by_name(name)

        url = f"{self.server_url}/api/custommodules/{module_id}/customdatacategories/{category['id']}/customdatavalues/{value_id}"
        resp = self.session.delete(url, timeout=self.timeout)
        resp.raise_for_status()
