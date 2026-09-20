import json
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from .service import run_ocr, ALL_LANGUAGES
from .models import OcrResult
from .schemas import OcrResultOut, DetectCornersResponse, ScanResponse
from .scanner import detect_document_corners, scan_document

router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
    "application/pdf",
}


@router.post("/detect-corners", response_model=DetectCornersResponse)
async def api_detect_corners(file: UploadFile = File(...)):
    """
    Detect quadrilateral boundary corners of a document image before scanning.
    Returns percentages (x%, y%) for [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
    """
    content_type = file.content_type or ""
    file_bytes = await file.read()

    try:
        res = detect_document_corners(file_bytes)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Corner detection failed: {str(e)}")


@router.post("/scan", response_model=ScanResponse)
async def api_scan_document(
    file: UploadFile = File(...),
    corners_json: Optional[str] = Form(None),
    preset: Optional[str] = Form("scanned"),
    auto_contrast: Optional[bool] = Form(False),
    brightness: Optional[int] = Form(0),
    contrast: Optional[int] = Form(0),
    sharpness: Optional[int] = Form(0),
    noise_reduction: Optional[bool] = Form(False),
    shadow_removal: Optional[bool] = Form(False),
    rotation: Optional[int] = Form(0),
):
    """
    Perform 4-point perspective transform warp and apply scanner image enhancement filters.
    Returns Base64 scanned document output.
    """
    file_bytes = await file.read()

    corners_pct = None
    if corners_json:
        try:
            corners_pct = json.loads(corners_json)
        except Exception as e:
            print(f"Error parsing corners_json: {e}")

    try:
        res = scan_document(
            file_bytes=file_bytes,
            corners_pct=corners_pct,
            preset=preset or "scanned",
            auto_contrast=bool(auto_contrast),
            brightness=brightness or 0,
            contrast=contrast or 0,
            sharpness=sharpness or 0,
            noise_reduction=bool(noise_reduction),
            shadow_removal=bool(shadow_removal),
            rotation=rotation or 0,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document scanning failed: {str(e)}")


@router.post("/extract", response_model=OcrResultOut)
async def extract_text(
    file: UploadFile = File(...),
    case_id: Optional[int] = Form(None),
    lang: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload a document (image or PDF) and extract text via OCR pipeline.
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: JPEG, PNG, TIFF, BMP, WEBP, PDF.",
        )

    file_bytes = await file.read()
    selected_lang = lang or ALL_LANGUAGES

    try:
        result = run_ocr(file_bytes, content_type, lang=selected_lang, filename=file.filename or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR Processing Error: {str(e)}")

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    record = OcrResult(
        case_id=case_id,
        original_filename=file.filename or "uploaded_file",
        file_type="pdf" if content_type == "application/pdf" else "image",
        extracted_text=result.get("extracted_text", ""),
        digitized_html=result.get("digitized_html", ""),
        document_type=result.get("document_type", "Legal Document"),
        structured_fields=result.get("structured_fields", "{}"),
        languages_used=result.get("languages_used", selected_lang),
        page_count=result.get("page_count", 1),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/results", response_model=List[OcrResultOut])
def get_ocr_results(
    case_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Fetch all OCR results, optionally filtered by case_id."""
    q = db.query(OcrResult)
    if case_id is not None:
        q = q.filter(OcrResult.case_id == case_id)
    return q.order_by(OcrResult.created_at.desc()).all()


@router.get("/results/{result_id}", response_model=OcrResultOut)
def get_ocr_result(result_id: int, db: Session = Depends(get_db)):
    """Get a single OCR result by ID."""
    record = db.query(OcrResult).filter(OcrResult.id == result_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="OCR result not found")
    return record


@router.delete("/results/{result_id}")
def delete_ocr_result(result_id: int, db: Session = Depends(get_db)):
    """Delete an OCR result record."""
    record = db.query(OcrResult).filter(OcrResult.id == result_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="OCR result not found")
    db.delete(record)
    db.commit()
    return {"message": "OCR result deleted successfully"}
