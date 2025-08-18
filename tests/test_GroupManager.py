import pytest
from unittest.mock import MagicMock
from requests import Session
from requests.exceptions import HTTPError

from CtGroupManager import CtGroupManager

@pytest.fixture
def manager():
    mgr = CtGroupManager("http://testserver", "user", "pwd", timeout=5)
    mgr.session = MagicMock(spec=Session)
    return mgr

@pytest.mark.parametrize("method,args", [
    ("login", ()),
    ("get_user_groups", (1,)),
    ("get_all_members_by_id", (1,)),
    ("get_members_by_id_and_attribute", (1, "username")),
])
def test_http_error_raised(manager, method, args):
    manager.session.get.side_effect = HTTPError("Mocked error")
    manager.session.post.side_effect = HTTPError("Mocked error")

    with pytest.raises(HTTPError):
        getattr(manager, method)(*args)

# -----------------------------
# get_user_groups tests
# -----------------------------
@pytest.mark.parametrize("person_id", ["abc", None, -5])
def test_get_user_groups_invalid_person_id(manager, person_id):
    with pytest.raises(ValueError):
        manager.get_user_groups(person_id)

@pytest.mark.parametrize("group_data,expected", [
    ([], set()),
    ([{"group": {"domainIdentifier": "1"}}], {1}),
    ([{"group": {"domainIdentifier": "1"}}, {"group": {"domainIdentifier": "2"}}], {1, 2}),
    (
        [{"group": {"domainIdentifier": str(i)}} for i in range(11, 16)],
        {11, 12, 13, 14, 15}
    )
])
def test_get_user_groups_valid_response(manager, group_data, expected):
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"data": group_data}
    manager.session.get.return_value = mock_response

    assert manager.get_user_groups(123) == expected

# -----------------------------
# get_all_members_by_id tests
# -----------------------------
@pytest.mark.parametrize("group_id", ["abc", None, -1])
def test_get_all_members_by_id_invalid_group_id(manager, group_id):
    with pytest.raises(ValueError):
        manager.get_all_members_by_id(group_id)

@pytest.mark.parametrize("mock_members,expected_ids", [
    ([], []),  # No members
    ([{"personId": 42}], [42]),  # One member
    ([{"personId": i} for i in range(5)], [0, 1, 2, 3, 4])  # Five members
])
def test_get_all_members_by_id_returns_ids(manager, mock_members, expected_ids):
    manager.get_members = MagicMock(return_value=mock_members)
    result = manager.get_all_members_by_id(1)
    assert result == expected_ids


@pytest.mark.parametrize("pages_data,expected", [
    # One page, one person
    (
        [{"data": [{"personId": 1}], "meta": {"pagination": {"lastPage": 1}}}],
        [{"personId": 1}]
    ),
    # Two pages, one person per page
    (
        [
            {"data": [{"personId": 1}], "meta": {"pagination": {"lastPage": 2}}},
            {"data": [{"personId": 2}], "meta": {"pagination": {"lastPage": 2}}}
        ],
        [{"personId": 1}, {"personId": 2}]
    ),
    # Two pages, multiple persons per page
    (
        [
            {"data": [{"personId": 1}, {"personId": 2}], "meta": {"pagination": {"lastPage": 2}}},
            {"data": [{"personId": 3}, {"personId": 4}], "meta": {"pagination": {"lastPage": 2}}}
        ],
        [{"personId": 1}, {"personId": 2}, {"personId": 3}, {"personId": 4}]
    ),
    # Six pages, one person per page
    (
        [
            {"data": [{"personId": i}], "meta": {"pagination": {"lastPage": 6}}}
            for i in range(1, 7)
        ],
        [{"personId": i} for i in range(1, 7)]
    ),
    # Six pages, multiple persons per page
    (
        [
            {"data": [{"personId": i * 10}, {"personId": i * 10 + 1}], "meta": {"pagination": {"lastPage": 6}}}
            for i in range(6)
        ],
        [{"personId": i * 10 + j} for i in range(6) for j in range(2)]
    )
])
def test_get_members_pagination(manager, pages_data, expected):
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.side_effect = pages_data

    manager.session.get.return_value = mock_response

    result = manager.get_members(group_id=1)
    assert result == expected


# -----------------------------
# get_members_by_id_and_attribute tests
# -----------------------------
@pytest.mark.parametrize("group_id", ["abc", None, -10])
def test_get_members_by_id_and_attribute_invalid_group_id(manager, group_id):
    with pytest.raises(ValueError):
        manager.get_members_by_id_and_attribute(group_id, "username")

@pytest.mark.parametrize("mock_members,expected", [
    ([], {}),
    ([{"personId": 1, "personFields": {"cmsUserId": "lukas"}}], {1: "lukas"}),
    ([{"personId": 2, "personFields": {"cmsUserId": "admin"}},
      {"personId": 3, "personFields": {"cmsUserId": "guest"}}], {2: "admin", 3: "guest"}),
    ([  # Six members
        {"personId": i, "personFields": {"cmsUserId": f"user{i}"}}
        for i in range(1, 7)
    ], {i: f"user{i}" for i in range(1, 7)}),
    ([  # Missing 'fields' key
        {"personId": 1},
        {"personId": 2, "cmsUserId": None},
        {"personId": 3, "cmsUserId": {"cmsUserId": ""}},
        {"personId": 4, "cmsUserId": {"name": ""}}
    ], {})
])
def test_get_members_by_id_and_attribute_response(manager, mock_members, expected):
    manager.get_members = MagicMock(return_value=mock_members)
    result = manager.get_members_by_id_and_attribute(1, "cmsUserId")
    assert result == expected


