from .TemplateProvider import TemplateProvider

class Command:

    def __init__(self, parent_app, person):
        self.person = person
        self.parent_app = parent_app
        self.template_provider = TemplateProvider(self.config.communication.language)

    @property
    def config(self):
        return self.parent_app.config

    @property
    def personal_communication_config(self):
        return self.config.getCommunicationConfigFor(self.person.id)

    @property
    def chat_manager(self):
        return self.parent_app.chat_manager

    @property
    def pwd_db(self):
        return self.parent_app.pwd_db

    def get_chat_room_id(self):
        # Firstly check if a chat room is given in the cusom settings
        room_id = self.personal_communication_config.chat_room_id
        if room_id:
            return room_id

        # Now check if a chat room already exists
        room_id = self.person.chat_room_id
        if room_id:
            return room_id

        return None

    def __eq__(self, other):
        if type(other) is type(self):
            return self.__dict__ == other.__dict__
        else:
            return False