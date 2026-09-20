from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base
from datetime import datetime

class ClerkTask(Base):
    __tablename__ = "clerk_tasks"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(255), nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
