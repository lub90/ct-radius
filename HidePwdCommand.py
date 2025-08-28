from PwdBasedCommand import PwdBasedCommand


class HidePwdCommand(PwdBasedCommand):

    def __init__(self, parent_app, person, hide_all=False):
        super().__init__(parent_app, person)
        self.hide_all = hide_all

    def execute(self):
        room_id = self.get_chat_room_id()

        # Nothing to hide if there is no chat room
        if not room_id:
            return

        # Get all sent password messages
        pwd_messages = self._get_all_pwd_msgs()

        # Construct a message with a hidden password
        new_msg = self.get_hidden_pwd_msg()

        for msg in pwd_messages:
            # Check display time of each message and whether it is already hidden or not
            if (msg["body"] != new_msg) and (self.hide_all or self._is_msg_out_of_date(msg)):
                # Update the message to a hidden password
                self.chat_manager.edit_message(room_id, msg["event_id"], new_msg)

    def _get_all_pwd_msgs(self):
        msg_search_pattern = self._render_regex_template("password_message.mustache")
        return self.chat_manager.find_messages(room_id, msg_search_pattern, self.my_guid)

    def _get_hidden_pwd_msg(self):
        hidden_pwd = "*" * self.config.basic.pwd_length
        return self._get_pwd_msg(self.person, hidden_pwd)

    def _is_msg_out_of_date(self, msg):
        age_of_msg = datetime.datetime.now() - msg["timestamp"]
        timeout_age = datetime.timedelta(minutes=self.personal_communication_config.pwd_display_time)

        return (age_of_msg >= timeout_age)