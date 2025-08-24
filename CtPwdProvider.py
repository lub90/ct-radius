import os
import pystache

from types import SimpleNamespace

from RadiusRelevantApp import RadiusRelevantApp
from CtChatManager import CtChatManager


class CtPwdProvider(RadiusRelevantApp):

    def __init__(self, config_path, env_file=None):
        super().__init__(config_path, env_file)
        self.template_dir = os.path.join("communication", self.config.communication.language)


    def login(self):
        self.person_manager.login()
        self.chat_manager = CtChatManager(self.config.communication.server_url, self.person_manager.my_guid(), self.config.basic.ct_api_user_pwd)
        self.chat_manager.login()

    def sync(self, other_person_id, new_pwd):
        # TODO: The other person id must be the ChurchTools person id and the following dict should be loaded for it
        person = SimpleNamespace(
            firstname="Max",
            lastname="Mustermann",
            guid=other_person_id,
            username="mmustermann"
        )

        room_id = self._get_or_create_room(person)

        self._send_pwd_msg(room_id, person, new_pwd)

    def _render_template(self, filename, context):
        template_path = os.path.join(self.template_dir, filename)
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
        return pystache.render(template, context)

    def _get_room_title(self, person):
        # Load room title from mustache file, using the person object
        return self._render_template("room_title.mustache", person)


    def _get_or_create_room(self, person):
        
        room_name = self._get_room_title(person)

        # Check if room exists
        # TODO: Escape so that it is an exact string match
        room_name_pattern = room_name
        existing_room_id = self.chat_manager.find_room(room_name, person.guid)

        if existing_room_id:
            return existing_room_id
        else:
            # Generate room
            room_id = self.chat_manager.create_secure_room(room_name)

            # Invite user
            self.chat_manager.invite_user_to_room(room_id, person.guid)
            
            # Send first message
            # Load first message from mustache file using the person object and config information
            # TODO: Add the context information
            context = person
            first_message = self._render_template("initial_message.mustache", context)
            self.chat_manager.send_message(room_id, first_message)

            return room_id

    def _send_pwd_msg(self, room_id, person, new_pwd):

        context = SimpleNamespace()
        context.__dict__.update(person.__dict__)
        context.password = new_pwd
        msg = self._render_template("password_message.mustache", context)

        self.chat_manager.send_message(room_id, msg)
    



