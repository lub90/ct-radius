from .ChurchtoolsClient import ChurchtoolsClient


class CtBasedService:

    def __init__(self, ctClient: ChurchtoolsClient):
        self.churchtoolsClient = ctClient