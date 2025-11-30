import pytest
from churchtools import CtChatManager  # Pfad ggf. anpassen
import data_loader

@pytest.mark.parametrize("server_url, guid_user, password", data_loader.VALID_PARAMETERS)
def test_constructor_sets_attributes_correctly(server_url, guid_user, password):
    manager = CtChatManager(
        server_url=server_url,
        guid_user=guid_user,
        password=password
    )

    assert manager.server_url == server_url
    assert manager.guid_user == guid_user
    assert manager.password == password
    assert manager.access_token is None

@pytest.mark.parametrize("server_url, guid_user, password", data_loader.INVALID_PARAMETERS)
def test_constructor_raises_value_error_on_invalid_inputs(server_url, guid_user, password):
    with pytest.raises(ValueError) as exc_info:
        CtChatManager(
            server_url=server_url,
            guid_user=guid_user,
            password=password
        )
