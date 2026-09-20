from sqlalchemy import Column, Integer, String,Date
from sqlalchemy.dialects.mysql import LONGTEXT
from app.database import Base



class Advocate(Base):
    __tablename__ = "advocates"

    id = Column(Integer, primary_key=True, index=True)
    advocate_name = Column(String(100))
    bar_council_id = Column(String(100))
    phone_number = Column(String(20))
    email_address = Column(String(100))
    city = Column(String(100))
    status = Column(String(20), default="Active")
    role = Column(String(50), default="Junior Advocate", nullable=True)

    # New fields
  
    gender = Column(String(20), nullable=True)
    practice_court = Column(String(100), nullable=True)   
    years_of_experience = Column(Integer, nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    chambers_address = Column(String(500), nullable=True)
    profile_image = Column(LONGTEXT, nullable=True)
    temp_password = Column(String(255), nullable=True)

     # Login password
    hashed_password = Column(String(255), nullable=False)


class AssignedCase(Base):
    __tablename__ = "assigned_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, nullable=True)
    case_name = Column(String(255))
    case_number = Column(String(100))
    case_title = Column(String(255))
    advocate_name = Column(String(255))
    practice_court = Column(String(100))
    priority = Column(String(50))
    due_date = Column(String(50))
    assignment_notes = Column(String(500))   
    status = Column(String(50), default="Active")
    assigned_documents = Column(LONGTEXT, nullable=True)
    appearances = Column(LONGTEXT, nullable=True)
    client_name = Column(String(255), nullable=True)
    secondary_advocate_name = Column(String(255), nullable=True)