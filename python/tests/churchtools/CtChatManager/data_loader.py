

VALID_PARAMETERS = [
        ("https://churchtools.example.com", "user-guid-123", "securePassword!"),
        ("http://localhost:8000", "guid-localhost-456", "devPass123"),
        ("https://ct.example.org", "guid-special-üöä", "pässwörd!"),
        ("https://intranet.churchtools.de", "guid-789-xyz", "Pa$$w0rd!"),
        ("https://ct-demo.net", "guid-demo-abc", "demoSecure123")
    ]

INVALID_PARAMETERS = [
        (None, "valid-guid", "validPass123"),
        ("", "valid-guid", "validPass123"),
        ("https://churchtools.example.com", None, "validPass123"),
        ("https://churchtools.example.com", "", "validPass123"),
        ("https://churchtools.example.com", "valid-guid", None),
        ("https://churchtools.example.com", "valid-guid", "")
    ]

VALID_ACCESS_TOKENS = [
    "token-abc123",
    "secure-token-456",
    "äöü-ÜÖÄ-special",
    "TOKEN_WITH_CAPS",
    "1234567890abcdef"
]

GUID_USERNAME_MAPPING = [
    ("lukas", "@ct_lukas:chat.church.tools"),
    ("user123", "@ct_user123:chat.church.tools"),
    ("äöü", "@ct_äöü:chat.church.tools"),
    ("john.doe", "@ct_john.doe:chat.church.tools"),
    ("GUID-XYZ-789", "@ct_guid-xyz-789:chat.church.tools"),
]

def username_from_guid(guid):
    return f"@ct_{guid.lower()}:chat.church.tools"