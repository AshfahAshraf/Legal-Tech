from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date, datetime
from typing import List, Optional

from app.authapp.models import User
from app.advocate.leave_management.models import LeaveRequest, LeaveBalance
from app.advocate.leave_management.schemas import (
    LeaveApplySchema,
    LeaveStatusUpdateSchema,
    LeaveBalanceOutSchema,
    LeaveBalanceItem,
)


def get_or_create_user_balance(db: Session, user_id: int) -> LeaveBalance:
    balance = (
        db.query(LeaveBalance)
        .filter(
            LeaveBalance.user_id == user_id,
            LeaveBalance.financial_year == "FY 2026-27",
        )
        .first()
    )
    if not balance:
        balance = LeaveBalance(
            user_id=user_id,
            financial_year="FY 2026-27",
            emergency_leave_total=6.0,
            emergency_leave_used=0.0,
            sick_leave_total=4.0,
            sick_leave_used=0.0,
            floater_leave_total=2.0,
            floater_leave_used=0.0,
        )
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance


def format_user_balance_out(balance: LeaveBalance) -> LeaveBalanceOutSchema:
    return LeaveBalanceOutSchema(
        financial_year=balance.financial_year,
        emergency_leave=LeaveBalanceItem(
            total=balance.emergency_leave_total,
            used=balance.emergency_leave_used,
            remaining=max(0.0, balance.emergency_leave_total - balance.emergency_leave_used),
        ),
        sick_leave=LeaveBalanceItem(
            total=balance.sick_leave_total,
            used=balance.sick_leave_used,
            remaining=max(0.0, balance.sick_leave_total - balance.sick_leave_used),
        ),
        floater_leave=LeaveBalanceItem(
            total=balance.floater_leave_total,
            used=balance.floater_leave_used,
            remaining=max(0.0, balance.floater_leave_total - balance.floater_leave_used),
        ),
    )


def get_leave_requests(
    db: Session,
    current_user: User,
    status_filter: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    view_mode: Optional[str] = "senior",
    scope: Optional[str] = "all",
) -> List[LeaveRequest]:
    query = db.query(LeaveRequest)

    role_norm = (current_user.role or "").lower().replace(" ", "")

    if view_mode == "junior" or role_norm == "junioradvocate":
        query = query.filter(LeaveRequest.user_id == current_user.id)
    elif view_mode == "clerk":
        if scope == "own":
            query = query.filter(LeaveRequest.user_id == current_user.id)
        elif scope == "team":
            # Clerk reviewing Junior Advocate requests
            query = query.filter(LeaveRequest.user_id != current_user.id)
    elif view_mode == "senior":
        # Senior overview gets all requests
        pass
    elif role_norm not in ["senioradvocate", "admin"]:
        query = query.filter(LeaveRequest.user_id == current_user.id)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(LeaveRequest.status.ilike(status_filter))

    if from_date:
        query = query.filter(LeaveRequest.from_date >= from_date)

    if to_date:
        query = query.filter(LeaveRequest.to_date <= to_date)

    return query.order_by(desc(LeaveRequest.created_at)).all()


