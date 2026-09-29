from django.core.management.base import BaseCommand
from accounts.models import User
from core.models import Role


class Command(BaseCommand):
    help = 'Create a new user with a role'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--password', required=True)
        parser.add_argument('--role', required=True)
        parser.add_argument('--email', default='')

    def handle(self, *args, **options):
        role, _ = Role.objects.get_or_create(role_name=options['role'])
        user = User(
            username=options['username'],
            email=options['email'],
            role=role,
        )
        user.set_password(options['password'])
        user.save()
        self.stdout.write(self.style.SUCCESS(
            f'Created user "{user.username}" with role "{role.role_name}"'
        ))
