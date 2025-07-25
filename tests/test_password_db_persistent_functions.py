import os
import tempfile
import pytest
from PasswordDatabase import PasswordDatabase

@pytest.fixture
def temp_db_path():
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        path = tmpfile.name
    os.remove(path)  # dbm needs file to be absent
    yield path
    if os.path.exists(path):
        os.remove(path)

def test_password_database_context_manager(temp_db_path):
    # Ensure context manager opens and closes the database properly
    with PasswordDatabase(temp_db_path, encryption_password="key123") as db:
        db.setPwd(1, "Secret123!")
        assert db.getPwd(1) == "Secret123!"
        assert db.containsUser(1)

    # After context block, internal db should be closed
    with pytest.raises(Exception):
        db.setPwd(2, "AnotherPass!")  # Should raise since db is closed

def test_encryption_key_isolation(temp_db_path):
    # Create a database with one password
    with PasswordDatabase(temp_db_path, encryption_password="originalKey") as db1:
        db1.setPwd(42, "MyEncryptedPass!")

    # Try reading it with a different key
    with PasswordDatabase(temp_db_path, encryption_password="wrongKey") as db2:
        # Even containsUser might fail depending on how data is decrypted
        with pytest.raises(Exception):
            db2.getPwd(42)


def test_read_persisted_user_with_same_password(temp_db_path):
    # First session: create and save user
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db1:
        db1.setPwd(1001, "Persist123!")
        assert db1.containsUser(1001)

    # Second session: reopen and verify user exists
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db2:
        assert db2.containsUser(1001)
        assert db2.getPwd(1001) == "Persist123!"

def test_update_persisted_user_with_same_password(temp_db_path):
    # Session 1: create user
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db1:
        db1.setPwd(1002, "InitialPwd123!")

    # Session 2: update user
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db2:
        db2.update(1002, "UpdatedPwd456!")
        assert db2.getPwd(1002) == "UpdatedPwd456!"

    # Session 3: verify update persisted
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db3:
        assert db3.getPwd(1002) == "UpdatedPwd456!"
        assert db3.containsUser(1002)

def test_containsUser_consistency_across_sessions(temp_db_path):
    # Session 1: add users
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db1:
        db1.setPwd(1003, "CheckMe!")
        db1.setPwd(1004, "AlsoHere!")

    # Session 2: check containsUser and getPwd
    with PasswordDatabase(temp_db_path, encryption_password="sharedKey") as db2:
        assert db2.containsUser(1003)
        assert db2.containsUser(1004)
        assert db2.getPwd(1003) == "CheckMe!"
        assert db2.getPwd(1004) == "AlsoHere!"
