from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.advocate.case_management.models import Case
from app.advocate.lawfirm_management.models import AssignedCase
from app.advocate.consultations.models import Consultation
from datetime import datetime, timezone
import json

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def _time_ago(dt: datetime) -> str:
    """Convert a datetime to a human-readable 'time ago' string."""
    if dt is None:
        return "Recently"
    # Make dt timezone-aware if it isn't
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins} min{'s' if mins != 1 else ''} ago"
    elif seconds < 86400:
        hrs = seconds // 3600
        return f"{hrs} hr{'s' if hrs != 1 else ''} ago"
    elif seconds < 86400 * 7:
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        return dt.strftime("%d %b %Y")


def _iso(dt: datetime) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ─────────────────────────────────────────────────────────────
# GET /dashboard/recent-activity
# ─────────────────────────────────────────────────────────────
@router.get("/recent-activity")
def get_recent_activity(
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """
    Returns a merged, time-sorted feed of:
      - Case status updates (by Junior Advocate or Senior)
      - New cases created
      - Case assignments to Junior Advocates
      - Document uploads (with uploader info from JSON blob)
      - New client consultations
    """
    activities = []

    # ── 1. Case updates & new cases (from case_management_cases) ──
    try:
        # Optimize performance: limit query to recent cases instead of scanning all rows
        cases = db.query(Case).order_by(Case.updated_at.desc(), Case.created_at.desc()).limit(limit * 3).all()
        for case in cases:
            actor = case.selected_advocate if case.selected_advocate else "Senior Advocate"

            # New case creation
            if case.created_at:
                activities.append({
                    "id": f"case_new_{case.id}",
                    "type": "case_new",
                    "actor": actor,
                    "actor_role": "Junior Advocate" if case.selected_advocate else "Senior Advocate",
                    "title": f"New case '{case.case_title}' added for client {case.client_name}",
                    "case_no": case.case_no or "",
                    "case_title": case.case_title or "",
                    "timestamp": _iso(case.created_at),
                    "_dt": case.created_at,
                })

            # Case updated (only if updated_at is after created_at by >5 seconds)
            if case.updated_at and case.created_at:
                diff = (case.updated_at - case.created_at).total_seconds()
                if diff > 5:
                    activities.append({
                        "id": f"case_update_{case.id}",
                        "type": "case_update",
                        "actor": actor,
                        "actor_role": "Junior Advocate" if case.selected_advocate else "Senior Advocate",
                        "title": f"Case '{case.case_title}' updated → Status: {case.status}",
                        "case_no": case.case_no or "",
                        "case_title": case.case_title or "",
                        "timestamp": _iso(case.updated_at),
                        "_dt": case.updated_at,
                    })

            # Documents uploaded (parse JSON blob)
            if case.documents:
                try:
                    docs = case.documents if isinstance(case.documents, list) else json.loads(case.documents or "[]")
                    for idx, doc in enumerate(docs):
                        fname = doc.get("file") or doc.get("filename") or doc.get("name") or "Document"
                        doc_type = doc.get("documentType") or doc.get("document_type") or "File"
                        uploaded_by = (
                            doc.get("advocate")
                            or doc.get("uploadedBy")
                            or doc.get("uploaded_by")
                            or case.selected_advocate
                            or "Unknown"
                        )
                        # Determine uploader role label
                        uploader_label = uploaded_by
                        ul_lower = uploaded_by.lower()
                        if "junior" in ul_lower:
                            role_label = "Junior Advocate"
                        elif "client" in ul_lower:
                            role_label = "Client"
                        elif "senior" in ul_lower:
                            role_label = "Senior Advocate"
                        else:
                            role_label = "Advocate"

                        ref_dt = case.updated_at or case.created_at
                        activities.append({
                            "id": f"doc_{case.id}_{idx}",
                            "type": "document",
                            "actor": uploader_label,
                            "actor_role": role_label,
                            "title": f"'{fname}' ({doc_type}) uploaded for case '{case.case_title}'",
                            "case_no": case.case_no or "",
                            "case_title": case.case_title or "",
                            "timestamp": _iso(ref_dt),
                            "_dt": ref_dt,
                        })
                except Exception:
                    pass
    except Exception as e:
        print(f"[dashboard/recent-activity] Error processing cases: {e}")

    # ── 2. Assigned cases (Junior Advocate assignments) ──
    try:
        # Optimize performance: retrieve only recent assignments
        assigned = db.query(AssignedCase).order_by(AssignedCase.id.desc()).limit(limit * 2).all()
        for ac in assigned:
            activities.append({
                "id": f"assign_{ac.id}",
                "type": "assignment",
                "actor": ac.advocate_name or "Junior Advocate",
                "actor_role": "Junior Advocate",
                "title": f"Case '{ac.case_title or ac.case_name}' assigned to {ac.advocate_name or 'Junior Advocate'}",
                "case_no": ac.case_number or "",
                "case_title": ac.case_title or ac.case_name or "",
                "timestamp": "",
                "_dt": None,
            })
    except Exception as e:
        print(f"[dashboard/recent-activity] Error processing assigned cases: {e}")

    # ── 3. Consultations ──
    try:
        consultations = db.query(Consultation).order_by(Consultation.created_at.desc()).limit(20).all()
        for c in consultations:
            activities.append({
                "id": f"consult_{c.id}",
                "type": "consultation",
                "actor": c.client_name or "Client",
                "actor_role": "Client",
                "title": f"Consultation booked by {c.client_name} — {c.type} on {c.date}",
                "case_no": "",
                "case_title": "",
                "timestamp": _iso(c.created_at),
                "_dt": c.created_at,
            })
    except Exception as e:
        print(f"[dashboard/recent-activity] Error processing consultations: {e}")

    # ── Sort by timestamp desc, put None-dt items at the end ──
    def sort_key(item):
        dt = item.get("_dt")
        if dt is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    activities.sort(key=sort_key, reverse=True)

    # Add human-readable time display and remove internal _dt
    result = []
    for item in activities[:limit]:
        item["timestamp_display"] = _time_ago(item.get("_dt"))
        del item["_dt"]
        result.append(item)

    return result


# ─────────────────────────────────────────────────────────────
# GET /dashboard/recent-documents
# ─────────────────────────────────────────────────────────────
@router.get("/recent-documents")
def get_recent_documents(
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """
    Returns a flat list of all documents uploaded across cases,
    with uploader info, case context, and download URL.
    """
    documents = []

    try:
        # Optimize performance: only retrieve recent cases containing documents
        cases = db.query(Case).filter(Case.documents != None, Case.documents != "[]", Case.documents != "").order_by(Case.updated_at.desc(), Case.created_at.desc()).limit(limit * 3).all()
        for case in cases:
            if not case.documents:
                continue
            try:
                docs = case.documents if isinstance(case.documents, list) else json.loads(case.documents or "[]")
                for idx, doc in enumerate(docs):
                    fname = doc.get("file") or doc.get("filename") or doc.get("name") or "Document"
                    doc_type = doc.get("documentType") or doc.get("document_type") or "File"
                    uploaded_by = (
                        doc.get("advocate")
                        or doc.get("uploadedBy")
                        or doc.get("uploaded_by")
                        or case.selected_advocate
                        or "Unknown"
                    )

                    # Determine uploader role label
                    ul_lower = uploaded_by.lower()
                    if "junior" in ul_lower:
                        role_label = "Junior Advocate"
                    elif "client" in ul_lower:
                        role_label = "Client"
                    elif "senior" in ul_lower:
                        role_label = "Senior Advocate"
                    else:
                        role_label = "Advocate"

                    # Build file URL
                    file_url = doc.get("url") or doc.get("file_url")
                    if not file_url:
                        import urllib.parse
                        safe_name = urllib.parse.quote(fname)
                        file_url = f"http://localhost:8000/uploads/case_documents/{safe_name}"

                    ref_dt = case.updated_at or case.created_at
                    documents.append({
                        "id": f"doc_{case.id}_{idx}",
                        "filename": fname,
                        "document_type": doc_type,
                        "uploaded_by": uploaded_by,
                        "uploaded_by_role": role_label,
                        "case_no": case.case_no or "",
                        "case_title": case.case_title or "",
                        "client_name": case.client_name or "",
                        "timestamp": _iso(ref_dt),
                        "timestamp_display": _time_ago(ref_dt),
                        "file_url": file_url,
                        "_dt": ref_dt,
                    })
            except Exception:
                continue
    except Exception as e:
        print(f"[dashboard/recent-documents] Error: {e}")

    def sort_key(item):
        dt = item.get("_dt")
        if dt is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    documents.sort(key=sort_key, reverse=True)

    result = []
    for doc in documents[:limit]:
        del doc["_dt"]
        result.append(doc)

    return result
