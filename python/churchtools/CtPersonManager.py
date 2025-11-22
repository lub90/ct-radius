from .CtBasedService import CtBasedService

class CtPersonManager(CtBasedService):

    def who_am_i(self):
        response = self.churchtoolsClient.get("whoami")

        response.raise_for_status()

        data = response.json()

        try:
            result = data["data"]
            return result
        except KeyError:
            raise ValueError("Cannot extract personal data from response.")


    def get_person(self, person_id: int) -> dict:
        response = self.churchtoolsClient.get(f"/persons/{person_id}")
        response.raise_for_status()

        data = response.json()
        if "data" not in data:
            raise ValueError("No valid person data in the response.")

        return data["data"]

