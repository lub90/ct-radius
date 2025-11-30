

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

ROOM_NAME_ID_MAPPING = [
    ("TeamMeeting", "!team123:chat.church.tools"),
    ("Gebetskreis", "!pray456:chat.church.tools"),
    ("Jugendgruppe", "!youth789:chat.church.tools"),
    ("Leitungsteam", "!lead001:chat.church.tools"),
    ("Technikdienst", "!tech002:chat.church.tools"),
    ("Willkommensrunde", "!welcome003:chat.church.tools"),
    ("Elternabend", "!parents004:chat.church.tools"),
    ("Sommerfreizeit2025", "!summer005:chat.church.tools"),
    ("CT-Admins", "!admins006:chat.church.tools"),
    ("Kleingruppe-Mitte", "!group007:chat.church.tools"),
    ("Musikteam", "!music008:chat.church.tools"),
    ("Seelsorge", "!care009:chat.church.tools"),
    ("Küchenteam", "!kitchen010:chat.church.tools"),
    ("Bibelkreis-Donnerstag", "!bible011:chat.church.tools"),
    ("Projekt:Neubau", "!build012:chat.church.tools"),
    ("Orga-Weihnachten", "!xmas013:chat.church.tools"),
    ("Lobpreisabend", "!worship014:chat.church.tools"),
    ("Mentorengruppe", "!mentor015:chat.church.tools"),
    ("CT-DemoRoom", "!demo016:chat.church.tools"),
    ("TestRaum42", "!test042:chat.church.tools")
]


ROOM_NAMES = [name for name, _ in ROOM_NAME_ID_MAPPING]

def username_from_guid(guid):
    return f"@ct_{guid.lower()}:chat.church.tools"