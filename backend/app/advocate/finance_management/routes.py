from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import SessionLocal
from app.authapp.models import User
from .schemas import (
    InvoiceCreate,
    InvoiceUpdateStatus,
    InvoiceOut,
    InvoiceStats,
    CreateOrderSchema,
    VerifyPaymentSchema
)
from . import service
from pydantic import BaseModel
from app.utils.email import send_email
from app.advocate.case_management.models import Case
import razorpay
import os
import shutil

router = APIRouter(prefix="/finance", tags=["Finance Management"])


# Database connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Razorpay client (safe initialization)
razorpay_key_id = os.getenv("RAZORPAY_KEY_ID")
razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET")

if razorpay_key_id and razorpay_key_secret:
    client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
else:
    client = None


# -----------------------------
# Schemas
# -----------------------------
class PaymentEmailSchema(BaseModel):
    email: str
    client_name: str
    amount: str
    payment_method: str
    gpay_number: str | None = None
    upi_id: str | None = None
    payment_link: str
    invoice_pdf_path: Optional[str] = None




# -----------------------------
# Invoice APIs
# -----------------------------
@router.get("/invoices", response_model=List[InvoiceOut])
def get_invoices(
    advocate_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return service.get_invoices(
        db,
        advocate_id=advocate_id,
        status=status,
        client_name=client_name,
        email=email
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = service.get_invoice_by_id(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/invoices", response_model=InvoiceOut)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    return service.create_invoice(db, data)


@router.put("/invoices/{invoice_id}/status", response_model=InvoiceOut)
def update_status(
    invoice_id: int,
    data: InvoiceUpdateStatus,
    db: Session = Depends(get_db)
):
    invoice = service.update_invoice_status(db, invoice_id, data.status)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    success = service.delete_invoice(db, invoice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


@router.get("/stats", response_model=InvoiceStats)
def get_stats(
    advocate_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    return service.get_invoice_stats(db, advocate_id=advocate_id)


# -----------------------------
# Client API
# -----------------------------
@router.get("/clients")
def get_registered_clients(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "Client").all()
    cases = db.query(Case).all()
    
    client_dict = {}
    
    # Process registered clients
    for user in users:
        client_dict[user.username.lower().strip()] = {
            "id": user.id,
            "name": user.username,
            "email": user.email or "",
            "mobile": user.phone or "",
            "case_number": "",
            "cases": []
        }
        
    # Process cases to find case numbers and add unregistered clients
    for case in cases:
        client_name = case.client_name
        if not client_name:
            continue
            
        key = client_name.lower().strip()
        case_no_str = case.case_no or case.case_id or f"Case #{case.id}"
        case_info = {
            "id": case.id,
            "case_no": case_no_str,
            "case_title": case.case_title or ""
        }
        
        if key not in client_dict:
            # Add client from Case Management
            client_dict[key] = {
                "id": case.id + 10000,
                "name": client_name,
                "email": case.email_id or "",
                "mobile": case.contact_number or "",
                "case_number": case_no_str,
                "cases": []
            }

        if not any(c["id"] == case.id for c in client_dict[key]["cases"]):
            client_dict[key]["cases"].append(case_info)

    # Set default case_number if cases list is populated
    for client in client_dict.values():
        if client["cases"] and not client["case_number"]:
            client["case_number"] = client["cases"][0]["case_no"]

    return list(client_dict.values())


# -----------------------------
# Send Payment Email
# -----------------------------
@router.post("/send-payment-email")
async def send_payment_email(data: PaymentEmailSchema):

    from app.utils.email_templates import build_payment_request_email

    html_content = build_payment_request_email(
        client_name=data.client_name,
        payment_url=data.payment_link
    )

    await send_email(
        to_email=data.email,
        subject="Legal Payment Request & Invoice",
        body=html_content,
        attachment_path=data.invoice_pdf_path
    )

    return {"message": "Email sent successfully"}


# -----------------------------
# Razorpay Create Order
# -----------------------------
@router.post("/payment/create-order")
def create_order(data: CreateOrderSchema):
    if not client:
        raise HTTPException(
            status_code=400,
            detail="Razorpay client is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
        )

    try:
        amount = int(data.amount * 100)
        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1
        })
        return {
            "id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to create Razorpay order: {str(e)}"
        )


# -----------------------------
# Razorpay Verify Payment
# -----------------------------
@router.post("/payment/verify")
def verify_payment(
    data: VerifyPaymentSchema,
    db: Session = Depends(get_db)
):
    # Support mock payments (bypasses Razorpay signature check for mock payments)
    if data.razorpay_signature == "mock_signature":
        invoice = service.update_invoice_status(
            db,
            data.invoice_id,
            "Paid"
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {
            "success": True,
            "message": "Mock payment verified successfully",
            "invoice": invoice
        }

    if not client:
        raise HTTPException(
            status_code=400,
            detail="Razorpay client is not configured on the backend."
        )

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(
            status_code=400,
            detail="Razorpay Signature Verification Failed: Invalid payment signature"
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Payment verification failed: {str(e)}"
        )

    invoice = service.update_invoice_status(
        db,
        data.invoice_id,
        "Paid"
    )

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "success": True,
        "message": "Payment verified successfully",
        "invoice": invoice
    }


# -----------------------------
# Upload Invoice PDF
# -----------------------------
@router.post("/upload-invoice/{invoice_id}")
def upload_invoice(invoice_id: int, file: UploadFile = File(...)):
    uploads_dir = os.path.abspath("uploads")
    invoices_dir = os.path.join(uploads_dir, "invoices")
    if not os.path.exists(invoices_dir):
        os.makedirs(invoices_dir)

    file_path = os.path.join(invoices_dir, f"invoice_{invoice_id}.pdf")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {
            "success": True,
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded PDF: {str(e)}"
        )