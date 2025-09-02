import requests
import uuid
import re
import json
import time

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
        login_response = self._request("post", login_url, json=login_payload)

        if not "access_token" in login_response.json():
            raise Exception("Login failed: No access token received.")

        self.access_token = login_response.json()["access_token"]

        return True

    @property
    def username(self):
        return self.username_from_guid(self.guid_user)

    def guid_from_username(self, username):
        prefix = "@ct_"
        suffix = ":chat.church.tools"
        if username.startswith(prefix) and username.endswith(suffix):
            return username[len(prefix):-len(suffix)]
        raise ValueError("Invalid username format")

    def username_from_guid(self, guid):
        return f"@ct_{guid.lower()}:chat.church.tools"

    def _headers_with_token(self):
        if not self.access_token:
            raise Exception("Access token not set. Please login first.")
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        return headers

    def _request(self, method, url, **kwargs):

        max_retries = kwargs.pop("max_retries", 5)

        for attempt in range(max_retries):
            response = requests.request(method, url, **kwargs)

            if response.status_code == 429:
                # We add an additional buffer of a quarter second
                retry_after = (response.json().get("retry_after_ms", 1000) + 250.0) / 1000.0
                print(f"429 Too Many Requests – Warte {retry_after:.2f}s (Versuch {attempt + 1}/{max_retries})...")
                time.sleep(retry_after)
                continue
            else:
                response.raise_for_status()

            return response

        raise Exception(f"Maximale Anzahl an Wiederholungen erreicht für URL: {url}")

    def create_room(self, room_name):
        create_room_url = f"{self.server_url}/_matrix/client/v3/createRoom"
        headers = self._headers_with_token()
        room_payload = {
            "name": room_name,
            "preset": "private_chat",
            "visibility": "private"
        }
        create_response = self._request("post", create_room_url, headers=headers, json=room_payload)

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

        response = self._request("put", power_levels_url, headers=headers, json=power_levels_payload)

        return room_id


    def invite_user_to_room(self, room_id, other_guid):
        invite_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/invite"
        headers = self._headers_with_token()
        invite_payload = {
            "user_id": self.username_from_guid(other_guid)
        }
        invite_response = self._request("post", invite_url, headers=headers, json=invite_payload)
        return True


    def send_message(self, room_id, message):
        txn_id = str(uuid.uuid4())
        send_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{txn_id}"
        headers = self._headers_with_token()
        message_payload = {
            "msgtype": "m.text",
            "body": message
        }
        
        send_response = self._request("put", send_url, headers=headers, json=message_payload)
        send_response.raise_for_status()

        # Return message / event_id
        return txn_id

    def delete_message(self, room_id, event_id):
        redaction_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/redact/{event_id}/{str(uuid.uuid4())}"
        headers =  self._headers_with_token()
        payload = {
            "reason": "Manual Deletion"
        }
        response = self._request("put", redaction_url, headers=headers, json=payload)
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
        response = self._request("put", edit_url, headers=headers, json=edit_payload)

        return new_event_id



    def find_messages(self, room_id, regex_pattern, user_guid, limit=100):
        headers = self._headers_with_token()
        user_id = self.username_from_guid(user_guid)

        messages_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/messages"
        params = {
            "dir": "b",  # backwards (latest first)
            "limit": limit,
            "filter": json.dumps({
                "types": ["m.room.message"]
            })
        }

        response = self._request("get", messages_url, headers=headers, params=params)

        events = response.json().get("chunk", [])

        pattern = re.compile(regex_pattern)

        # Track edited messages
        replaced_event_ids = set()

        for event in events:
            content = event.get("content", {})
            relates_to = content.get("m.relates_to", {})
            if relates_to.get("rel_type") == "m.replace":
                replaced_event_ids.add(relates_to.get("event_id"))

        matching_messages = []

        for event in events:
            if event.get("type") != "m.room.message":
                continue
            if event.get("sender") != user_id:
                continue
            if event.get("event_id") in replaced_event_ids:
                continue  # Skip messages that were edited
            content = event.get("content", {})
            body = content.get("body", "")
            if pattern.fullmatch(body):
                matching_messages.append({
                    "event_id": event.get("event_id"),
                    "body": body,
                    "timestamp": self._to_datetime( event.get("origin_server_ts") )
                })

        return matching_messages

    def last_message_sent(self, room_id, user_guid, limit=100, must_be_last_message=False):
        headers = self._headers_with_token()
        user_id = self.username_from_guid(user_guid)

        messages_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/messages"
        params = {
            "dir": "b",  # backwards (latest first)
            "limit": limit,
            "filter": json.dumps({
                "types": ["m.room.message"]
            })
        }

        response = self._request("get", messages_url, headers=headers, params=params)

        events = response.json().get("chunk", [])

        for event in events:
            if event.get("type") != "m.room.message":
                continue
            if event.get("sender") != user_id:
                if must_be_last_message:
                    return None
                else:
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


    def get_all_rooms(self):
        joined_url = f"{self.server_url}/_matrix/client/v3/joined_rooms"
        headers = self._headers_with_token()
        response = self._request("get", joined_url, headers=headers)

        return response.json().get("joined_rooms", [])

    def find_rooms(self, title_pattern):
        result = []

        # Step 1: Get joined rooms
        room_ids = self.get_all_rooms()

        # Compile regex pattern
        pattern = re.compile(title_pattern)

        # Step 2: Check each room's name and members
        for room_id in room_ids:
            # Step 2: Get room name
            name_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/state/m.room.name"
            try:
                name_response = self._request("get", name_url, headers=self._headers_with_token())
                
                room_name = name_response.json().get("name", "")
            except requests.exceptions.HTTPError:
                continue  # Skip rooms with no name

            if not pattern.fullmatch(room_name):
                continue  # Skip if name doesn't match

            result.append(room_id)

        return result

    def find_empty_rooms(self, title_pattern):
        result = []

        room_ids = self.find_rooms(title_pattern)

        for room_id in room_ids:

            # Get room members
            members_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/members"
            members_response = self._request("get", members_url, headers=self._headers_with_token())
            members_response.raise_for_status()
            members = members_response.json().get("chunk", [])

            # Filter actual members (joined or invited)
            active_members = [
                m["state_key"]
                for m in members
                if m.get("type") == "m.room.member" and
                m.get("content", {}).get("membership") in ["join", "invite"]
            ]

            # Check if room has the other user after removing me
            active_members.remove(self.username)
            if len(set(active_members)) == 0:
                result.append(room_id)

        return result

    def find_private_rooms(self, title_pattern):
        result = {}

        room_ids = self.find_rooms(title_pattern)

        for room_id in room_ids:

            # Get room members
            members_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/members"
            members_response = self._request("get", members_url, headers=self._headers_with_token())

            members = members_response.json().get("chunk", [])

            # Filter actual members (joined or invited)
            active_members = [
                m["state_key"]
                for m in members
                if m.get("type") == "m.room.member" and
                m.get("content", {}).get("membership") in ["join", "invite"]
            ]

            # Check if room has the other user after removing me
            active_members.remove(self.username)
            if len(set(active_members)) == 1:
                other_username = active_members[0]
                other_guid = self.guid_from_username(other_username)
                result[other_guid] = room_id

        return result

    def find_private_room(self, title_pattern, other_guid):

        room_ids = self.find_rooms(title_pattern)

        other_user_id = self.username_from_guid(other_guid)

        for room_id in room_ids:

            # Step 3: Get room members
            members_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/members"
            members_response = self._request("get", members_url, headers=self._headers_with_token())

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

    def delete_room(self, room_id):
        """
        Leaves the room and forgets it from the user's account.
        Note: Matrix does not support global deletion of rooms.
        """
        headers = self._headers_with_token()

        # Step 1: Leave the room
        leave_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/leave"
        leave_response = self._request("post", leave_url, headers=headers)
        leave_response.raise_for_status()

        # Step 2: Forget the room
        forget_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/forget"
        forget_response = self._request("post", forget_url, headers=headers)
        forget_response.raise_for_status()

        return True


