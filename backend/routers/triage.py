from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from database import get_db
import models
import schemas
from routers.auth import get_current_user, get_current_supervisor
from auth import log_audit
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
        smur_number=form.smur_number,
        patient_age=form.patient_age,
        symptoms_description=form.symptoms_description,
        medical_category=form.medical_category,
        specific_symptom=form.specific_symptom,
        age_category=form.age_category,
        pas=form.pas,
        fc=form.fc,
        spo2=form.spo2,
        fr=form.fr,
        gcs=form.gcs,
        pain_scale=form.pain_scale,
        estimated_resources=form.estimated_resources,
        esi_level=result.esi_level,
        esi_explanation=result.esi_explanation,
        duration_seconds=form.duration_seconds # ⏱️ Phase 8
    )
    
    db.add(new_case)
    
    # 📝 Audit: Évaluation médicale
    log_audit(db, current_user.id, "EVALUATE", f"Patient: {form.patient_identifier} (ESI {result.esi_level})")
    
    db.commit()
    db.refresh(new_case)
    
    return new_case

# ⚠️ ROUTE PROTÉGÉE : Réservée aux Superviseurs médicaux
@router.get("/history", response_model=List[schemas.TriageCaseResponse])
def get_history(
    skip: int = 0, limit: int = 100,
    sort_by: str = "date",    # "date", "esi_level"
    order: str = "desc",       # "asc" ou "desc"
    filter_level: int = 0,     # 0 = tous, 1-5 = filtrer par niveau
    search: Optional[str] = None, # 🔍 Recherche par identifiant
    db: Session = Depends(get_db),
    current_user: models.Operator = Depends(get_current_user)
):
    query = db.query(models.TriageCase)
    
    # 🕵️ Isolation des données (Phase 11: Workspaces)
    if current_user.role != "supervisor":
        query = query.filter(models.TriageCase.operator_id == current_user.id)
    
    # 🔍 Filtre de recherche (Phase 7)
    if search:
        query = query.filter(models.TriageCase.patient_identifier.ilike(f"%{search}%"))
        
    if filter_level and 1 <= filter_level <= 5:
        query = query.filter(models.TriageCase.esi_level == filter_level)
    
    col = models.TriageCase.esi_level if sort_by == "esi_level" else models.TriageCase.created_at
    query = query.order_by(col.asc() if order == "asc" else col.desc())
    
    return query.offset(skip).limit(limit).all()

# ⚠️ SUPERVISEUR REQUIS : Supprimer UN cas
@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: models.Operator = Depends(get_current_supervisor)
):
    case = db.query(models.TriageCase).filter(models.TriageCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Cas introuvable.")
    
    # 📝 Audit: Suppression
    log_audit(db, current_user.id, "DELETE", f"Suppression du cas #{case_id} ({case.patient_identifier})")
    
    db.delete(case)
    db.commit()
    return {"message": f"Cas #{case_id} supprimé avec succès."}

# ⚠️ SUPERVISEUR REQUIS : Supprimer TOUT l'historique
@router.delete("/all/clear")
def delete_all_cases(
    db: Session = Depends(get_db),
    current_user: models.Operator = Depends(get_current_supervisor)
):
    count = db.query(models.TriageCase).count()
    
    # 📝 Audit: Vidage historique
    log_audit(db, current_user.id, "CLEAR_HISTORY", f"Suppression massive de {count} cas")
    
    db.query(models.TriageCase).delete()
    db.commit()
    return {"message": f"{count} cas supprimés avec succès."}

# ⚠️ ROUTE PROTÉGÉE : Statistiques pour le Tableau de Bord
@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.Operator = Depends(get_current_supervisor)):
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Statistiques globales (pour le camembert)
    stats = db.query(
        models.TriageCase.esi_level, 
        func.count(models.TriageCase.id)
    ).group_by(models.TriageCase.esi_level).all()
    
    total_cases_all = db.query(models.TriageCase).count()
    
    # Stats des dernières 24h
    total_cases_24h = db.query(models.TriageCase).filter(models.TriageCase.created_at >= yesterday).count()
    
    avg_duration_24h = db.query(
        func.avg(models.TriageCase.duration_seconds)
    ).filter(models.TriageCase.created_at >= yesterday).scalar() or 0
    
    critical_24h = db.query(models.TriageCase).filter(
        models.TriageCase.esi_level <= 2,
        models.TriageCase.created_at >= yesterday
    ).count()

    total_operators = db.query(models.Operator).count()
    
    # Formatage pour Recharts (Distribution globale)
    levels_data = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for level, count in stats:
        levels_data[level] = count
        
    distribution = [
        {"name": "ESI 1 (Rouge)", "value": levels_data[1], "level": 1, "fill": "#dc2626"},
        {"name": "ESI 2 (Orange)", "value": levels_data[2], "level": 2, "fill": "#f97316"},
        {"name": "ESI 3 (Jaune)", "value": levels_data[3], "level": 3, "fill": "#eab308"},
        {"name": "ESI 4 (Vert)", "value": levels_data[4], "level": 4, "fill": "#10b981"},
        {"name": "ESI 5 (Bleu)", "value": levels_data[5], "level": 5, "fill": "#0ea5e9"}
    ]
    
    return {
        "total_cases_all": total_cases_all,
        "total_cases_24h": total_cases_24h,
        "critical_24h": critical_24h,
        "avg_duration": round(float(avg_duration_24h), 1),
        "total_operators": total_operators,
        "distribution": distribution
    }

# ⚠️ ROUTE PROTÉGÉE : Liste des logs d'audit pour superviseur
@router.get("/audit", response_model=List[schemas.AuditLog])
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.Operator = Depends(get_current_supervisor)
):
    return db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(limit).all()
