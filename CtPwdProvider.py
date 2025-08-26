import os
import pystache
import re
import random
import datetime

from types import SimpleNamespace

from RadiusRelevantApp import RadiusRelevantApp
from CtChatManager import CtChatManager
from PasswordDatabase import PasswordDatabase


class CtPwdProvider(RadiusRelevantApp):

    def __init__(self, config_path, env_file=None):
        super().__init__(config_path, env_file)
        self.template_dir = os.path.join("communication", self.config.communication.language)


    def login(self):
        self.person_manager.login()
        self.group_manager.login()

        my_data = self.person_manager.who_am_i()
        self.my_guid = my_data["guid"]
        self.my_id = int(my_data["id"])

        self.chat_manager = CtChatManager(self.config.communication.server_url, self.my_guid, self.config.basic.ct_api_user_pwd)
        self.chat_manager.login()


    def _get_ct_members_data(self):
        all_members = {}
        
        for group_id in self.config.basic.all_wifi_access_groups:
            new_members = self.group_manager.get_all_members_by_id(group_id)
            all_members.update(new_members)

        return all_members

    def _setup(self, update=False):
        # We want to run the setup only, if it has not been run before or if we want to update the settings
        if update or (not self.guid_to_room_mapping):
            self.guid_to_room_mapping = self._generate_guid_room_mapping()
            self.person_id_to_guid_mapping = {key: data["person"]["domainAttributes"]["guid"] for key, data in self._get_ct_members_data().items()}

    def _get_all_ct_members(self):
        return list(self.person_id_to_guid_mapping.keys())

    def sync(self):
        self._setup(True)

        all_ct_members = self._get_all_ct_members()
        all_ct_members.remove(self.my_id)
        all_db_members = self.pwd_db.list_all_users()

        # The persons to give a new pwd are for sure the ones, who are currently member of a allowed ct group but are not part of the password database yet
        to_update = {person_id for person_id in all_ct_members if person_id not in all_db_members}
        
        # Now look if there is any special case why we want to update the password of somebody
        for ct_member in all_ct_members:

            # We do not check for the ones who are already to be updated
            if ct_member in to_update:
                continue

            # Check if thereare specific requests for a new pwd
            # This function also deals with unknown commands
            if self._is_reset_requested(ct_member):
                to_update.add(ct_member)
                continue
            
            # If there are no specific requests, check if we need to update the passwords, because they timed out
            if self._password_timed_out(ct_member):
                to_update.add(ct_member)

        # Now give them a new password and send them a message
        for ct_member in to_update:
            # TODO: Comment out for testing purposes
            print(f"Would have update the following member: {ct_member}")
            self.generate_new_pwd(ct_member)

        # At last, deal with the ones to be removed
        to_remove = [person_id for person_id in all_db_members if person_id not in all_ct_members]
        for person_id in to_remove:
            # TODO: This function needs to be implemented
            self._remove(person_id)


        # TODO: Replace for all_ct_members the password with *** where appropriate


    def _get_existing_chat_room(self, person_id):

        if not person_id in self.person_id_to_guid_mapping:
            return None
        
        person_guid = self.person_id_to_guid_mapping[person_id]
        full_chat_guid = self.chat_manager.username_from_guid(person_guid)

        if not full_chat_guid in self.guid_to_room_mapping:
            return None

        return self.guid_to_room_mapping[full_chat_guid]

    def _is_reset_requested(self, person_id):

        room_id = self._get_existing_chat_room(person_id)

        # If there is no chat room, there is no reset message
        if not room_id:
            return False

        person_guid = self.person_id_to_guid_mapping[person_id]
        last_message = self.chat_manager.last_message_sent(room_id, person_guid, must_be_last_message=True)

        # Check if we found any last message
        if not last_message:
            return False

        # If we found one, check if it fits the personal reset command of this person
        custom_com_settings = self.config.getCommunicationConfigFor(person_id)
        if last_message["body"] == custom_com_settings.reset_command:
            return True
        else:
            # We received a message we cannot decode. Send error message
            wrong_cmd_msg = self._render_template("unknown_command_message.mustache", custom_com_settings)
            self.chat_manager.send_message(room_id, wrong_cmd_msg)
            return False

    # Important precondition here is, that the person must be in general eligible for a password
    def _password_timed_out(self, person_id):

        # Check the auto_reset setting for this person_id
        auto_reset = self.config.getCommunicationConfigFor(person_id).auto_reset
        if auto_reset < 0:
            return False

        room_id = self._get_existing_chat_room(person_id)

        # If there is no chat room, the password should be timed out automatically, to prevent people from leaving a chatroom and maintaining their password
        if not room_id:
            return True


        message_pattern = self._render_regex_template("password_message.mustache")
        matching_messages = self.chat_manager.find_messages(room_id, message_pattern, self.my_guid)

        last_message = None
        for msg in matching_messages:
            if (not last_message) or (last_message["timestamp"] < msg["timestamp"]):
                last_message = msg

        # There is no previous password message, as such the previous password should be timed out...
        if not last_message:
            return True

        age_of_last_message = datetime.datetime.now() - last_message["timestamp"]
        timeout_age = datetime.timedelta(minutes=auto_reset)

        return (age_of_last_message >= timeout_age)


        

    def _remove(self, person_id):
        # TODO: Delete person from database

        # TODO: Retrieve additional information about the person from ChurchTools - if it fails continue as usual and ignore it (person might have been deleted from ChurchTools)

        # TODO: Send them a message, informing them about their cancellation

        # TODO: Replace all the passwords with ***

        pass


    def set_new_pwd(self, other_person_id, new_pwd):
        # Write new_pwd to database
        self.pwd_db.setPwd(other_person_id, new_pwd)

        # Communicate it
        self._communicate_new_pwd(other_person_id, new_pwd)

    def _generate_pwd(self):
        length = self.config.basic.pwd_length
        return ''.join(random.choices(PasswordDatabase.ALLOWED_CHARS, k=length))

    def generate_new_pwd(self, other_person_id):
        # Generate a new password and set it
        new_pwd = self._generate_pwd()
        self.set_new_pwd(other_person_id, new_pwd)

    def _communicate_new_pwd(self, other_person_id, new_pwd):
        # Run the setup routine if it has not been run before...
        self._setup()
        
        # The other person id must be the ChurchTools person id and the following dict should be loaded for it
        person_data = self.person_manager.get_person(other_person_id)
        person = SimpleNamespace(
            id=person_data["id"],
            firstname=person_data["firstName"],
            lastname=person_data["lastName"],
            guid=person_data["guid"],
            username=person_data[self.config.basic.username_field_name]
        )

        # Get the room or generate one
        room_id = self._get_or_create_room(person)

        # Send the new password message
        self._send_pwd_msg(room_id, person, new_pwd)

    def _generate_guid_room_mapping(self):
        room_name = self._get_regex_room_title()
        guid_room_mapping = self.chat_manager.find_private_rooms(room_name)
        return guid_room_mapping

    def _render_template(self, filename, context):
        template_path = os.path.join(self.template_dir, filename)
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
        return pystache.render(template, context)

    def _render_regex_template(self, filename):
        template_path = os.path.join(self.template_dir, filename)
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
            
        # Escape all regex special characters
        escaped = re.escape(template)

        # Replace escaped {{variable}} with regex wildcard
        pattern = re.sub(r'\\{\\{.*?\\}\\}', r'.+?', escaped)

        # Anchor the pattern to match the full string
        return re.compile(f"^{pattern}$")


    def _get_regex_room_title(self):
        # Load room title from mustache file, using the person object
        return self._render_regex_template("room_title.mustache")

    def _get_room_title(self, person):
        # Load room name from mustache file, using person object
        return self._render_template("room_title.mustache", person)


    def _get_or_create_room(self, person):

        # Firstly check if a chat room is given in the cusom settings
        custom_com_settings = self.config.getCommunicationConfigFor(person.id)

        if custom_com_settings.chat_room_id:
            return custom_com_settings.chat_room_id

        # Now check if a chat room already exists
        room_id = self._get_existing_chat_room(person.id)
        if room_id:
            return room_id
        

        # No chat room exists, generate room
        room_name = self._get_room_title(person)
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
    



