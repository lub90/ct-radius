import requests

class AbstractCtManager:

    def __init__(self, server_url, api_user, api_pwd, timeout):
        self.server_url = server_url.rstrip('/')
        self.api_user = api_user
        self.api_pwd = api_pwd
        self.timeout = timeout

        self.session = requests.Session()

    def login(self):
        r = self.session.post(f"{self.server_url}/api/login", json={
            "username": self.api_user,
            "password": self.api_pwd
        }, timeout=self.timeout)
        r.raise_for_status()