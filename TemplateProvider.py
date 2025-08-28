import os
import re
import pystache

from types import SimpleNamespace

class TemplateProvider:

    def __init__(self, language, templates_dir="templates"):
        self.template_dir = os.path.join(templates_dir, language)

    def render_template(self, filename, context):
        template_path = os.path.join(self.template_dir, filename)
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
        return pystache.render(template, context)

    def render_regex_template(self, filename):
        template_path = os.path.join(self.template_dir, filename)
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
            
        # Escape all regex special characters
        escaped = re.escape(template)

        # Replace escaped {{variable}} with regex wildcard
        pattern = re.sub(r'\\{\\{.*?\\}\\}', r'.+?', escaped)

        # Anchor the pattern to match the full string
        return re.compile(f"^{pattern}$")

    def merge_context(*objects):
        context = SimpleNamespace()
        for obj in objects:
            context.__dict__.update(obj.__dict__)
        return context