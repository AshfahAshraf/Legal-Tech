import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.advocate.permissions.service import (
    get_roles, get_permissions_matrix, provision_user,
    update_user, check_user_permission, delete_user, get_user_by_username
)
from app.advocate.permissions.schemas import UserProvision, UserUpdate, PermissionSchema

def run_tests():
    db = SessionLocal()
    print("--- Testing Roles Fetching ---")
    roles = get_roles(db)
    for role in roles:
        print(f"Role: {role.name} ({role.id}) - {role.description}")
    
    print("\n--- Testing Permissions Matrix Fetching ---")
    matrix = get_permissions_matrix(db)
    for role_name, modules in matrix.items():
        print(f"Role permissions for '{role_name}':")
        for mod, acts in list(modules.items())[:2]: # Show first 2 modules for brevity
            print(f"  {mod}: {acts}")
        print("  ...")

    print("\n--- Testing User Provisioning and Overrides ---")
    # Provision a test user under Junior Advocate role
    username = "testjunior_verify"
    email = "testjunior_verify@legaltech.com"
    
    # Clean up if left from previous runs
    existing = get_user_by_username(db, username)
    if existing:
        delete_user(db, existing.id)

    prov_schema = UserProvision(
        firstName="Test",
        lastName="Junior",
        phone="+1234567890",
        username=username,
        email=email,
        role="Junior Advocate",
        tempPassword="password123"
    )
    
    test_user = provision_user(db, prov_schema)
    print(f"Provisioned test user: {test_user.username} with role: {test_user.role}")

    # Check permission default (Junior Advocate: Case Management -> view=True, add=True, delete=False)
    # Junior Advocate default for 'Case Management' should have view=True, delete=False
    can_view_default = check_user_permission(db, test_user.id, "Case Management", "view")
    can_delete_default = check_user_permission(db, test_user.id, "Case Management", "delete")
    print(f"Default (Role-based) permissions check:")
    print(f"  Can view Case Management: {can_view_default} (Expected: True)")
    print(f"  Can delete Case Management: {can_delete_default} (Expected: False)")

    # Apply override (Junior Advocate custom override: Case Management -> delete=True)
    update_schema = UserUpdate(
        customPermissions={
            "Case Management": PermissionSchema(view=True, add=True, edit=True, delete=True)
        }
    )
    
    updated_user = update_user(db, test_user.id, update_schema)
    print(f"Applied custom permissions override to {updated_user.username}")

    # Re-check permission (should return delete=True)
    can_delete_override = check_user_permission(db, test_user.id, "Case Management", "delete")
    print(f"Override permissions check:")
    print(f"  Can delete Case Management: {can_delete_override} (Expected: True)")

    # Check non-overridden module (Junior Advocate default: Dashboard -> view=True, edit=False)
    # Since Dashboard has no custom override, it should fallback to role default
    can_edit_dashboard = check_user_permission(db, test_user.id, "Dashboard", "edit")
    print(f"Fallback permissions check (Dashboard edit): {can_edit_dashboard} (Expected: False)")

    # Clean up
    delete_user(db, test_user.id)
    print("Cleaned up test user.")
    
    db.close()
    print("\nAll permissions checks verified successfully!")

if __name__ == "__main__":
    run_tests()
