import sys
from datetime import date
from app.database import SessionLocal, engine
from app.authapp.models import User
from app.advocate.leave_management.models import LeaveRequest
from app.advocate.leave_management.schemas import LeaveStatusUpdateSchema
from app.advocate.leave_management.service import update_leave_status
from app.advocate.lawfirm_management.models import AssignedCase

def test_auto_reassign():
    db = SessionLocal()
    try:
        # Find or create Senior Admin approver
        approver = db.query(User).filter(User.role.ilike("%senior%")).first()
        if not approver:
            approver = db.query(User).first()

        # Find or create Junior Advocate applicant
        applicant = db.query(User).filter(User.role.ilike("%junior%")).first()
        if not applicant:
            applicant = approver

        applicant_name = f"{applicant.first_name or ''} {applicant.last_name or ''}".strip() or applicant.username or "alan Advocate"

        # 1. Create a test AssignedCase with hearing date 2026-07-25
        test_case = db.query(AssignedCase).filter(AssignedCase.case_number == "TEST-CASE-999").first()
        if not test_case:
            test_case = AssignedCase(
                case_name="State vs. John Doe Test Case",
                case_number="TEST-CASE-999",
                advocate_name=applicant_name,
                secondary_advocate_name="thasni",
                due_date="2026-07-25",
                status="Active"
            )
            db.add(test_case)
            db.commit()
            db.refresh(test_case)
        else:
            test_case.advocate_name = applicant_name
            test_case.secondary_advocate_name = "thasni"
            test_case.due_date = "2026-07-25"
            db.commit()

        print(f"Pre-Approval: Case '{test_case.case_name}' assigned to Primary: '{test_case.advocate_name}', Secondary: '{test_case.secondary_advocate_name}', Hearing Date: '{test_case.due_date}'")

        # 2. Create a Leave Request for 2026-07-25
        leave_req = LeaveRequest(
            user_id=applicant.id,
            applicant_name=applicant_name,
            applicant_role="Junior Advocate",
            leave_type="Sick Leave",
            description="Medical leave for checkup",
            from_date=date(2026, 7, 25),
            to_date=date(2026, 7, 25),
            total_days=1.0,
            status="Pending"
        )
        db.add(leave_req)
        db.commit()
        db.refresh(leave_req)

        print(f"Submitted Leave Request #{leave_req.id} for {applicant_name} on {leave_req.from_date}")

        # 3. Approve the Leave Request
        updated_req = update_leave_status(
            db=db,
            approver=approver,
            leave_id=leave_req.id,
            data=LeaveStatusUpdateSchema(status="Approved")
        )

        print(f"Leave Status Updated to: {updated_req.status}")
        print(f"Reassigned Cases Count: {getattr(updated_req, 'reassigned_cases_count', 0)}")
        print(f"Reassigned Details: {getattr(updated_req, 'reassigned_details', [])}")

        # 4. Verify DB changes on AssignedCase
        db.refresh(test_case)
        print(f"Post-Approval: Case '{test_case.case_name}' now assigned to: '{test_case.advocate_name}'")

        if test_case.advocate_name == "thasni":
            print("\nSUCCESS: Case hearing was automatically reassigned to Secondary Advocate 'thasni' upon leave approval!")
        else:
            print(f"\nFAILURE: Expected advocate 'thasni' but got '{test_case.advocate_name}'")

    finally:
        db.close()

if __name__ == "__main__":
    test_auto_reassign()
