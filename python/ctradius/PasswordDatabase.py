import base64
from cryptography.fernet import Fernet
from typing import Optional
import requests
import os
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
import json
from churchtools import ChurchtoolsClient
from churchtools import ExtensionDataManager
from churchtools import CtBasedService
from churchtools import CtPersonManager


class PasswordDatabase(CtBasedService):
    """
    Minimal password storage system using asymmetric encryption.
    Storage backend is abstracted (to be replaced with HTTP calls).
    """

    """
    Loads an encrypted private PEM file using a password.
    Stores the private key object in self.privateKey.
    """

    SETTINGS_CATEGORY_NAME = 'settings'
    SETTINGS_BASE_URL_FIELD_NAME = 'backendUrl'
    CT_ENCRYPTED_PWD_FIELD = 'secondaryPwd'


    def __init__(self, ctClient: ChurchtoolsClient, pem_path: str, pem_password: str):
        super().__init__(ctClient)

        # Expand ~ in path
        pem_path = os.path.expanduser(pem_path)

        # Read the PEM file
        with open(pem_path, "rb") as pem_file:
            pem_data = pem_file.read()

        # Load the private key using the provided password
        self._privateKey = serialization.load_pem_private_key(
            pem_data,
            password=pem_password.encode("utf-8"),
            backend=default_backend()
        )

        # TODO: Move string to general config or somwhere else
        self._extensionDataManager = ExtensionDataManager(self.churchtoolsClient, "ctpassstore")

    # ----------------------------
    # Backend abstraction methods
    # ----------------------------
    def _get(self, user_id: int) -> Optional[bytes]:
        """
        Retrieve raw encrypted value by user_id.
        Steps:
          1. Get settings category data (single=True).
          2. Extract backendUrl.
          3. Call /api/whoami via CtPersonManager to get current user id.
          4. Call /api/persons/{id}/logintoken to get login token.
          5. Call backendUrl/entries/{user_id} with that token.
          6. Return the encrypted password field (decoded from base64).
        """
        # 1. Get settings category data
        rawSettings = self._extensionDataManager.get_category_data(
            self.SETTINGS_CATEGORY_NAME, single=True
        )
        settings = json.loads(rawSettings["value"])
        backend_url = settings[self.SETTINGS_BASE_URL_FIELD_NAME]

        # 2. Whoami to get current uscler id
        person_mgr = CtPersonManager(
            self.churchtoolsClient
        )
        whoami_data = person_mgr.who_am_i()
        current_user_id = whoami_data["id"]

        # 3. Get login token for that user
        resp = self.churchtoolsClient.get(f"/persons/{current_user_id}/logintoken")
        resp.raise_for_status()
        login_token = resp.json()["data"]

        # 4. Call backend /entries/{user_id} with token
        headers = {"Authorization": f"Login {login_token}"}
        resp = requests.get(
            f"{backend_url}/entries/{user_id}",
            headers=headers,
            timeout=self.churchtoolsClient.timeout,
        )
        resp.raise_for_status()
        data = resp.json()

        # 5. Extract encrypted password field
        encrypted_b64 = data[self.CT_ENCRYPTED_PWD_FIELD]
        return base64.b64decode(encrypted_b64)


    # ----------------------------
    # Public API
    # ----------------------------
    def containsUser(self, user_id: int) -> bool:
        return self._get(user_id) is not None

    def getPwd(self, user_id: int) -> str:
        encrypted = self._get(user_id)
        if encrypted is None:
            raise KeyError(f"User ID {user_id} not found.")
        decrypted = self._decrypt(encrypted)
        return decrypted.decode("utf-8")

    def _decrypt(self, encrypted: bytes) -> bytes:
        """
        Decrypts RSA‑encrypted data using the loaded private key.

        Args:
            encrypted (bytes): The ciphertext to decrypt.

        Returns:
            bytes: The decrypted plaintext.
        """
        return self._privateKey.decrypt(
            encrypted,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )