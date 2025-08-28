from HidePwdCommand import HidePwdCommand

class RemoveUserCommand(HidePwdCommand):

    def __init__(self, parent_app, person):
        super().__init__(parent_app, person, True)


    def execute(self):
        # Firstly call the super method and hide all passwords
        super().execute()

        # Now delete the user from the database
        self.pwd_db.deleteUser(self.person.id)

        # Now send a msg that the WLAN access has been remove
        # The person object might not be fully valid, as the person might have been already deleted from ChurchTools
        room_id = self.get_chat_room_id()

        if room_id:
            delete_msg = self._get_removal_msg()
            self.chat_manager.send_message(room_id, delete_msg)

    def _get_removal_msg(self):
        context = self.template_provider.merge_context(self.person)
        return self.template_provider.render_template("removal_message.mustache", context)