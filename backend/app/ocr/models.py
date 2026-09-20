from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.database import Base
from datetime import datetime


class OcrResult(Base):
    """Stores OCR-extracted text from documents uploaded in a case or standalone."""
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)

    # Optional link to a case
    case_id = Column(
        Integer,
        ForeignKey("case_management_cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=True)   # "image" | "pdf"
    extracted_text = Column(Text, nullable=True)
    digitized_html = Column(Text, nullable=True)
    document_type = Column(String(100), nullable=True)
    structured_fields = Column(Text, nullable=True)
    languages_used = Column(String(255), nullable=True)  # e.g. "eng+mal+hin"
    page_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
