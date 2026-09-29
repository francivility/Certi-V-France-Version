from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import CPCType, Fee, RequirementType, Role


class Command(BaseCommand):
    help = (
        "Seed the reference/basis data (staff roles, CPC types, fees and "
        "requirement types) so the portal and TMS have a usable dropdown list. "
        "Safe to run again - nothing is deleted and duplicates are skipped."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        self._set_force_color()
        self.stdout.write("Seeding reference data...")

        roles = [
            "Applicant",
            "Receiving Officer",
            "CTDO",
            "Financial Analyst",
            "Legal Officer",
            "ORD",
            "Records Officer",
            "Cashier",
        ]
        for name in roles:
            _, created = Role.objects.get_or_create(role_name=name)
            self._print("role", name, created)

        cpc_types = [
            ("Truck for Hire", "For hauling goods/cargo commercially"),
            ("Public Utility Jeepney", "For public passenger transport"),
            ("Public Utility Bus", ""),
            ("Taxi", ""),
            ("School Transport", ""),
            ("Tourist Transport", ""),
            ("Utility Vehicle Express Service", ""),
            ("Shuttle Service", "Point-to-point transport services, typically for airport, hotel, or private shuttles"),
            ("TNVS", "Transport Network Vehicle Service (ride-hailing)."),
        ]
        for name, desc in cpc_types:
            _, created = CPCType.objects.get_or_create(
                type_name=name, defaults={"description": desc}
            )
            self._print("CPC type", name, created)

        fees = [
            ("Filing Fee (First two units)", "510.00", False),
            ("Filing Fee (per unit in excess)", "70.00", True),
            ("Unit Verification Fee", "40.00", True),
            ("Inspection Fee (PUV)", "50.00", True),
            ("Inspection Fee (Bus and Truck)", "100.00", True),
        ]
        for name, amount, allow_quantity in fees:
            _, created = Fee.objects.get_or_create(
                fee_name=name,
                defaults={"amount": amount, "allow_quantity": allow_quantity},
            )
            self._print("fee", f"{name} ({amount})", created)

        requirements = [
            "Notarized Petition",
            "Official Receipt/Certificate of Registration (OR/CR)",
            "Passenger Accident Assurance",
            "Valid Government ID / Certificate of Business Name (issued by DTI)",
            "Operators Data Sheet",
        ]
        for name in requirements:
            _, created = RequirementType.objects.get_or_create(requirement_name=name)
            self._print("requirement type", name, created)

        self.stdout.write(self.style.SUCCESS("Done. Reference data is ready."))

    def _print(self, kind, name, created):
        mark = self.style.SUCCESS("[created]") if created else self.style.WARNING("[exists]")
        self.stdout.write(f"  {mark} {kind}: {name}")

    def _set_force_color(self):
        try:
            from django.core.management.color import color_style

            self.style = color_style(force_color=True)
        except Exception:
            pass
