import requests
import uuid
import re


class CtChatManager:

    def __init__(self, server_url, username, password):
        self.server_url = server_url
        self.username = username
        self.password = password
        self.access_token = None

    
    def login(self):
        login_url = f"{self.server_url}/_matrix/client/v3/login"
        login_payload = {
            "type": "m.login.password",
            "identifier": {
                "type": "m.id.user",
                "user": self.username.split(":")[0][1:]
            },
            "password": self.password
        }
        login_response = requests.post(login_url, json=login_payload)

        login_response.raise_for_status()

        if not "access_token" in login_response.json():
            raise Exception("Login failed: No access token received.")

        self.access_token = login_response.json()["access_token"]

        return True


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
        # TODO: check if room_id variable exists, if not raise Exception
        return create_response.json()["room_id"]


    def invite_user_to_room(self, room_id, other_username):
        invite_url = f"{self.server_url}/_matrix/client/v3/rooms/{room_id}/invite"
        headers = self._headers_with_token()
        invite_payload = {
            "user_id": other_username
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
                    "event_id": event["event_id"],
                    "body": body
                })

        return matching_messages


