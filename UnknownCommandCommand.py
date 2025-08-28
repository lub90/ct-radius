from Command import Command


class UnknownCommandCommand(Command):


    def execute(self):
        room_id = self.get_chat_room_id()

        # If we do not have a room_id we cannot react to any unknwon command
        if not room_id:
            return

        # Send msg
        unknown_cmd_msg = self._get_unknown_cmd_msg()
        self.chat_manager.send_message(room_id, unknown_cmd_msg)

    def _get_unknownd_cmd_msg(self):
        context = self.template_provider.merge_context(self.person, self.personal_communication_config)
        return self.template_provider.render_template("unknown_command_message.mustache", context)