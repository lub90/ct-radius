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
def test_create_secure_room_calls_create_room_with_correct_name(mocked_requests, room_name):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    manager.access_token = "SomeAccessToken"

    called_with = []

    def mock_create_room(name):
        called_with.append(name)
        return "!mockedRoomId:chat.church.tools"

    manager.create_room = mock_create_room

    # Mock PUT to avoid exception
    mocked_requests.put = lambda url, json=None, headers=None: types.SimpleNamespace(
        status_code=200,
        json=lambda: {},
        raise_for_status=lambda: None
    )

    manager.create_secure_room(room_name)

    assert called_with == [room_name]


@pytest.mark.parametrize("room_name", data_loader.ROOM_NAMES)
def test_create_secure_room_sends_correct_power_level_request(mocked_requests, room_name):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    access_token = "SomeAccessToken"
    manager.access_token = access_token

    # Mock create_room to return a known room_id
    manager.create_room = lambda name: "!secure123:chat.church.tools"

    def mock_put(url, json=None, headers=None):
        assert url == "https://churchtools.example.com/_matrix/client/v3/rooms/!secure123:chat.church.tools/state/m.room.power_levels"
        assert headers["Authorization"] == f"Bearer {access_token}"
        assert headers["Content-Type"] == "application/json"
        assert json["users"][manager.username] == 100
        assert json["users_default"] == 0
        assert json["invite"] == 50
        assert json["kick"] == 50
        assert json["ban"] == 50
        assert json["redact"] == 50
        assert json["state_default"] == 50
        assert json["events_default"] == 0

        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None
        )

    mocked_requests.put = mock_put
    manager.create_secure_room(room_name)

@pytest.mark.parametrize("room_name, expected_room_id", data_loader.ROOM_NAME_ID_MAPPING)
def test_create_secure_room_returns_correct_room_id(mocked_requests, room_name, expected_room_id):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    manager.access_token = "SomeAccessToken"

    manager.create_room = lambda name: expected_room_id

    mocked_requests.put = lambda url, json=None, headers=None: types.SimpleNamespace(
        status_code=200,
        json=lambda: {},
        raise_for_status=lambda: None
    )

    room_id = manager.create_secure_room(room_name)
    assert room_id == expected_room_id

@pytest.mark.parametrize("status_code", [400, 401, 403, 404])
def test_create_secure_room_raises_on_power_level_error(mocked_requests, status_code):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )
    manager.access_token = "SomeAccessToken"
    manager.create_room = lambda name: "!secure123:chat.church.tools"

    def mock_put(url, json=None, headers=None):
        return types.SimpleNamespace(
            status_code=status_code,
            json=lambda: {},
            raise_for_status=lambda: (_ for _ in ()).throw(Exception(f"HTTP {status_code} Error"))
        )

    mocked_requests.put = mock_put

    with pytest.raises(Exception) as exc_info:
        manager.create_secure_room("SecureTestRoom")

    assert f"HTTP {status_code}" in str(exc_info.value)



