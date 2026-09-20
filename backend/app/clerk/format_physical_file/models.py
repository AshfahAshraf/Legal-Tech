from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base
from datetime import datetime

class ClerkPhysicalFile(Base):
    __tablename__ = "clerk_physical_files"

    id = Column(Integer, primary_key=True, index=True)
    file_number = Column(String(100), unique=True, index=True, nullable=False)
    case_number = Column(String(100), nullable=True)
    client_name = Column(String(255), nullable=True)
    cabinet_location = Column(String(100), default="Cabinet A")
    shelf_index = Column(String(100), default="Row 1, Shelf 2")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
