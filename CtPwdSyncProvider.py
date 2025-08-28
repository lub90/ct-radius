import os
import pystache
import re
import random
import datetime

from types import SimpleNamespace

from RadiusRelevantApp import RadiusRelevantApp
from CtChatManager import CtChatManager
from PasswordDatabase import PasswordDatabase


class CtPwdSyncProvider(RadiusRelevantApp):

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

    def _get_ct_members(self, guid_to_room_mapping):
        result = {}

        for person_id, person_data in self._get_ct_members_data().items():
            # Find the field with the given name entry for the username
            field_list = member.get("personFields", [])
            field_name = self.config.basic.username_field_name
            username = field_list[field_name]

            new_person = SimpleNamespace(
                id=person_id,
                firstname=person_data["person"]["domainAttributes"]["firstName"],
                lastname=person_data["person"]["domainAttributes"]["lastName"],
                guid=person_data["person"]["domainAttributes"]["guid"],
                username=username
                chat_room_id = None
            )

            if new_person.guid in guid_to_room_mapping:
                new_person.chat_room_id = guid_to_room_mapping[new_person.guid]

            result[person_id] = new_person

        return result

        

    def sync(self):

        guid_to_room_mapping = self._generate_guid_room_mapping()
        all_ct_members = self._get_ct_members(guid_to_room_mapping)
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


        # Replace for all_ct_members the password with *** where appropriate
        all_persons = set(all_ct_members + all_db_members)
        for person_id in all_persons:
            self._hide_passwords(person_id)

        # At last, deal with the ones to be removed
        to_remove = [person_id for person_id in all_db_members if person_id not in all_ct_members]
        for person_id in to_remove:
            # TODO: This function needs to be implemented
            self._remove(person_id)


    # TODO: Rewrite
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
            return []

        person_guid = self.person_id_to_guid_mapping[person_id]
        last_message = self.chat_manager.last_message_sent(room_id, person_guid, must_be_last_message=True)

        # Check if we found any last message
        if not last_message:
            return []

        # If we found one, check if it fits the personal reset command of this person
        custom_com_settings = self.config.getCommunicationConfigFor(person_id)
        if last_message["body"] == custom_com_settings.reset_command:
            return [NewPwdCommand(self, person)]
        else:
            return [UnknownCommandCommand(self, person)]

    # Important precondition here is, that the person must be in general eligible for a password
    def _password_timed_out(self, person_id):

        # Check the auto_reset setting for this person_id
        auto_reset = self.config.getCommunicationConfigFor(person_id).auto_reset
        if auto_reset < 0:
            return []

        room_id = self._get_existing_chat_room(person_id)

        # If there is no chat room, the password should be timed out automatically, to prevent people from leaving a chatroom and maintaining their password
        if not room_id:
            return [NewPwdCommand(self, person)]


        message_pattern = self._render_regex_template("password_message.mustache")
        matching_messages = self.chat_manager.find_messages(room_id, message_pattern, self.my_guid)

        last_message = None
        for msg in matching_messages:
            if (not last_message) or (last_message["timestamp"] < msg["timestamp"]):
                last_message = msg

        # There is no previous password message, as such the previous password should be timed out...
        if not last_message:
            return [NewPwdCommand(self, person)]

        if self._is_msg_out_of_date(last_message, auto_reset):
            return [NewPwdCommand(self, person)]
        else:
            return []


    def _is_msg_out_of_date(self, msg, timeout):
        age_of_msg = datetime.datetime.now() - msg["timestamp"]
        timeout_age = datetime.timedelta(minutes=timeout)

        return (age_of_msg >= timeout_age)
        

    def _remove(self, person_id):
        # TODO: Delete person from database

        # TODO: Retrieve additional information about the person from ChurchTools - if it fails continue as usual and ignore it (person might have been deleted from ChurchTools)

        # TODO: Send them a message, informing them about their cancellation

        # TODO: Replace all the passwords with ***

        pass


    

    def _get_person_data_for_templates(self, other_person_id):
        # The other person id must be the ChurchTools person id and the following dict should be loaded for it
        person_data = self.person_manager.get_person(other_person_id)
        person = SimpleNamespace(
            id=person_data["id"],
            firstname=person_data["firstName"],
            lastname=person_data["lastName"],
            guid=person_data["guid"],
            username=person_data[self.config.basic.username_field_name]
        )

        return person

    
    def _generate_guid_room_mapping(self):
        room_name = self._get_regex_room_title()
        guid_room_mapping = self.chat_manager.find_private_rooms(room_name)
        return guid_room_mapping


    def _get_regex_room_title(self):
        # Load room title from mustache file, using the person object
        return self._render_regex_template("room_title.mustache")
    



