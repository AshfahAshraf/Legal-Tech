from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class OcrResultOut(BaseModel):
    id: int
    case_id: Optional[int] = None
    original_filename: str
    file_type: Optional[str] = None
    extracted_text: Optional[str] = None
    digitized_html: Optional[str] = None
    document_type: Optional[str] = None
    structured_fields: Optional[str] = None
    languages_used: Optional[str] = None
    page_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class Point2D(BaseModel):
    x: float  # Percentage (0.0 - 100.0) or Pixel coordinate
    y: float


class DetectCornersResponse(BaseModel):
    width: int
    height: int
    original_preview_b64: Optional[str] = None  # Rendered image Data URI for PDF/Image preview
    corners: List[Point2D]  # 4 points: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
    message: str


class ScanResponse(BaseModel):
    scanned_image_b64: str  # Data URI (data:image/png;base64,...)
    width: int
    height: int
    corners: List[Point2D]
