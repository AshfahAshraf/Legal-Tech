import os
import json
from datetime import datetime
from dotenv import load_dotenv

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

try:
    import google.generativeai as genai  # type: ignore # pyright: ignore[reportMissingImports]
except Exception:
    genai = None

from .models import Case, AIDocumentHistory
from .schemas import CaseCreate, CaseUpdate


def create_case(db: Session, data: CaseCreate):
    if data.cnrNumber and data.cnrNumber.strip():
        cnr_val = data.cnrNumber.strip()
        existing = db.query(Case).filter(func.lower(Case.cnr_number) == func.lower(cnr_val)).first()
        if existing:
            raise HTTPException(status_code=400, detail="A case with this CNR Number already exists.")

    new_case = Case(
        case_id=data.caseId,
        case_title=data.caseTitle,
        case_no=data.caseNo,
        case_type=data.caseType,
        case_description=data.caseDes,

        client_name=data.clientName,
        contact_number=data.contactNumber,
        alt_contact_number=data.altContactNumber,
        email_id=data.emailId,
        client_role=data.clientRole,
        client_address=data.clientAddress,
        client_district=data.clientDistrict,

        court_name=data.courtName,
        court_type=data.courtType,

        status=data.status,

        selected_advocate=data.selectedAdvocate,
        documents=json.dumps(
            [doc.model_dump() if hasattr(doc, 'model_dump') else doc.dict() for doc in data.documents]
        ) if data.documents else "[]",
        next_hearing_date=data.nextHearingDate,
        cnr_number=data.cnrNumber
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    if isinstance(new_case.documents, str):
        db.expunge(new_case)
        try:
            new_case.documents = json.loads(new_case.documents or "[]")
        except Exception:
            new_case.documents = []

    return new_case


def get_all_cases(db: Session):
    cases = db.query(Case).order_by(Case.id.desc()).all()

    try:
        from app.advocate.lawfirm_management.models import AssignedCase
        assigned_list = db.query(AssignedCase).all()
        ac_map_id = {ac.case_id: ac for ac in assigned_list if ac.case_id}
        ac_map_no = {ac.case_number: ac for ac in assigned_list if ac.case_number}
    except Exception:
        ac_map_id, ac_map_no = {}, {}

    for case in cases:
        db.expunge(case)
        if isinstance(case.documents, str):
            try:
                case.documents = json.loads(case.documents or "[]")
            except Exception:
                case.documents = []

        ac = ac_map_id.get(case.id) or ac_map_no.get(case.case_no)
        if ac:
            setattr(case, "advocate_name", ac.advocate_name or case.selected_advocate)
            setattr(case, "secondary_advocate_name", ac.secondary_advocate_name)
            if not case.selected_advocate and ac.advocate_name:
                case.selected_advocate = ac.advocate_name
        else:
            setattr(case, "advocate_name", case.selected_advocate)
            setattr(case, "secondary_advocate_name", None)

    return cases


def get_case(db: Session, case_id: int):
    case = db.query(Case).filter(Case.id == case_id).first()

    if case:
        db.expunge(case)
        if isinstance(case.documents, str):
            try:
                case.documents = json.loads(case.documents or "[]")
            except Exception:
                case.documents = []

        try:
            from app.advocate.lawfirm_management.models import AssignedCase
            ac = db.query(AssignedCase).filter(
                (AssignedCase.case_id == case.id) |
                (AssignedCase.case_id.is_(None) & (AssignedCase.case_number == case.case_no))
            ).first()
            if ac:
                setattr(case, "advocate_name", ac.advocate_name or case.selected_advocate)
                setattr(case, "secondary_advocate_name", ac.secondary_advocate_name)
                if not case.selected_advocate and ac.advocate_name:
                    case.selected_advocate = ac.advocate_name
            else:
                setattr(case, "advocate_name", case.selected_advocate)
                setattr(case, "secondary_advocate_name", None)
        except Exception:
            setattr(case, "advocate_name", case.selected_advocate)
            setattr(case, "secondary_advocate_name", None)

    return case


def update_case(db: Session, case_id: int, data: CaseUpdate):
    case = db.query(Case).filter(Case.id == case_id).first()

    if not case:
        return None

    if data.caseId is not None:
        case.case_id = data.caseId
    if data.caseTitle is not None:
        case.case_title = data.caseTitle
    if data.caseNo is not None:
        case.case_no = data.caseNo
    if data.caseType is not None:
        case.case_type = data.caseType
    if data.caseDes is not None:
        case.case_description = data.caseDes
    if data.clientName is not None:
        case.client_name = data.clientName
    if data.contactNumber is not None:
        case.contact_number = data.contactNumber
    if data.altContactNumber is not None:
        case.alt_contact_number = data.altContactNumber
    if data.emailId is not None:
        case.email_id = data.emailId
    if data.clientRole is not None:
        case.client_role = data.clientRole
    if data.clientAddress is not None:
        case.client_address = data.clientAddress
    if data.clientDistrict is not None:
        case.client_district = data.clientDistrict
    if data.courtName is not None:
        case.court_name = data.courtName
    if data.courtType is not None:
        case.court_type = data.courtType
    if data.status is not None:
        case.status = data.status
        try:
            from app.advocate.lawfirm_management.models import AssignedCase
            assigned_cases = db.query(AssignedCase).filter(
                AssignedCase.case_id == case.id
            ).all()
            for ac in assigned_cases:
                if data.status == "Pending":
                    ac.status = "In Progress"
                elif data.status == "Closed":
                    ac.status = "Closed"
                else:
                    ac.status = data.status
        except Exception as e:
            print(f"Error synchronizing case status to assignment: {e}")

    if data.selectedAdvocate is not None:
        case.selected_advocate = data.selectedAdvocate
        try:
            from app.advocate.lawfirm_management.models import AssignedCase
            if not data.selectedAdvocate:
                db.query(AssignedCase).filter(
                    (AssignedCase.case_id == case.id) |
                    (AssignedCase.case_id.is_(None) & (AssignedCase.case_number == case.case_no))
                ).delete(synchronize_session=False)
            else:
                assigned_cases = db.query(AssignedCase).filter(
                    (AssignedCase.case_id == case.id) |
                    (AssignedCase.case_id.is_(None) & (AssignedCase.case_number == case.case_no))
                ).all()
                for ac in assigned_cases:
                    ac.advocate_name = data.selectedAdvocate
                    if ac.case_id is None:
                        ac.case_id = case.id
        except Exception as e:
            print(f"Error synchronizing advocate on case update: {e}")
    if data.documents is not None:
        case.documents = json.dumps(
            [doc.model_dump() if hasattr(doc, 'model_dump') else doc.dict() for doc in data.documents]
        )
        try:
            from app.advocate.lawfirm_management.models import AssignedCase
            assigned_cases = db.query(AssignedCase).filter(
                (AssignedCase.case_id == case.id) |
                (AssignedCase.case_id.is_(None) & (AssignedCase.case_number == case.case_no))
            ).all()
            for ac in assigned_cases:
                if ac.case_id is None:
                    ac.case_id = case.id
                ac.assigned_documents = case.documents
        except Exception as e:
            print(f"Error synchronizing document permissions: {e}")
    if data.nextHearingDate is not None:
        case.next_hearing_date = data.nextHearingDate
    if data.cnrNumber is not None:
        cnr_val = data.cnrNumber.strip() if isinstance(data.cnrNumber, str) else ""
        if cnr_val:
            existing = db.query(Case).filter(func.lower(Case.cnr_number) == func.lower(cnr_val), Case.id != case_id).first()
            if existing:
                raise HTTPException(status_code=400, detail="A case with this CNR Number already exists.")
        case.cnr_number = data.cnrNumber

    case.updated_at = datetime.utcnow()

    if isinstance(case.documents, (list, dict)):
        case.documents = json.dumps(case.documents)

    db.commit()
    db.refresh(case)

    if isinstance(case.documents, str):
        case.documents = json.loads(case.documents or "[]")

    return case


def delete_case(db: Session, case_id: int):
    case = db.query(Case).filter(Case.id == case_id).first()

    if not case:
        return None

    db.delete(case)
    db.commit()

    return case


def generate_legal_document(db: Session, case_id: int, user_prompt: str):
    case = get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    load_dotenv()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured in backend")

    genai.configure(api_key=api_key)
    
    context = f"""
    Case Title: {case.case_title}
    Case Number: {case.case_no}
    Case Type: {case.case_type}
    Client Name: {case.client_name}
    Court: {case.court_name} ({case.court_type})
    Case Description: {case.case_description}
    Status: {case.status}
    """
    
    full_prompt = f"""
You are an expert legal assistant. Use the following context about a legal case to generate the requested document. 
Format the output in clean Markdown. Include appropriate placeholders like [Signature] or [Date] where necessary.

Context:
{context}

User Request:
{user_prompt}
"""

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(full_prompt)
        doc_content = response.text

        history_item = AIDocumentHistory(
            case_id=case.id,
            case_no=case.case_no,
            case_title=case.case_title,
            prompt=user_prompt,
            content=doc_content
        )
        db.add(history_item)
        db.commit()
        db.refresh(history_item)

        return {
            "id": history_item.id,
            "document": doc_content,
            "case_id": case.id,
            "case_no": case.case_no,
            "case_title": case.case_title,
            "prompt": user_prompt,
            "created_at": history_item.created_at.isoformat() if history_item.created_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


def get_ai_document_histories(db: Session, case_id: int = None):
    query = db.query(AIDocumentHistory)
    if case_id:
        query = query.filter(AIDocumentHistory.case_id == case_id)
    return query.order_by(AIDocumentHistory.created_at.desc()).all()


def update_ai_document_history(db: Session, doc_id: int, content: str = None, prompt: str = None):
    doc = db.query(AIDocumentHistory).filter(AIDocumentHistory.id == doc_id).first()
    if not doc:
        return None
    if content is not None:
        doc.content = content
    if prompt is not None:
        doc.prompt = prompt
    doc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)
    return doc


def delete_ai_document_history(db: Session, doc_id: int):
    doc = db.query(AIDocumentHistory).filter(AIDocumentHistory.id == doc_id).first()
    if not doc:
        return False
    db.delete(doc)
    db.commit()
    return True


def ask_ai_assistant(db: Session, user_query: str, user_role: str = None, advocate_name: str = None, client_name: str = None):
    load_dotenv()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured in backend")
        
    genai.configure(api_key=api_key)
    
    cases = get_all_cases(db)
    if user_role == "Junior Advocate" and advocate_name:
        cases = [c for c in cases if c.selected_advocate == advocate_name]
    
    if client_name:
        client_name_lower = client_name.strip().lower()
        cases = [c for c in cases if c.client_name and (client_name_lower in c.client_name.strip().lower() or c.client_name.strip().lower() in client_name_lower)]
    
    context_lines = []
    for case in cases:
        case_info = f"Case Title: {case.case_title} | Case No: {case.case_no} | Status: {case.status} | Client: {case.client_name} (Phone: {case.contact_number}, Email: {case.email_id}) | Court: {case.court_name} | Next Hearing: {case.next_hearing_date or 'Not scheduled'}"
        
        doc_info = "Documents: None"
        if case.documents:
            try:
                docs = case.documents if isinstance(case.documents, list) else json.loads(case.documents)
                if docs:
                    doc_names = [f"{d.get('file', 'Unknown')} ({d.get('documentType', 'Unknown type')})" for d in docs]
                    doc_info = "Documents: " + ", ".join(doc_names)
            except Exception:
                pass
                
        context_lines.append(f"- {case_info} | {doc_info}")
        
    context_block = "\n".join(context_lines)

    invoices_context = ""
    consultations_context = ""
    
    if client_name:
        try:
            from app.advocate.finance_management.models import Invoice
            invoices = db.query(Invoice).all()
            matched_invoices = [inv for inv in invoices if inv.client_name and (client_name_lower in inv.client_name.strip().lower() or inv.client_name.strip().lower() in client_name_lower)]
            if matched_invoices:
                inv_lines = []
                for inv in matched_invoices:
                    inv_lines.append(f"- Invoice ID: {inv.id} | Amount: ₹{inv.grand_total} | Status: {inv.status} | Date: {inv.created_at.strftime('%Y-%m-%d') if inv.created_at else 'N/A'} | Method: {inv.payment_method or 'N/A'}")
                invoices_context = "\n".join(inv_lines)
            else:
                invoices_context = "No invoices found."
        except Exception as e:
            invoices_context = f"Error fetching invoices: {str(e)}"
            
        try:
            from app.advocate.consultations.models import Consultation
            consultations = db.query(Consultation).all()
            matched_consultations = [con for con in consultations if con.client_name and (client_name_lower in con.client_name.strip().lower() or con.client_name.strip().lower() in client_name_lower)]
            if matched_consultations:
                cons_lines = []
                for con in matched_consultations:
                    cons_lines.append(f"- Consultation ID: {con.id} | Issue: {con.issue or 'N/A'} | Status: {con.status} | Date: {con.date} {con.time} | Type: {con.type} | Summary: {con.summary or 'No summary'}")
                consultations_context = "\n".join(cons_lines)
            else:
                consultations_context = "No consultations found."
        except Exception as e:
            consultations_context = f"Error fetching consultations: {str(e)}"

    advocates_context = ""
    try:
        from app.advocate.lawfirm_management.models import Advocate, AssignedCase
        advocates = db.query(Advocate).all()
        assigned_cases_list = db.query(AssignedCase).all()
        adv_lines = []
        for a in advocates:
            name = a.advocate_name or ""
            a_name = name.strip().lower()
            handling = [ac.case_number or ac.case_name or str(ac.case_id) for ac in assigned_cases_list if ac.advocate_name and ac.advocate_name.strip().lower() == a_name]
            primary_handling = [c.case_no or c.case_title for c in cases if c.selected_advocate and c.selected_advocate.strip().lower() == a_name]
            all_handling = list(set(handling + primary_handling))
            cases_str = ", ".join(all_handling) if all_handling else "None"
            adv_lines.append(f"- Advocate: {a.advocate_name} ({a.role or 'Advocate'}) | Contact: {a.phone_number or 'N/A'}, Email: {a.email_address or 'N/A'} | Handling Cases: {cases_str}")
        advocates_context = "\n".join(adv_lines) if adv_lines else "No advocate records."
    except Exception as e:
        advocates_context = f"Error: {str(e)}"

    leave_context = ""
    try:
        from app.advocate.leave_management.models import LeaveRequest
        leaves = db.query(LeaveRequest).all()
        leave_lines = []
        for l in leaves:
            leave_lines.append(f"- Staff/Advocate: {l.applicant_name} ({l.applicant_role}) | Leave Type: {l.leave_type} | Dates: {l.from_date} to {l.to_date} ({l.total_days} days) | Status: {l.status} | Reason: {l.description or 'N/A'}")
        leave_context = "\n".join(leave_lines) if leave_lines else "No leave records."
    except Exception as e:
        leave_context = f"Error: {str(e)}"

    client_info_block = ""
    if client_name:
        client_info_block = f"""
Context (Client Specific Invoices & Billing):
{invoices_context}

Context (Client Specific Consultations & Discussions):
{consultations_context}
"""

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    full_prompt = f"""
You are an expert AI Legal Assistant for an advocate. You have access to the following context about the law firm's cases, advocates, staff leave records, clients, and documents.
Answer the user's question accurately based ONLY on this context. 

Current Date and Time: {current_time}
Scheduler Logic: Automatic reminders are sent to clients and advocates exactly 5, 2, and 1 days before the Next Hearing Date. Use the current date to deduce if reminders have been sent.

Drafting: If the user asks you to draft a legal document (e.g., a notice), write out the full draft using professional legal formatting in Markdown, filling in details from the context.

Action Taking (Function Calling): 
If the user explicitly asks you to UPDATE the status of a case, you MUST return ONLY a JSON object (without any markdown formatting or extra text) in the following exact format:
{{
  "action": "update_status",
  "case_no": "insert_case_no_here",
  "new_status": "insert_new_status_here (Active, Pending, or Closed)",
  "reply": "I have successfully updated the status of the case to [status]."
}}
DO NOT return JSON unless an action is requested. If no action is requested, answer normally in markdown.

Context (Cases):
{context_block}

Context (Advocates & Assigned Cases):
{advocates_context}

Context (Staff & Advocate Leave Records):
{leave_context}
{client_info_block}

User Question:
{user_query}
"""

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(full_prompt)
        response_text = response.text.strip()
        
        if response_text.startswith("{") and response_text.endswith("}") and '"action"' in response_text:
            try:
                action_data = json.loads(response_text)
                if action_data.get("action") == "update_status":
                    case_no = action_data.get("case_no")
                    new_status = action_data.get("new_status")
                    
                    case_to_update = db.query(Case).filter(Case.case_no == case_no).first()
                    if case_to_update:
                        case_to_update.status = new_status
                        db.commit()
                        return {"response": action_data.get("reply", "Status updated successfully.")}
                    else:
                        return {"response": f"Failed to update: Could not find case with number {case_no}."}
            except json.JSONDecodeError:
                pass
                
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Assistant failed: {str(e)}")
