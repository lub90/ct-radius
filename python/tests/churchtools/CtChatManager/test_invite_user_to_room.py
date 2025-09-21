import pytest
from churchtools import CtChatManager
import data_loader
from MockRequests import MockRequests, patch_mock_request
import types

@pytest.fixture
def mocked_requests(monkeypatch):
    result = MockRequests()
    patch_mock_request(monkeypatch, result)
    return result


@pytest.mark.parametrize("room_id, username", data_loader.ROOM_ID_USERNAME_MAPPING)
def test_invite_user_to_room_sends_correct_request(mocked_requests, room_id, username):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    access_token = "Some1234AccessToken"
    manager.access_token = access_token

    def mock_post(url, json=None, headers=None):
        assert url == f"https://churchtools.example.com/_matrix/client/v3/rooms/{room_id}/invite"
        assert headers["Authorization"] == f"Bearer {access_token}"
        assert headers["Content-Type"] == "application/json"
        assert json["user_id"] == username

        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None
        )

    mocked_requests.post = mock_post
    manager.invite_user_to_room(room_id, username)
