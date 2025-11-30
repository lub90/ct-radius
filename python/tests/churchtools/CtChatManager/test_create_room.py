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

@pytest.mark.parametrize("room_name", data_loader.ROOM_NAMES)
def test_create_room_sends_correct_request(mocked_requests, room_name):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    # Set access token, beacuse otherwise we will receive an exception
    access_token = "SomeAccessToken"
    manager.access_token = access_token

    def mock_post(url, json=None, headers=None):
        assert url == "https://churchtools.example.com/_matrix/client/v3/createRoom"
        assert headers["Authorization"] == f"Bearer {access_token}"
        assert headers["Content-Type"] == "application/json"
        assert json["name"] == room_name
        assert json["preset"] == "private_chat"
        assert json["visibility"] == "private"

        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {"room_id": "!abc123:chat.church.tools"},
            raise_for_status=lambda: None
        )

    mocked_requests.post = mock_post
    manager.create_room(room_name)

@pytest.mark.parametrize("room_name, expected_room_id", data_loader.ROOM_NAME_ID_MAPPING)
def test_create_room_returns_correct_room_id(mocked_requests, room_name, expected_room_id):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    # Set access token, beacuse otherwise we will receive an exception
    manager.access_token = "SomeAccessToken"

    def mock_post(url, json=None, headers=None):
        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {"room_id": expected_room_id},
            raise_for_status=lambda: None
        )

    mocked_requests.post = mock_post
    room_id = manager.create_room(room_name)
    assert room_id == expected_room_id


@pytest.mark.parametrize("status_code", [400, 401, 403, 404])
def test_create_room_raises_on_client_error(mocked_requests, status_code):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    # Set access token, beacuse otherwise we will receive an exception
    manager.access_token = "SomeAccessToken"

    def mock_post(url, json=None, headers=None):
        return types.SimpleNamespace(
            status_code=status_code,
            json=lambda: {},
            raise_for_status=lambda: (_ for _ in ()).throw(Exception(f"HTTP {status_code} Error"))
        )

    mocked_requests.post = mock_post

    with pytest.raises(Exception) as exc_info:
        manager.create_room("TestRoom")

@pytest.mark.parametrize("room_name", data_loader.ROOM_NAMES)
def test_create_room_raises_if_room_id_missing(mocked_requests, room_name):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    # Set access token, beacuse otherwise we will receive an exception
    manager.access_token = "SomeAccessToken"

    def mock_post(url, json=None, headers=None):
        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None
        )

    mocked_requests.post = mock_post

    with pytest.raises(ValueError) as exc_info:
        manager.create_room(room_name)

