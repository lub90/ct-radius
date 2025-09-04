import pytest
from unittest.mock import patch
from MockRequests import MockRequests, patch_mock_request
from churchtools import CtChatManager
import importlib
import types

import data_loader


@pytest.fixture
def mocked_requests(monkeypatch):
    """
    Stellt ein MockRequests-Objekt bereit, bei dem alle HTTP-Methoden
    standardmäßig Fehler werfen. Kann im Test angepasst werden.
    """
    result = MockRequests()
    patch_mock_request(monkeypatch, result)
    return result

@pytest.mark.parametrize("server_url, guid_user, password", data_loader.VALID_PARAMETERS)
def test_login_sends_correct_request(monkeypatch, mocked_requests, server_url, guid_user, password):
    manager = CtChatManager(server_url, guid_user, password)

    # Override post
    def mock_post(url, json):
        assert url == f"{server_url}/_matrix/client/v3/login"
        assert json["identifier"]["user"] == data_loader.username_from_guid(guid_user)
        assert json["identifier"]["type"] == "m.id.user"
        assert json["password"] == password
        assert json["type"] == "m.login.password"
        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {"access_token": "mocked-token"},
            raise_for_status=lambda: None
        )

    mocked_requests.post = mock_post
    
    manager.login()

@pytest.mark.parametrize("access_token", data_loader.VALID_ACCESS_TOKENS)
def test_login_sets_access_token_and_returns_true(mocked_requests, access_token):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="user-guid-123",
        password="securePassword!"
    )

    # Override .post method to simulate successful login
    def mock_post(url, json):
        return types.SimpleNamespace(
            status_code=200,
            json=lambda: {"access_token": access_token},
            raise_for_status=lambda: None
        )

    mocked_requests.post = mock_post

    result = manager.login()

    assert manager.access_token == access_token
    assert result is True

@pytest.mark.parametrize("status_code", [400, 401, 403, 404, 429])
def test_login_raises_on_client_error(mocked_requests, status_code):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="user-guid-123",
        password="securePassword!"
    )

    # Simulate a response object with raise_for_status that throws
    def mock_post(url, json):
        return types.SimpleNamespace(
            status_code=status_code,
            json=lambda: {},
            raise_for_status=lambda: (_ for _ in ()).throw(Exception(f"HTTP {status_code} Error"))
        )

    mocked_requests.post = mock_post

    with pytest.raises(Exception) as exc_info:
        manager.login()
