from AbstractCtManager import AbstractCtManager

class CtPersonManager(AbstractCtManager):

    def my_guid(self):

        url = f"{self.server_url}/api/whoami"
        response = self.session.get(url, timeout=self.timeout)

        response.raise_for_status()

        data = response.json()

        try:
            guid = data["data"]["guid"]
            return guid
        except KeyError:
            raise ValueError("Cannot extract guid from response.")
