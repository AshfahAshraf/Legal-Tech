from sqlalchemy import Column, Integer, String, JSON
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100))
    email = Column(String(100), unique=True)
    password = Column(String(255))
    role = Column(String(50))
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    temp_password = Column(String(100), nullable=True)
    custom_permissions = Column(JSON, nullable=True, default=dict)
    document_access = Column(JSON, nullable=True, default=list)
    google_refresh_token = Column(String(500), nullable=True)

