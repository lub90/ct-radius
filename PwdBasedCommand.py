

class PwdBasedCommand(Command):

    def _communicate_pwd(self, room_id, pwd):
        # Send the new password message
        msg = self._get_pwd_msg(pwd)
        self.chat_manager.send_message(room_id, msg)

    def _get_pwd_msg(self, pwd):
        context = self.template_provider.merge_context(self.person)
        context.password = pwd
        return self.template_provider.render_template("password_message.mustache", context)