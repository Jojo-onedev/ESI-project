from database import engine, Base, SessionLocal
import models
import auth
import datetime

# Creer les tables sur la base de donnees locale
Base.metadata.create_all(bind=engine)

def main():
    db = SessionLocal()
    
    # 1. Création de l'opérateur simple de démo
    op = db.query(models.Operator).filter(models.Operator.username == "demo_op").first()
    if not op:
        print("Creation de l'operateur (demo_op / samu123)...")
        new_op = models.Operator(
            username="demo_op", 
            hashed_password=auth.get_password_hash("samu123"), 
            role="operator",
            full_name="Infirmier Moussa",
            specialty="Régulateur"
        )
        db.add(new_op)
        db.commit()
        db.refresh(new_op)
        op = new_op

    # 2. Création du superviseur
    sup = db.query(models.Operator).filter(models.Operator.username == "admin_samu").first()
    if not sup:
        print("Creation du medecin superviseur (admin_samu / admin123)...")
        new_sup = models.Operator(
            username="admin_samu", 
            hashed_password=auth.get_password_hash("admin123"), 
            role="supervisor",
            full_name="Dr. Amadou Traoré",
            specialty="Médecin Chef Urgentiste"
        )
        db.add(new_sup)
        db.commit()
        db.refresh(new_sup)
        sup = new_sup

    # Génération d'un gros jeu de données aléatoire pour bien voir les graphes
    if db.query(models.TriageCase).count() == 0:
        print("Generation de l'historique ESI & Audit...")
        import random
        # Quelques cas prédéfinis
        # Quelques cas prédéfinis avec le nouveau schéma (smur_number, patient_age, age_category, pas, fc, spo2, fr, gcs, pain_scale, estimated_resources, esi_level, esi_explanation)
        base_cases = [
            ("Traoré", "SMUR-01", 45, "Choc, totalement inconscient", "adult", 60, 190, 80, 45, 5, 0, 2, 1, "Danger vital immédiat"),
            ("Mamadou", "SMUR-03", 30, "Coupure profonde au bras avec une machette", "adult", 120, 140, 95, 25, 15, 8, 1, 2, "Hémorragie sévère"),
            ("Fatou", "SMUR-02", 25, "Douleur au ventre depuis 3h, nausées", "adult", 130, 90, 98, 18, 15, 6, 2, 3, "Urgent (2 ressources)"),
            ("Saliou", None, 10, "Entorse cheville", "child", 110, 100, 99, 20, 15, 4, 1, 4, "Moins urgent (1 ressource)"),
            ("Diallo", None, 0, "Information médicale, toux légère", "infant", 80, 120, 99, 30, 15, 1, 0, 5, "Non urgent")
        ]
        
        for i in range(40):
            # Pour remplir le dashboard aléatoirement
            template = random.choice(base_cases)
            c = models.TriageCase(
                operator_id=op.id,
                patient_identifier=f"Patient {random.randint(100, 999)} - {template[0]}",
                smur_number=template[1],
                patient_age=template[2],
                symptoms_description=template[3],
                age_category=template[4],
                pas=template[5],
                fc=template[6],
                spo2=template[7],
                fr=template[8],
                gcs=template[9],
                pain_scale=template[10],
                estimated_resources=template[11],
                esi_level=template[12],
                esi_explanation=template[13],
                duration_seconds=random.randint(30, 240) # ⏱️ Phase 8
            )
            db.add(c)
            
            # Quelques logs d'audit
            if i % 10 == 0:
                log = models.AuditLog(
                    operator_id=sup.id,
                    action="EXPORT_PDF",
                    details=f"Export de la fiche Patient #{i*10}",
                    created_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(log)
        
        # Log de connexion pour le superviseur
        db.add(models.AuditLog(operator_id=sup.id, action="LOGIN", details="Connexion Supervisor (Demo Seed)"))
        
        db.commit()
        print("Operations terminees. La base PostgreSQL est prete avec Audit Logs et Profils !")

    db.close()

if __name__ == "__main__":
    main()
