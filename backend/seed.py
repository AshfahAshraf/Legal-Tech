import sys
import os

print("---------------------------------------------------------")
print("WARNING: seed.py has been split into multiple files to")
print("prevent accidental data wiping during development.")
print("---------------------------------------------------------")
print("")
print("Please run one of the following commands instead:")
print("1. For initial server setup/admin data:")
print("   python seed_admin.py")
print("2. For Law Firm mock data:")
print("   python seed_lawfirm.py")
print("3. For Senior Advocate mock data:")
print("   python seed_senior_advocate.py")
print("4. For Client mock data:")
print("   python seed_client.py")
print("")
print("NOTE: For team developers, always use `update_db.bat`")
print("after pulling code to sync your database schema!")
print("---------------------------------------------------------")

if __name__ == "__main__":
    sys.exit(1)
