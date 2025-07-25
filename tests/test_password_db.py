import os
import tempfile
import pytest
from PasswordDatabase import PasswordDatabase

@pytest.fixture
def pwd_db():
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        path = tmpfile.name
    os.remove(path)  # remove before using with dbm
    db = PasswordDatabase(path, encryption_password="testkey123")
    yield db
    db.db.close()
    os.remove(path)

# Valid passwords using all allowed categories
VALID_PASSWORDS = [
    "Secure123!",
    "ValidPass[]",
    "AlphaBeta123$",
    "MixUPdown7?",
    "Symbols{}<>.",
    "DigitsOnly123456",
    "Complex#Password1"
]

# Invalid passwords due to disallowed characters, short length, or format
INVALID_PASSWORDS = [
    "",              # empty
    "short",         # too short
    "💥🔥🌪️",         # emojis
    "White Space",   # space
    "Bad€uro123",     # non-ASCII
    "Control\x03",   # control char
    "ÜmläutPass12",   # accented chars
    "Back\\Slash12"   # unlisted symbol
]

# --- Valid password operations ---

@pytest.mark.parametrize("user_id,password", [(i + 1, pwd) for i, pwd in enumerate(VALID_PASSWORDS)])
def test_setPwd_and_getPwd_valid(pwd_db, user_id, password):
    pwd_db.setPwd(user_id, password)
    assert pwd_db.getPwd(user_id) == password

@pytest.mark.parametrize("user_id,password", [(i + 101, pwd) for i, pwd in enumerate(VALID_PASSWORDS)])
def test_updatePwd_valid(pwd_db, user_id, password):
    pwd_db.setPwd(user_id, "Initial123!")
    pwd_db.update(user_id, password)
    assert pwd_db.getPwd(user_id) == password

@pytest.mark.parametrize("user_id,password", [(i + 201, pwd) for i, pwd in enumerate(VALID_PASSWORDS)])
def test_containsUser_after_setPwd(pwd_db, user_id, password):
    assert not pwd_db.containsUser(user_id)
    pwd_db.setPwd(user_id, password)
    assert pwd_db.containsUser(user_id)

@pytest.mark.parametrize("user_id,password", [(i + 301, pwd) for i, pwd in enumerate(VALID_PASSWORDS)])
def test_deleteUser_removes_access(pwd_db, user_id, password):
    pwd_db.setPwd(user_id, password)
    assert pwd_db.containsUser(user_id)
    pwd_db.deleteUser(user_id)
    assert not pwd_db.containsUser(user_id)
    with pytest.raises(KeyError):
        pwd_db.getPwd(user_id)

# --- Invalid password rejections ---

@pytest.mark.parametrize("password", INVALID_PASSWORDS)
def test_setPwd_invalid_passwords(pwd_db, password):
    with pytest.raises((TypeError, ValueError)):
        pwd_db.setPwd(999, password)

@pytest.mark.parametrize("password", INVALID_PASSWORDS)
def test_updatePwd_invalid_passwords(pwd_db, password):
    pwd_db.setPwd(998, "InitialValid123!")
    with pytest.raises((TypeError, ValueError)):
        pwd_db.update(998, password)

# --- Invalid user ID rejections ---

@pytest.mark.parametrize("bad_user_id", ["", None, "not-an-int"])
def test_setPwd_invalid_user_id_type(pwd_db, bad_user_id):
    with pytest.raises(TypeError):
        pwd_db.setPwd(bad_user_id, "ValidPass123!")

@pytest.mark.parametrize("bad_user_id", [-1, -99])
def test_setPwd_negative_user_id(pwd_db, bad_user_id):
    with pytest.raises(ValueError):
        pwd_db.setPwd(bad_user_id, "ValidPass123!")

@pytest.mark.parametrize("bad_user_id", ["", None, "NaN"])
def test_deleteUser_invalid_id_type(pwd_db, bad_user_id):
    with pytest.raises(TypeError):
        pwd_db.deleteUser(bad_user_id)

@pytest.mark.parametrize("bad_user_id", [-5, -200])
def test_deleteUser_negative_id(pwd_db, bad_user_id):
    with pytest.raises(ValueError):
        pwd_db.deleteUser(bad_user_id)

def test_updatePwd_nonexistent_user_raises(pwd_db):
    with pytest.raises(KeyError):
        pwd_db.update(555, "NewValidPass!")

def test_deleteUser_nonexistent_user_does_not_error(pwd_db):
    pwd_db.deleteUser(777)  # no exception expected
    assert not pwd_db.containsUser(777)

# --- Precision deletion test ---
def test_deleteUser_does_not_affect_other_users(pwd_db):
    pwd_db.setPwd(800, "FirstPass123!")
    pwd_db.setPwd(801, "SecondPass123!")
    pwd_db.setPwd(802, "ThirdPass123!")

    pwd_db.deleteUser(801)

    with pytest.raises(KeyError):
        pwd_db.getPwd(801)

    assert pwd_db.getPwd(800) == "FirstPass123!"
    assert pwd_db.getPwd(802) == "ThirdPass123!"
