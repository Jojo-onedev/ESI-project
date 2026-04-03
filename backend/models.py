from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="operator")  # "operator" ou "supervisor"
    
    # 👤 Profil enrichi (Phase 8)
    full_name = Column(String, nullable=True) # Ex: Dr. Amadou
    specialty = Column(String, nullable=True) # Ex: Urgentiste
    
    # 🛡️ Protection (Phase 7)
    failed_login_attempts = Column(Integer, default=0)
    lockout_until = Column(DateTime, nullable=True)
    
    cases = relationship("TriageCase", back_populates="operator")
    logs = relationship("AuditLog", back_populates="operator")

class TriageCase(Base):
    __tablename__ = "triage_cases"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id"))
    patient_identifier = Column(String, index=True) # Anonymized or encrypted ID
    symptoms_description = Column(Text)
    
    # Form fields
    consciousness = Column(String)  # Conscient / Inconscient
    breathing = Column(String)      # Normale / Difficile / Absente
    bleeding = Column(String)       # Aucun / Léger / Abondant
    estimated_resources = Column(Integer) # 0, 1, 2 (>=2)
    
    # Result
    esi_level = Column(Integer)     # 1, 2, 3, 4, 5
    esi_explanation = Column(String)
    
    # ⏱️ Performance (Phase 8)
    duration_seconds = Column(Integer, default=0) # Temps passé sur le formulaire
    
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    operator = relationship("Operator", back_populates="cases")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id"))
    action = Column(String) # LOGIN, EVALUATE, DELETE, EXPORT, CLEAR
    details = Column(Text)  # JSON ou texte descriptif
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    operator = relationship("Operator", back_populates="logs")
