import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.authapp.models import User
from app.advocate.tasks.routes import get_current_user
from app.advocate.leave_management.schemas import (
    LeaveApplySchema,
    LeaveStatusUpdateSchema,
    LeaveOutSchema,
    LeaveBalanceOutSchema,
)
from app.advocate.leave_management import service

router = APIRouter()


@router.get("/balances", response_model=LeaveBalanceOutSchema)
def get_user_leave_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    balance = service.get_or_create_user_balance(db, current_user.id)
    return service.format_user_balance_out(balance)


@router.get("", response_model=List[LeaveOutSchema])
def get_leave_requests(
    status_filter: Optional[str] = Query("all", alias="status"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    view_mode: Optional[str] = Query("senior"),
    scope: Optional[str] = Query("all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_leave_requests(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        from_date=from_date,
        to_date=to_date,
        view_mode=view_mode,
        scope=scope,
    )


@router.post("/apply", response_model=LeaveOutSchema, status_code=status.HTTP_213_CREATED if hasattr(status, 'HTTP_213_CREATED') else status.HTTP_201_CREATED)
def apply_leave(
    data: LeaveApplySchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.apply_leave(db=db, current_user=current_user, data=data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{leave_id}/status", response_model=LeaveOutSchema)
def update_leave_status(
    leave_id: int,
    data: LeaveStatusUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure user has authority to approve/reject
    role_norm = (current_user.role or "").lower().replace(" ", "")
    if role_norm not in ["senioradvocate", "clerk", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only Senior Advocates, Clerks, or Admins can approve or reject leave requests.",
        )
    try:
        return service.update_leave_status(
            db=db, approver=current_user, leave_id=leave_id, data=data
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{leave_id}", response_model=LeaveOutSchema)
@router.put("/{leave_id}/cancel", response_model=LeaveOutSchema)
def cancel_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.cancel_leave(db=db, current_user=current_user, leave_id=leave_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/export")
def export_leaves_csv(
    status_filter: Optional[str] = Query("all", alias="status"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    view_mode: Optional[str] = Query("senior"),
    scope: Optional[str] = Query("all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leaves = service.get_leave_requests(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        from_date=from_date,
        to_date=to_date,
        view_mode=view_mode,
        scope=scope,
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Header
    writer.writerow([
        "ID",
        "Applicant Name",
        "Applicant Role",
        "Leave Type",
        "Subject",
        "Description",
        "From Date",
        "To Date",
        "Total Days",
        "Status",
        "Approver Name",
        "Rejection Reason",
        "Applied On",
    ])

    for row in leaves:
        writer.writerow([
            row.id,
            row.applicant_name,
            row.applicant_role,
            row.leave_type,
            row.subject or "",
            row.description or "",
            row.from_date.isoformat() if row.from_date else "",
            row.to_date.isoformat() if row.to_date else "",
            row.total_days,
            row.status,
            row.approver_name or "",
            row.rejection_reason or "",
            row.created_at.strftime("%Y-%m-%d %H:%M:%S") if row.created_at else "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leave_requests.csv"},
    )
