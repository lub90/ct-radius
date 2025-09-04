# mock_requests.py

import requests
import types
import importlib

class MockRequests:
    def __init__(self):
        self.get = self._fail("get")
        self.post = self._fail("post")
        self.put = self._fail("put")
        self.delete = self._fail("delete")
        self.patch = self._fail("patch")

        # request leitet weiter
        self.request = self._dispatch_request

    def _fail(self, method_name):
        def _raise(*args, **kwargs):
            raise RuntimeError(f"Requests.{method_name} should not be called!")
        return _raise

    def _dispatch_request(self, method, url, **kwargs):
        method = method.lower()
        if hasattr(self, method):
            return getattr(self, method)(url, **kwargs)
        raise RuntimeError(f"Requests.{method.upper()} not implemented in mock.")


def patch_mock_request(monkeypatch, mocked_requests):
    # Direct import of module because class hides module
    ctchatmanager_module = importlib.import_module("churchtools.CtChatManager")
    monkeypatch.setattr(ctchatmanager_module, "requests", mocked_requests)