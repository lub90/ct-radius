import os
import pystache
import re

from types import SimpleNamespace

from RadiusRelevantApp import RadiusRelevantApp
from CtChatManager import CtChatManager


class CtPwdProvider(RadiusRelevantApp):

    def __init__(self, config_path, env_file=None):
        super().__init__(config_path, env_file)
        self.template_dir = os.path.join("communication", self.config.communication.language)


    def login(self):
        self.person_manager.login()
        self.group_manager.login()

        self.chat_manager = CtChatManager(self.config.communication.server_url, self.person_manager.my_guid(), self.config.basic.ct_api_user_pwd)
        self.chat_manager.login()


    def _get_all_ct_members():
        all_members = {}
        
        for group_id in self.config.basic.all_wifi_access_groups:
            all_members.update(
                self.group_manager.get_all_members_by_id(grou_id)
            )

        return all_members

    def sync(self):
        all_ct_members = self._get_all_ct_members()
        all_db_members = self.pwd_db.getAllUsers()

        # The persons to give a new pwd are for sure the once, who are currently member of a allowed ct group but are not part of the password database yet
        to_update = [ct_member for person_id, ct_member in all_ct_members.items() if person_id not in all_db_members]
        # TODO: Furthermore the once who specifically requested a new pwd are to be added here
        # TODO: In the meantime deal with the once who sent an unknown command
        # TODO: Finally, the once who receive a new password automatically after a certain time are to be added here

        # Now give them a new password and send them a message
        for ct_member in to_update:
            self._new_pwd(ct_member)

        # At last, deal with the once to be removed
        to_remove = [person_id for person_id in all_db_members if person_id not in all_ct_members]
        for person_id in to_remove:
            # TODO: This function needs to be implemented
            self._remove(person_id)


        # TODO: Replace for all_ct_members the password with *** where appropriate

    def _remove(person_id):
        # TODO: Delete person from database

        # TODO: Retrieve additional information about the person from ChurchTools - if it fails continue as usual and ignore it (person might have been deleted from ChurchTools)

        # TODO: Send them a message, informing them about their cancellation

        # TODO: Replace all the passwords with ***
        
    # TODO: Adjust to take care of the new format and the new password internally
    def new_pwd(self, other_person_id, new_pwd):

        # TODO: Give them a password and store it in the database

        # TODO: The other person id must be the ChurchTools person id and the following dict should be loaded for it
        person = SimpleNamespace(
            id=other_person_id,
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

        custom_com_settings = self.config.getCommunicationConfigFor(person.id)

        if custom_com_settings.chat_room_id:
            return custom_com_settings.chat_room_id
        
        room_name = self._get_room_title(person)

        # Check if room exists
        # Escape so that it is an exact string match
        room_name_pattern = "^" + re.escape(room_name) + "$"
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
            context = SimpleNamespace()
            context.__dict__.update(person.__dict__)
            context.__dict__.update(custom_com_settings.__dict__)

            context.show_pwd_display_time = context.pwd_display_time > 0
            if context.show_pwd_display_time:
                # Format the pwd_display_time in a nice manner
                hours, minutes = divmod(context.pwd_display_time, 60)
                context.pwd_display_time_formatted = f"{hours}:{minutes:02d}"

            first_message = self._render_template("initial_message.mustache", context)
            self.chat_manager.send_message(room_id, first_message)

            return room_id

    def _send_pwd_msg(self, room_id, person, new_pwd):

        context = SimpleNamespace()
        context.__dict__.update(person.__dict__)
        context.password = new_pwd
        msg = self._render_template("password_message.mustache", context)

        self.chat_manager.send_message(room_id, msg)
    



