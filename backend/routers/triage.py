from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
import sys

# Ajouter le parent au path pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from routers.auth import get_current_user, get_current_supervisor
from esi_logic import calculate_esi

router = APIRouter(prefix="/api/triage", tags=["triage"])

@router.post("/evaluate", response_model=schemas.TriageCaseResponse)
def evaluate_patient(
    form: schemas.TriageForm, 
    db: Session = Depends(get_db), 
    current_user: models.Operator = Depends(get_current_user)
):
    # Tout opérateur authentifié peut soumettre un triage.
    result = calculate_esi(form)
    
    new_case = models.TriageCase(
        operator_id=current_user.id,
        patient_identifier=form.patient_identifier,
        symptoms_description=form.symptoms_description,
        consciousness=form.consciousness,
        breathing=form.breathing,
        bleeding=form.bleeding,
        estimated_resources=form.estimated_resources,
        esi_level=result.esi_level,
        esi_explanation=result.esi_explanation
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # Injection du color_code non persistant
    response_data = new_case.__dict__
    response_data["color_code"] = result.color_code
    
    return new_case

# ⚠️ ROUTE PROTÉGÉE : Réservée aux Superviseurs médicaux
@router.get("/history", response_model=List[schemas.TriageCaseResponse])
def get_history(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.Operator = Depends(get_current_supervisor)
):
    cases = db.query(models.TriageCase).order_by(models.TriageCase.created_at.desc()).offset(skip).limit(limit).all()
    return cases

# ⚠️ ROUTE PROTÉGÉE : Statistiques pour le Tableau de Bord
@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.Operator = Depends(get_current_supervisor)):
    stats = db.query(
        models.TriageCase.esi_level, 
        func.count(models.TriageCase.id)
    ).group_by(models.TriageCase.esi_level).all()
    
    total_cases = db.query(models.TriageCase).count()
    
    # Formatage pour Recharts (Frontend)
    levels_data = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for level, count in stats:
        levels_data[level] = count
        
    result = [
        {"name": "ESI 1 (Rouge)", "value": levels_data[1], "level": 1, "fill": "#dc2626"},
        {"name": "ESI 2 (Orange)", "value": levels_data[2], "level": 2, "fill": "#f97316"},
        {"name": "ESI 3 (Jaune)", "value": levels_data[3], "level": 3, "fill": "#eab308"},
        {"name": "ESI 4 (Vert)", "value": levels_data[4], "level": 4, "fill": "#10b981"},
        {"name": "ESI 5 (Bleu)", "value": levels_data[5], "level": 5, "fill": "#0ea5e9"}
    ]
    
    return {
        "total_cases": total_cases,
        "distribution": result
    }
