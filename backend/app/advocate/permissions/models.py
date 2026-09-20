from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(String(50), primary_key=True, index=True)  # e.g., 'senioradvocate', 'junioradvocate', 'client'
    name = Column(String(100), unique=True, nullable=False) # e.g., 'Senior Advocate', 'Junior Advocate', 'Client'
    description = Column(String(255), nullable=True)

    permissions = relationship("Permission", back_populates="role", cascade="all, delete-orphan")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_id = Column(String(50), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(100), nullable=False)  # e.g., 'Dashboard', 'Law Firm Management'
    view = Column(Boolean, default=False, nullable=False)
    add = Column(Boolean, default=False, nullable=False)
    edit = Column(Boolean, default=False, nullable=False)
    delete = Column(Boolean, default=False, nullable=False)

    role = relationship("Role", back_populates="permissions")
