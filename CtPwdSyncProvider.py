import os
import pystache
import re
import random
import datetime
import time

from types import SimpleNamespace

from RadiusRelevantApp import RadiusRelevantApp
from CtChatManager import CtChatManager
from PasswordDatabase import PasswordDatabase
from TemplateProvider import TemplateProvider
from HidePwdCommand import HidePwdCommand
from NewPwdCommand import NewPwdCommand
from RemoveUserCommand import RemoveUserCommand
from UnknownCommandCommand import UnknownCommandCommand


class CtPwdSyncProvider(RadiusRelevantApp):

    def __init__(self, config_path, env_file=None):
        super().__init__(config_path, env_file)
        self.template_provider = TemplateProvider(self.config.communication.language)


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
            new_members = self.group_manager.get_all_members_by_id(group_id, field_name_filter=self.config.basic.username_field_name)
            all_members.update(new_members)

        return all_members

    def _get_ct_members(self, guid_to_room_mapping):
        result = {}

        for person_id, person_data in self._get_ct_members_data().items():
            # Find the field with the given name entry for the username
            field_list = person_data.get("personFields", [])
            field_name = self.config.basic.username_field_name
            username = field_list[field_name]

            new_person = SimpleNamespace(
                id=person_id,
                firstname=person_data["person"]["domainAttributes"]["firstName"],
                lastname=person_data["person"]["domainAttributes"]["lastName"],
                guid=person_data["person"]["domainAttributes"]["guid"].lower(),
                username=username,
                chat_room_id=None
            )

            if new_person.guid in guid_to_room_mapping:
                new_person.chat_room_id = guid_to_room_mapping[new_person.guid]

            result[person_id] = new_person

        return result

        
    def _get_db_user(self, person_id, guid_to_room_mapping):
        try:
            person_data = self.person_manager.get_person(person_id)
            new_person = SimpleNamespace(
                id=person_data["id"],
                firstname=person_data["firstName"],
                lastname=person_data["lastName"],
                guid=person_data["guid"].lower(),
                username=person_data[self.config.basic.username_field_name],
                chat_room_id=None
            )

            if new_person.guid in guid_to_room_mapping:
                new_person.chat_room_id = guid_to_room_mapping[new_person.guid]

        except Exception:
            # We cannot get person data, most likely because the person was already deleted from ChurchTools
            # We proceed with an empty person object to process it further
            new_person = SimpleNamespace(
                id=person_id
            )

        return new_person

    def _add_to_batch(self, batch, element):
        if element not in batch:
            batch.append(element)

    def sync(self):
        print("===================================================")
        print("Starting to sync password database with ChurchTools")

        command_batch = self.generate_update_batch()

        for cmd in command_batch:
            # We try to execute each command on its own, if it fails, we continue with the next one
            try:
                print(f"Executing {type(cmd)} for {cmd.person.id}...")
                cmd.execute()
                print("Execution successfull!")
            except Exception as e:
                # TODO: Implement logging functionality here
                print(f"Execution failed: {e}")
                raise e

        self.remove_empty_chats()


    def generate_update_batch(self):
        batch = []

        guid_to_room_mapping = self._generate_guid_room_mapping()

        # Get all relevant ChurchTools members
        all_ct_members = self._get_ct_members(guid_to_room_mapping)
        all_ct_members.pop(self.my_id, None)

        # Get the ids of all users in the pwd database
        users_in_pwd_db = self.pwd_db.list_all_users()

        # Generate a list of all persons to process
        all_persons_to_process = {id: data for id, data in all_ct_members.items()}
        # Add to this list all users which are not delivered by ChurchTools but are still in database
        for person_id in users_in_pwd_db:
            if person_id not in all_persons_to_process:
                all_persons_to_process[person_id] = self._get_db_user(person_id, guid_to_room_mapping)

        
        for person_id, person in all_persons_to_process.items():

            # Replace for all_ct_members the password with *** where appropriate
            cmd = HidePwdCommand(self, person)
            self._add_to_batch(batch, cmd)

            # The persons to give a new pwd are for sure the ones, who are currently member of an allowed ct group but are not part of the password database yet
            if person_id not in users_in_pwd_db:
                cmd = NewPwdCommand(self, person)
                self._add_to_batch(batch, cmd)
                continue

            # Check if this user should be deleted because it is no longer in a valid churchtools group
            if person_id not in all_ct_members:
                cmd = RemoveUserCommand(self, person)
                self._add_to_batch(batch, cmd)
                continue

            # Check if there are specific requests for a new pwd
            # This function also deals with unknown commands
            reset_requested_cmd = self._get_reset_requested_cmd(person)
            if reset_requested_cmd:
                self._add_to_batch(batch, reset_requested_cmd)
                continue
            
            # If there are no specific requests, check if we need to update the passwords, because they timed out
            pwd_timed_out_cmd = self._get_pwd_timed_out_cmd(person)
            if pwd_timed_out_cmd:
                self._add_to_batch(batch, pwd_timed_out_cmd)
                continue
        
        return batch


    # TODO: Duplicate to the function in Command -> Make it part of a person object that is passed around
    def _get_chat_room_id(self, person):

        personal_communication_config = self.config.getCommunicationConfigFor(person.id)

        # Firstly check if a chat room is given in the cusom settings
        room_id = personal_communication_config.chat_room_id
        if room_id:
            return room_id

        # Now check if a chat room already exists
        room_id = person.chat_room_id
        if room_id:
            return room_id

        return None

    def _get_reset_requested_cmd(self, person):

        room_id = self._get_chat_room_id(person)

        # If there is no chat room, there is no reset message
        if not room_id:
            return None

        last_message = self.chat_manager.last_message_sent(room_id, person.guid, must_be_last_message=True)

        # Check if we found any last message
        if not last_message:
            return None

        # If we found one, check if it fits the personal reset command of this person
        custom_com_settings = self.config.getCommunicationConfigFor(person.id)
        if last_message["body"] == custom_com_settings.reset_command:
            return NewPwdCommand(self, person)
        else:
            return UnknownCommandCommand(self, person)

    # Important precondition here is, that the person must be in general eligible for a password
    def _get_pwd_timed_out_cmd(self, person):

        # Check the auto_reset setting for this person_id
        auto_reset = self.config.getCommunicationConfigFor(person.id).auto_reset
        if auto_reset < 0:
            return None

        room_id = self._get_chat_room_id(person)

        # If there is no chat room, the password should be timed out automatically, to prevent people from leaving a chatroom and maintaining their password
        if not room_id:
            return NewPwdCommand(self, person)


        message_pattern = self.template_provider.render_regex_template("password_message.mustache")
        matching_messages = self.chat_manager.find_messages(room_id, message_pattern, self.my_guid)

        last_message = None
        for msg in matching_messages:
            if (not last_message) or (last_message["timestamp"] < msg["timestamp"]):
                last_message = msg

        # There is no previous password message, as such the previous password should be timed out...
        if not last_message:
            return NewPwdCommand(self, person)

        if self._is_msg_out_of_date(last_message, auto_reset):
            return NewPwdCommand(self, person)
        else:
            return None


    def _is_msg_out_of_date(self, msg, timeout):
        age_of_msg = datetime.datetime.now() - msg["timestamp"]
        timeout_age = datetime.timedelta(minutes=timeout)

        return (age_of_msg >= timeout_age)
    

    def _generate_guid_room_mapping(self):
        room_name = self.template_provider.render_regex_template("room_title.mustache")
        guid_room_mapping = self.chat_manager.find_private_rooms(room_name)
        return guid_room_mapping

    def remove_empty_chats(self):
        room_name = self.template_provider.render_regex_template("room_title.mustache")

        empty_rooms = self.chat_manager.find_empty_rooms(room_name)

        for empty_room in empty_rooms:
            self.chat_manager.delete_room(empty_room)
            # We need to add a litlte delay, because obviously the matrix server doesn't like too many delete request after each other...
            time.sleep(1)
    



