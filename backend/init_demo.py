from database import engine, Base, SessionLocal
import models
import auth
import datetime

# Créer les tables sur la base de données distante
Base.metadata.create_all(bind=engine)

def main():
    db = SessionLocal()
    
    # 1. Création de l'opérateur simple de démo
    op = db.query(models.Operator).filter(models.Operator.username == "demo_op").first()
    if not op:
        print("Création de l'opérateur (demo_op / samu123)...")
        new_op = models.Operator(username="demo_op", hashed_password=auth.get_password_hash("samu123"), role="operator")
        db.add(new_op)
        db.commit()
        db.refresh(new_op)
        op = new_op

    # 2. Création du superviseur
    sup = db.query(models.Operator).filter(models.Operator.username == "admin_samu").first()
    if not sup:
        print("Création du médecin superviseur (admin_samu / admin123)...")
        new_sup = models.Operator(username="admin_samu", hashed_password=auth.get_password_hash("admin123"), role="supervisor")
        db.add(new_sup)
        db.commit()
        db.refresh(new_sup)
        sup = new_sup

    # Génération d'un gros jeu de données aléatoire pour bien voir les graphes
    if db.query(models.TriageCase).count() == 0:
        print("Génération de l'historique ESI...")
        import random
        # Quelques cas prédéfinis
        base_cases = [
            ("Traoré", "Choc, totalement inconscient", "Inconscient", "Difficile", "Abondant", 2, 1, "Danger vital immédiat"),
            ("Mamadou", "Coupure profonde au bras avec une machette", "Conscient", "Normale", "Abondant", 1, 2, "Hémorragie sévère"),
            ("Fatou", "Douleur au ventre depuis 3h, nausées", "Conscient", "Normale", "Aucun", 2, 3, "Urgent (2 ressources)"),
            ("Saliou", "Entorse cheville", "Conscient", "Normale", "Aucun", 1, 4, "Moins urgent (1 ressource)"),
            ("Diallo", "Information médicale, toux légère", "Conscient", "Normale", "Aucun", 0, 5, "Non urgent")
        ]
        
        for _ in range(40):
            # Pour remplir le dashboard aléatoirement
            template = random.choice(base_cases)
            c = models.TriageCase(
                operator_id=op.id,
                patient_identifier=f"Patient {random.randint(100, 999)} - {template[0]}",
                symptoms_description=template[1],
                consciousness=template[2],
                breathing=template[3],
                bleeding=template[4],
                estimated_resources=template[5],
                esi_level=template[6],
                esi_explanation=template[7]
            )
            db.add(c)
        db.commit()
        print("Opérations terminées. La base PostgreSQL est provisionnée avec succès !")

    db.close()

if __name__ == "__main__":
    main()