def apply_leave(db: Session, current_user: User, data: LeaveApplySchema) -> LeaveRequest:
    # Ensure balance record exists
    get_or_create_user_balance(db, current_user.id)

    # Calculate days if not supplied or invalid
    is_half = data.is_half_day and data.is_half_day != "None"
    if is_half:
        calculated_days = 0.5
    else:
        delta = (data.to_date - data.from_date).days + 1
        calculated_days = float(max(1, delta))

    total_days = data.total_days if (data.total_days is not None and data.total_days > 0) else calculated_days

    new_request = LeaveRequest(
        user_id=current_user.id,
        applicant_name=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.username or "User",
        applicant_role=current_user.role or "Junior Advocate",
        leave_type=data.leave_type,
        subject=data.subject,
        description=data.description,
        from_date=data.from_date,
        to_date=data.to_date,
        total_days=total_days,
        is_half_day=data.is_half_day or "None",
        status="Pending",
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


def auto_reassign_hearings_on_leave_approval(db: Session, leave_req: LeaveRequest):
    from app.advocate.lawfirm_management.models import AssignedCase
    from app.advocate.case_management.models import Case as MgmtCase
    from app.advocate.client_management.models import Hearing

    reassigned_details = []
    reassigned_count = 0

    applicant = db.query(User).filter(User.id == leave_req.user_id).first()
    possible_names = set()
    if applicant:
        name = f"{applicant.first_name or ''} {applicant.last_name or ''}".strip()
        if name:
            possible_names.add(name.lower())
        if applicant.username:
            possible_names.add(applicant.username.lower())
    if leave_req.applicant_name:
        possible_names.add(leave_req.applicant_name.lower())

    # 1. Check AssignedCase table
    all_assigned = db.query(AssignedCase).all()
    for ac in all_assigned:
        adv_name = (ac.advocate_name or "").strip().lower()
        if adv_name in possible_names or any(pn in adv_name for pn in possible_names if pn):
            case_date = None
            if ac.due_date:
                try:
                    case_date = datetime.strptime(ac.due_date.strip().split("T")[0], "%Y-%m-%d").date()
                except Exception:
                    pass
            if case_date and leave_req.from_date <= case_date <= leave_req.to_date:
                sec_name = (ac.secondary_advocate_name or "").strip()
                if sec_name:
                    ac.advocate_name = sec_name
                    reassigned_count += 1
                    msg = f"Assigned Case '{ac.case_name}' (Hearing: {case_date}) automatically transferred to Secondary Advocate: {sec_name}"
                    reassigned_details.append(msg)

    # 2. Check MgmtCase (case_management_cases)
    all_cases = db.query(MgmtCase).all()
    for mc in all_cases:
        sel_adv = (mc.selected_advocate or "").strip().lower()
        if sel_adv in possible_names or any(pn in sel_adv for pn in possible_names if pn):
            case_date = None
            if mc.next_hearing_date:
                try:
                    case_date = datetime.strptime(mc.next_hearing_date.strip().split("T")[0], "%Y-%m-%d").date()
                except Exception:
                    pass
            if case_date and leave_req.from_date <= case_date <= leave_req.to_date:
                matching_ac = db.query(AssignedCase).filter(
                    (AssignedCase.case_id == mc.id) | (AssignedCase.case_number == mc.case_no)
                ).first()
                if matching_ac and matching_ac.secondary_advocate_name:
                    mc.selected_advocate = matching_ac.secondary_advocate_name

    # 3. Check Hearing table
    all_hearings = db.query(Hearing).all()
    for h in all_hearings:
        if (h.advocate_id == leave_req.user_id) or (h.advocate_name and h.advocate_name.lower() in possible_names):
            if h.date and leave_req.from_date <= h.date <= leave_req.to_date:
                matching_ac = db.query(AssignedCase).filter(AssignedCase.case_number == h.case_no).first()
                if matching_ac and matching_ac.secondary_advocate_name:
                    h.advocate_name = matching_ac.secondary_advocate_name
                    sec_user = db.query(User).filter(
                        (User.username.ilike(matching_ac.secondary_advocate_name)) |
                        ((User.first_name + " " + User.last_name).ilike(matching_ac.secondary_advocate_name))
                    ).first()
                    if sec_user:
                        h.advocate_id = sec_user.id

    db.commit()
    return reassigned_count, reassigned_details


def update_leave_status(
    db: Session,
    approver: User,
    leave_id: int,
    data: LeaveStatusUpdateSchema,
) -> LeaveRequest:
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave_req:
        raise ValueError("Leave request not found.")

    old_status = leave_req.status
    leave_req.status = data.status
    leave_req.approved_by_id = approver.id
    leave_req.approver_name = f"{approver.first_name or ''} {approver.last_name or ''}".strip() or approver.username or "Approver"

    if data.rejection_reason:
        leave_req.rejection_reason = data.rejection_reason

    reassigned_count = 0
    reassigned_details = []

    # If status transitioned to Approved from non-Approved state, update leave balance and auto reassign hearings
    if data.status == "Approved" and old_status != "Approved":
        balance = get_or_create_user_balance(db, leave_req.user_id)
        lt_lower = (leave_req.leave_type or "").lower()
        if "emergency" in lt_lower or "casual" in lt_lower:
            balance.emergency_leave_used += leave_req.total_days
        elif "sick" in lt_lower:
            balance.sick_leave_used += leave_req.total_days
        elif "floater" in lt_lower:
            balance.floater_leave_used += leave_req.total_days
        else:
            balance.emergency_leave_used += leave_req.total_days

        # Auto-reassign hearings scheduled on leave dates to Secondary Advocate
        reassigned_count, reassigned_details = auto_reassign_hearings_on_leave_approval(db, leave_req)

    # If previously approved and now rejected/cancelled, revert balance deduction
    if old_status == "Approved" and data.status in ["Rejected", "Cancelled"]:
        balance = get_or_create_user_balance(db, leave_req.user_id)
        lt_lower = (leave_req.leave_type or "").lower()
        if "emergency" in lt_lower or "casual" in lt_lower:
            balance.emergency_leave_used = max(0.0, balance.emergency_leave_used - leave_req.total_days)
        elif "sick" in lt_lower:
            balance.sick_leave_used = max(0.0, balance.sick_leave_used - leave_req.total_days)
        elif "floater" in lt_lower:
            balance.floater_leave_used = max(0.0, balance.floater_leave_used - leave_req.total_days)

    db.commit()
    db.refresh(leave_req)

    # Attach transient properties for response schema
    setattr(leave_req, "reassigned_cases_count", reassigned_count)
    setattr(leave_req, "reassigned_details", reassigned_details)
    return leave_req


def cancel_leave(db: Session, current_user: User, leave_id: int) -> LeaveRequest:
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave_req:
        raise ValueError("Leave request not found.")

    role_norm = (current_user.role or "").lower().replace(" ", "")

    if leave_req.user_id != current_user.id and role_norm not in ["senioradvocate", "admin"]:
        raise PermissionError("You can only delete your own leave requests.")

    if leave_req.status in ["Approved", "Rejected"] and role_norm not in ["senioradvocate", "admin"]:
        raise PermissionError("Only pending leave requests can be deleted.")

    if leave_req.status == "Approved":
        balance = get_or_create_user_balance(db, leave_req.user_id)
        lt_lower = (leave_req.leave_type or "").lower()
        if "emergency" in lt_lower or "casual" in lt_lower:
            balance.emergency_leave_used = max(0.0, balance.emergency_leave_used - leave_req.total_days)
        elif "sick" in lt_lower:
            balance.sick_leave_used = max(0.0, balance.sick_leave_used - leave_req.total_days)
        elif "floater" in lt_lower:
            balance.floater_leave_used = max(0.0, balance.floater_leave_used - leave_req.total_days)

    db.delete(leave_req)
    db.commit()
    return leave_req
