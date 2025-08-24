import requests
import uuid
import re

from datetime import datetime


class CtChatManager:

    def __init__(self, server_url, guid_user, password):
        self.server_url = server_url
        self.guid_user = guid_user
        self.password = password
        self.access_token = None

    
    def login(self):
        login_url = f"{self.server_url}/_matrix/client/v3/login"
        login_payload = {
            "type": "m.login.password",
            "identifier": {
                "type": "m.id.user",
                "user": self.username
            },
            "password": self.password
        }
        login_response = requests.post(login_url, json=login_payload)

        login_response.raise_for_status()

        if not "access_token" in login_response.json():
            raise Exception("Login failed: No access token received.")

        self.access_token = login_response.json()["access_token"]

        return True

    @property
    def username(self):
        return self._username_from_guid(self.guid_user)

    def _username_from_guid(self, guid):
        return f"@ct_{guid.lower()}:chat.church.tools"

    def _headers_with_token(self):
        if not self.access_token:
            raise Exception("Access token not set. Please login first.")
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        return headers

    def create_room(self, room_name):
        create_room_url = f"{self.server_url}/_matrix/client/v3/createRoom"
        headers = self._headers_with_token()
        room_payload = {
            "name": room_name,
            "preset": "private_chat",
            "visibility": "private"
        }
        create_response = requests.post(create_room_url, headers=headers, json=room_payload)
        create_response.raise_for_status()

        if not "room_id" in create_response.json():
             raise Exception("Room creation failed: No room_id returned.")

        return create_response.json()["room_id"]

    def create_secure_room(self, room_name):
        room_id = self.create_room(room_name)

        power_levels_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/state/m.room.power_levels"
        headers = self._headers_with_token()

        power_levels_payload = {
            "users": {
                self.username: 100
            },
            "users_default": 0,
            "invite": 50,
            "kick": 50,
            "ban": 50,
            "redact": 50,
            "state_default": 50,
            "events_default": 0
        }

        response = requests.put(power_levels_url, headers=headers, json=power_levels_payload)

        response.raise_for_status()

        return room_id


    def invite_user_to_room(self, room_id, other_guid):
        invite_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/invite"
        headers = self._headers_with_token()
        invite_payload = {
            "user_id": self._username_from_guid(other_guid)
        }
        invite_response = requests.post(invite_url, headers=headers, json=invite_payload)
        invite_response.raise_for_status()
        return True


    def send_message(self, room_id, message):
        txn_id = str(uuid.uuid4())
        send_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{txn_id}"
        headers = self._headers_with_token()
        message_payload = {
            "msgtype": "m.text",
            "body": message
        }
        send_response = requests.put(send_url, headers=headers, json=message_payload)
        send_response.raise_for_status()

        # Return message / event_id
        return txn_id

    def delete_message(self, room_id, event_id):
        redaction_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/redact/{event_id}/{str(uuid.uuid4())}"
        headers =  self._headers_with_token()
        payload = {
            "reason": "Manual Deletion"
        }
        response = requests.put(redaction_url, headers=headers, json=payload)
        response.raise_for_status()
        return True

    def edit_message(self, room_id, original_event_id, new_body):
        new_event_id = str(uuid.uuid4())
        edit_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{new_event_id}"
        headers = self._headers_with_token()
        edit_payload = {
            "msgtype": "m.text",
            "body": new_body,  # Fallback for older clients
            "m.new_content": {
                "msgtype": "m.text",
                "body": new_body
            },
            "m.relates_to": {
                "rel_type": "m.replace",
                "event_id": original_event_id
            }
        }
        response = requests.put(edit_url, headers=headers, json=edit_payload)
        response.raise_for_status()

        return new_event_id



    def find_messages(self, room_id, regex_pattern, user_id, limit=200):
        headers = self._headers_with_token()

        messages_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/messages"
        params = {
            "dir": "b",  # backwards (latest first)
            "limit": limit,
            "filter": {
                "types": ["m.room.message"]
            }
        }

        response = requests.get(messages_url, headers=headers, params=params)
        response.raise_for_status()
        events = response.json().get("chunk", [])

        pattern = re.compile(regex_pattern)
        matching_messages = []

        for event in events:
            if event.get("type") != "m.room.message":
                continue
            if event.get("sender") != user_id:
                continue
            content = event.get("content", {})
            body = content.get("body", "")
            if pattern.fullmatch(body):
                matching_messages.append({
                    "event_id": event.get("event_id"),
                    "body": body
                    "timestamp": self._to_datetime( event.get("origin_server_ts") )
                })

        return matching_messages

    def last_message_sent(self, room_id, user_guid, limit=100):
        headers = self._headers_with_token()
        user_id = self._username_from_guid(user_guid)

        messages_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/messages"
        params = {
            "dir": "b",  # backwards (latest first)
            "limit": limit,
            "filter": {
                "types": ["m.room.message"]
            }
        }

        response = requests.get(messages_url, headers=headers, params=params)
        response.raise_for_status()
        events = response.json().get("chunk", [])

        for event in events:
            if event.get("type") != "m.room.message":
                continue
            if event.get("sender") != user_id:
                continue
            content = event.get("content", {})
            body = content.get("body", "")
            return {
                "event_id": event.get("event_id"),
                "body": body,
                "timestamp": self._to_datetime( event.get("origin_server_ts") )
            }

        return None  # No message found


    def _to_datetime(self, timestamp_ms):
        """Converts Matrix-Timestamp (ms) in UTC datetime object."""
        timestamp_sec = timestamp_ms / 1000
        return datetime.utcfromtimestamp(timestamp_sec)


    def find_room(self, title_pattern, other_guid):
        

        # Step 1: Get joined rooms
        joined_url = f"{self.server_url}/_matrix/client/v3/joined_rooms"
        headers = self._headers_with_token()
        response = requests.get(joined_url, headers=headers)
        response.raise_for_status()
        room_ids = response.json().get("joined_rooms", [])

        # Compile regex pattern
        pattern = re.compile(title_pattern)
        other_user_id = self._username_from_guid(other_guid)

        # Step 2: Check each room's name and members
        for room_id in room_ids:
            # Step 2: Get room name
            name_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/state/m.room.name"
            try:
                name_response = requests.get(name_url, headers=headers)
                name_response.raise_for_status()
                room_name = name_response.json().get("name", "")
            except requests.exceptions.HTTPError:
                continue  # Skip rooms with no name

            if not pattern.fullmatch(room_name):
                continue  # Skip if name doesn't match

            # Step 3: Get room members
            members_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/members"
            members_response = requests.get(members_url, headers=headers)
            members_response.raise_for_status()
            members = members_response.json().get("chunk", [])

            # Filter actual members (joined or invited)
            active_members = [
                m["state_key"]
                for m in members
                if m.get("type") == "m.room.member" and
                m.get("content", {}).get("membership") in ["join", "invite"]
            ]

            # Check if room has exactly you and the other user
            if set(active_members) == {self.username, other_user_id}:
                return room_id

        return False



