from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Auth Schemas
class OperatorCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "operator"
    full_name: Optional[str] = None
    specialty: Optional[str] = None

class OperatorUpdate(BaseModel):
    role: Optional[str] = None
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    password: Optional[str] = None

class Operator(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    specialty: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None


# Triage Schemas
class TriageForm(BaseModel):
    patient_identifier: str
    smur_number: Optional[str] = None
    patient_age: Optional[int] = None
    symptoms_description: str
    caller_name: Optional[str] = None
    caller_surname: Optional[str] = None
    caller_age: Optional[int] = None
    caller_sex: Optional[str] = None
    medical_category: str = "Médecine Générale"
    specific_symptom: Optional[str] = None
    age_category: str = "adult"
    pas: Optional[int] = None
    fc: Optional[int] = None
    spo2: Optional[int] = None
    fr: Optional[int] = None
    gcs: Optional[int] = None
    pain_scale: Optional[int] = None
    estimated_resources: int = 0
    duration_seconds: Optional[int] = 0 # ⏱️ Temps de triage (Phase 8)

class TriageResult(BaseModel):
    esi_level: int
    esi_explanation: str
    color_code: str

class TriageCaseResponse(BaseModel):
    id: int
    operator_id: int
    patient_identifier: str
    smur_number: Optional[str] = None
    patient_age: Optional[int] = None
    symptoms_description: str
    caller_name: Optional[str] = None
    caller_surname: Optional[str] = None
    caller_age: Optional[int] = None
    caller_sex: Optional[str] = None
    medical_category: str
    specific_symptom: Optional[str] = None
    age_category: str
    pas: Optional[int] = None
    fc: Optional[int] = None
    spo2: Optional[int] = None
    fr: Optional[int] = None
    gcs: Optional[int] = None
    pain_scale: Optional[int] = None
    estimated_resources: int
    esi_level: int
    esi_explanation: str
    duration_seconds: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLog(BaseModel):
    id: int
    operator_id: int
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
