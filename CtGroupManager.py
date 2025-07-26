import requests

class CtGroupManager:
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

    def get_user_groups(self, person_id):
        if not isinstance(person_id, int):
            raise ValueError(f"Person ID must be an integer, got {type(person_id).__name__} instead!")
        
        if not person_id:
            raise ValueError("Person ID is not allowed to be None!")
        
        if person_id < 0:
            raise ValueError(f"Person ID must be a positive integer, got {person_id} instead!")

        # Fetch the groups for the given person ID
        r = self.session.get(f"{self.server_url}/api/persons/{person_id}/groups", timeout=self.timeout)
        r.raise_for_status()
        return {int(g["group"]["domainIdentifier"]) for g in r.json()["data"]}

    def get_all_members_by_id(self, group_id, page_size=100):
        members = self.get_members(group_id, page_size=page_size)
        return [member["personId"] for member in members]

    def get_members(self, group_id, field_name_filter=None, field_value_filter = "", page_size=100):

        if not isinstance(group_id, int):
            raise ValueError(f"Group ID must be an integer, got {type(group_id).__name__} instead!")
        
        if not group_id:
            raise ValueError("Group ID is not allowed to be None!")
        
        if group_id < 0:
            raise ValueError(f"Group ID must be a positive integer, got {group_id} instead!")

        params = {
                    "limit": page_size
                }
        
        if field_name_filter is not None:
            params["person_"+field_name_filter] = field_value_filter

        members = []

        page = 1
        page_limit = 1

        while page <= page_limit:

            params["page"] = page

            response = self.session.get(
                f"{self.server_url}/api/groups/{group_id}/members",
                params=params,
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
        
    def get_members_by_id_and_attribute(self, group_id, field_name, page_size=100):
        
        members = self.get_members(group_id, field_name, page_size=page_size)   

        result_members = {}

        # Check if we can return a member because the username matches
        for member in members:
            # Find the field with the given name
            field_list = member.get("fields", [])

            # If no fields are present, skip this member
            if not field_list or (len(field_list) == 0):
                continue

            matching_fields = [f for f in field_list if f.get("name") == field_name]

            # If no matching field is found, skip this member
            if len(matching_fields) == 0:
                continue

            field_value = matching_fields[0].get("value", "")

            result_members[member["personId"]] = field_value   
            
        return result_members
