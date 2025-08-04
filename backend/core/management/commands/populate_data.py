from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Customer

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate database with starter data including default user and customers'

    def handle(self, *args, **options):
        self.stdout.write('Creating starter data...')
        
        # Create default admin user
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_user(
                username='admin',
                email='admin@example.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created admin user: {admin_user.username}')
            )
        else:
            self.stdout.write('Admin user already exists')

        # Create default regular user for demo
        if not User.objects.filter(username='demo').exists():
            demo_user = User.objects.create_user(
                username='demo',
                email='demo@example.com',
                password='demo123',
                first_name='Demo',
                last_name='User'
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created demo user: {demo_user.username}')
            )
        else:
            self.stdout.write('Demo user already exists')

        # Create sample customers
        customers_data = [
            {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john.doe@example.com',
                'phone': '+1-555-0101',
                'company': 'Tech Solutions Inc.',
                'address': '123 Main St, New York, NY 10001'
            },
            {
                'first_name': 'Jane',
                'last_name': 'Smith',
                'email': 'jane.smith@example.com',
                'phone': '+1-555-0102',
                'company': 'Digital Marketing Co.',
                'address': '456 Oak Ave, Los Angeles, CA 90210'
            },
            {
                'first_name': 'Robert',
                'last_name': 'Johnson',
                'email': 'robert.johnson@example.com',
                'phone': '+1-555-0103',
                'company': 'Consulting Group LLC',
                'address': '789 Pine St, Chicago, IL 60601'
            },
            {
                'first_name': 'Emily',
                'last_name': 'Davis',
                'email': 'emily.davis@example.com',
                'phone': '+1-555-0104',
                'company': 'Creative Agency',
                'address': '321 Elm St, Austin, TX 78701'
            },
            {
                'first_name': 'Michael',
                'last_name': 'Wilson',
                'email': 'michael.wilson@example.com',
                'phone': '+1-555-0105',
                'company': 'Software Development Corp.',
                'address': '654 Maple Dr, Seattle, WA 98101'
            }
        ]

        created_count = 0
        for customer_data in customers_data:
            customer, created = Customer.objects.get_or_create(
                email=customer_data['email'],
                defaults=customer_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'Created customer: {customer.full_name}')

        if created_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Created {created_count} new customers')
            )
        else:
            self.stdout.write('All customers already exist')

        self.stdout.write(
            self.style.SUCCESS('Database population completed!')
        )
        self.stdout.write('\nDefault login credentials:')
        self.stdout.write('Username: admin, Password: admin123 (Admin user)')
        self.stdout.write('Username: demo, Password: demo123 (Regular user)')
