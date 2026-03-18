from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Auth Schemas
class OperatorCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "operator"

class Operator(BaseModel):
    id: int
    username: str
    role: str

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
    symptoms_description: str
    consciousness: str   # Conscient, Inconscient
    breathing: str       # Normale, Difficile, Absente
    bleeding: str        # Aucun, Léger, Abondant
    estimated_resources: int # 0, 1, 2

class TriageResult(BaseModel):
    esi_level: int
    esi_explanation: str
    color_code: str

class TriageCaseResponse(BaseModel):
    id: int
    operator_id: int
    patient_identifier: str
    symptoms_description: str
    consciousness: str
    breathing: str
    bleeding: str
    estimated_resources: int
    esi_level: int
    esi_explanation: str
    created_at: datetime

    class Config:
        from_attributes = True
