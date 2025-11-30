import requests

class ChurchtoolsClient:
    def __init__(self, server_url, api_user, api_pwd, timeout=30):
        self.server_url = server_url.rstrip('/')
        self.api_user = api_user
        self.api_pwd = api_pwd
        self.timeout = timeout
        self.session = requests.Session()

    def _full_url(self, path: str) -> str:
        """Build full API URL with /api/ prefix"""
        path = path.lstrip('/')  # avoid double slashes
        return f"{self.server_url}/api/{path}"

    def login(self):
        """Authenticate against ChurchTools API"""
        r = self.post(
            "/login",
            json={"username": self.api_user, "password": self.api_pwd}
        )
        r.raise_for_status()
        return r

    def get(self, path: str, **kwargs):
        """Forward GET request to session with prefixed URL"""
        return self.session.get(self._full_url(path), timeout=self.timeout, **kwargs)

    def post(self, path: str, data=None, json=None, **kwargs):
        """Forward POST request to session with prefixed URL"""
        return self.session.post(self._full_url(path), data=data, json=json,
                                 timeout=self.timeout, **kwargs)

    def put(self, path: str, data=None, json=None, **kwargs):
        """Forward PUT request to session with prefixed URL"""
        return self.session.put(self._full_url(path), data=data, json=json,
                                timeout=self.timeout, **kwargs)

    def delete(self, path: str, **kwargs):
        """Forward DELETE request to session with prefixed URL"""
        return self.session.delete(self._full_url(path), timeout=self.timeout, **kwargs)