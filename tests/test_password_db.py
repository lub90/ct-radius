import os
import tempfile
import pytest
from PasswordDatabase import PasswordDatabase  # Adjust to actual import path

@pytest.fixture
def pwd_db():
    # Use a temporary file for isolated tests
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        path = tmpfile.name
    db = PasswordDatabase(path, encryption_password="testkey123")
    yield db
    db.db.close()
    os.remove(path)

def test_set_and_get_password(pwd_db):
    pwd_db.setPwd(1, "abc123")
    assert pwd_db.getPwd(1) == "abc123"

def test_update_existing(pwd_db):
    pwd_db.setPwd(2, "initial")
    pwd_db.update(2, "updated")
    assert pwd_db.getPwd(2) == "updated"

def test_update_nonexistent_raises(pwd_db):
    with pytest.raises(KeyError):
        pwd_db.update(99, "fail")

def test_containsUser(pwd_db):
    assert not pwd_db.containsUser(3)
    pwd_db.setPwd(3, "hidden")
    assert pwd_db.containsUser(3)

def test_user_id_type_check(pwd_db):
    with pytest.raises(TypeError):
        pwd_db.setPwd("not-an-int", "pwd")

def test_negative_user_id_rejected(pwd_db):
    with pytest.raises(ValueError):
        pwd_db.setPwd(-5, "badpwd")

