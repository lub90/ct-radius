from PwdBasedCommand import PwdBasedCommand
from PasswordDatabase import PasswordDatabase

class NewPwdCommand(PwdBasedCommand):

    def __init__(self, parent_app, person, new_pwd=None):
        super().__init__(person, parent_app)
        self.new_pwd = new_pwd

    def execute(self):
        # Get / generate the new pwd
        new_pwd = self.new_pwd
        if not new_pwd:
            new_pwd = self._generate_pwd()

        # Write new_pwd to database
        self.pwd_db.setPwd(self.person.id, new_pwd)

        # Communicate it
        self._communicate_new_pwd(new_pwd)

    def _generate_pwd(self):
        length = self.config.basic.pwd_length
        return ''.join(random.choices(PasswordDatabase.ALLOWED_CHARS, k=length))

    def _communicate_new_pwd(self, new_pwd):
        # Get the room or generate one
        room_id = self._get_or_create_room()

        # Send the new password message
        self._communicate_pwd(room_id, new_pwd)

        # Update the person object
        self.person.chat_room_id = room_id

    def _get_or_create_room(self, person):
        room_id = self.get_chat_room_id()

        if room_id:
            return room_id
        
        # No chat room exists, generate room
        room_name = self._get_room_title(person)
        room_id = self.chat_manager.create_secure_room(room_name)

        # Invite user
        self.chat_manager.invite_user_to_room(room_id, person.guid)
        
        # Send first message
        first_message = self._get_first_msg()
        self.chat_manager.send_message(room_id, first_message)

        return room_id

    def _get_room_title(self, person):
        # Load room name from mustache file, using person object
        return self.template_provider.render_template("room_title.mustache", person)

    def _get_first_msg(self):
        # Load first message from mustache file using the person object and config information
        context = self.template_provider.merge_context(self.person, self.personal_communication_config)

        # Format the display time in a nice manner if it exists
        context.show_pwd_display_time = context.pwd_display_time > 0
        if context.show_pwd_display_time:
            # Format the pwd_display_time in a nice manner
            hours, minutes = divmod(context.pwd_display_time, 60)
            context.pwd_display_time_formatted = f"{hours}:{minutes:02d}"

        return self.template_provider.render_template("initial_message.mustache", context)

