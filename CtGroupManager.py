import requests

class CtGroupManager:
    def __init__(self, server_url, api_user, api_pwd, timeout, username_field_name):
        self.server_url = server_url.rstrip('/')
        self.api_user = api_user
        self.api_pwd = api_pwd
        self.timeout = timeout
        self.username_field_name = username_field_name

        self.session = requests.Session()

    def login(self):
        r = self.session.post(f"{self.server_url}/api/login", json={
            "username": self.api_user,
            "password": self.api_pwd
        }, timeout=self.timeout)
        r.raise_for_status()

    def _cleanup_and_check_username(self, username):
        if not isinstance(username, str):
            raise ValueError(f"Username must be a string, got {type(username).__name__} instead!")

        if not username:
            raise ValueError("Username is empty!")
        
        # Remove leading and trailing whitespace, convert to lowercase
        return username.strip().lower()

    def get_user_groups(self, person_id):
        r = self.session.get(f"{self.server_url}/api/persons/{person_id}/groups", timeout=self.timeout)
        r.raise_for_status()
        return {int(g["group"]["domainIdentifier"]) for g in r.json()["data"]}

    def get_person_ids_from_group(self, group_id):
        members = self._get_member_data_from_group(group_id, self.username_field_name)
        return [member["personId"] for member in members]

    def _get_member_data_from_group(self, group_id, field_name, field_value = "", members_per_page=100):
        members = []

        page = 1
        page_limit = 1

        while page <= page_limit:

            response = self.session.get(
                f"{self.server_url}/api/groups/{group_id}/members",
                params={
                    "page": page,
                    "limit": members_per_page,
                    "person_"+field_name: field_value
                },
                timeout=self.timeout
            )

            response.raise_for_status()

            response_data = response.json()
            new_members = response_data.get("data")
            members.extend(new_members)
            
            # If we have more than one page, we need to update the page limit
            meta = response_data.get("meta", {})
            if "pagination" in meta and "lastPage" in meta["pagination"]:
                page_limit = meta["pagination"]["lastPage"]

            page += 1

        return members
        
    def get_person_id_from_group(self, group_id, username):
        username = self._cleanup_and_check_username(username)

        members = self._get_member_data_from_group(group_id, self.username_field_name, username)   

        # Check if we can return a member because the username matches
        for member in members:
            field_list = member.get("fields", [])
            matching_fields = [f for f in field_list if f.get("name") == self.username_field_name]
            member_username = matching_fields[0].get("value", "").strip()
            member_username = self._cleanup_and_check_username(member_username)
            if member_username == username:
                return member.get("personId")
            
        return None
