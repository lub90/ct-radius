import os
import tempfile
import pytest
from PasswordDatabase import PasswordDatabase  # Adjust to actual import path

@pytest.fixture
def pwd_db():
    # Use a temporary file for isolated tests
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        path = tmpfile.name
    # We remove the path so that the database does not exist...
    os.remove(path)
    db = PasswordDatabase(path, encryption_password="testkey123")
    yield db
    db.db.close()
    os.remove(path)

def test_set_and_get_password(pwd_db):
    pwd_db.setPwd(1, "abc123dk02km,dl")
    assert pwd_db.getPwd(1) == "abc123dk02km,dl"

def test_update_existing(pwd_db):
    pwd_db.setPwd(2, "initialhj9d;.jh")
    pwd_db.update(2, "updated9jdkpl;uo")
    assert pwd_db.getPwd(2) == "updated9jdkpl;uo"

def test_update_nonexistent_raises(pwd_db): 
    with pytest.raises(KeyError):
        pwd_db.update(99, "faildl-;'dl;sop;dil")

def test_containsUser(pwd_db):
    assert not pwd_db.containsUser(3)
    pwd_db.setPwd(3, "hiddendhka;0d.;ou")
    assert pwd_db.containsUser(3)

def test_user_id_type_check(pwd_db):
    with pytest.raises(TypeError):
        pwd_db.setPwd("not-an-int", "pwdfjls0l;a.djiso;sil")

def test_negative_user_id_rejected(pwd_db):
    with pytest.raises(ValueError):
        pwd_db.setPwd(-5, "badpwd")

# --- User ID validity checks ---
def test_empty_user_id_rejected(pwd_db):
    with pytest.raises(TypeError):
        pwd_db.setPwd("", "validPassword123")

def test_none_user_id_rejected(pwd_db):
    with pytest.raises(TypeError):
        pwd_db.setPwd(None, "validPassword123")

# --- Password validity checks ---
def test_empty_password_rejected(pwd_db):
    with pytest.raises(ValueError):
        pwd_db.setPwd(10, "")

def test_none_password_type_rejected(pwd_db):
    with pytest.raises(TypeError):
        pwd_db.setPwd(11, None)

def test_short_password_rejected(pwd_db):
    with pytest.raises(ValueError):
        pwd_db.setPwd(12, "short")

# --- Deletion tests ---
def test_user_deletion_existing_user(pwd_db):
    pwd_db.setPwd(20, "SecurePass123")
    
    # Confirm presence before deletion
    assert pwd_db.containsUser(20)
    assert pwd_db.getPwd(20) == "SecurePass123"
    
    # Delete the user
    pwd_db.deleteUser(20)
    
    # Ensure user is gone
    assert not pwd_db.containsUser(20)
    
    # Ensure password retrieval fails
    with pytest.raises(KeyError):
        pwd_db.getPwd(20)


def test_user_deletion_nonexistent_user(pwd_db):
    # Should not raise an exception even if the user doesn't exist
    pwd_db.deleteUser(999)
    # Confirm it's still not in the DB
    assert not pwd_db.containsUser(999)

def test_user_deletion_invalid_id_type(pwd_db):
    with pytest.raises(TypeError):
        pwd_db.deleteUser("not-an-int")

def test_user_deletion_negative_id(pwd_db):
    with pytest.raises(ValueError):
        pwd_db.deleteUser(-8)

def test_user_deletion_removes_only_target_user(pwd_db):
    # Set up multiple users
    pwd_db.setPwd(101, "UserOnePass")
    pwd_db.setPwd(102, "UserTwoPass")
    pwd_db.setPwd(103, "UserThreePass")

    # Delete one user
    pwd_db.deleteUser(102)

    # Ensure user is gone
    assert not pwd_db.containsUser(102)

    # Confirm deleted user's password is no longer accessible
    with pytest.raises(KeyError):
        pwd_db.getPwd(102)

    # Confirm other users are still intact
    assert pwd_db.getPwd(101) == "UserOnePass"
    assert pwd_db.getPwd(103) == "UserThreePass"



