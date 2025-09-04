import pytest
from churchtools import CtChatManager
import data_loader

@pytest.mark.parametrize("guid_user, expected_username", data_loader.GUID_USERNAME_MAPPING)
def test_username(guid_user, expected_username):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user=guid_user,
        password="irrelevant"
    )

    assert manager.username == expected_username

@pytest.mark.parametrize("guid_user, expected_username", data_loader.GUID_USERNAME_MAPPING)
def test_username_from_guid(guid_user, expected_username):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )

    assert manager.username_from_guid(guid_user) == expected_username


@pytest.mark.parametrize("guid_user, expected_username", data_loader.GUID_USERNAME_MAPPING)
def test_guid_from_username(guid_user, expected_username):
    manager = CtChatManager(
        server_url="https://churchtools.example.com",
        guid_user="someUser",
        password="irrelevant"
    )

    assert manager.guid_from_username(expected_username) == guid_user.lower()