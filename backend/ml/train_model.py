"""
Entraînement du Modèle Random Forest pour la prédiction ESI.
Utilise le dataset synthétique généré par generate_dataset.py.
Produit un fichier modèle .joblib prêt pour la production.
"""
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib

# Chemins
ML_DIR = os.path.dirname(__file__)
DATASET_PATH = os.path.join(ML_DIR, "esi_dataset.csv")
MODEL_PATH = os.path.join(ML_DIR, "esi_model.joblib")
ENCODERS_PATH = os.path.join(ML_DIR, "esi_encoders.joblib")

def train_model():
    print("=" * 60)
    print("  ENTRAÎNEMENT DU MODÈLE ESI - Random Forest Classifier")
    print("=" * 60)

    # 1. Chargement du dataset
    df = pd.read_csv(DATASET_PATH)
    print(f"\n[DATA] Dataset charge : {len(df)} echantillons")
    print(f"   Colonnes : {list(df.columns)}")
    print(f"\n   Distribution des classes ESI :")
    print(df["esi_level"].value_counts().sort_index().to_string())

    # 2. Préparation des features
    # Encodage des variables catégorielles
    encoders = {}

    le_age = LabelEncoder()
    df["age_category_enc"] = le_age.fit_transform(df["age_category"])
    encoders["age_category"] = le_age

    le_cat = LabelEncoder()
    df["medical_category_enc"] = le_cat.fit_transform(df["medical_category"])
    encoders["medical_category"] = le_cat

    # Features numériques pour le modèle
    feature_columns = [
        "patient_age",
        "age_category_enc",
        "medical_category_enc",
        "symptom_base_level",
        "fc",
        "fr",
        "pas",
        "spo2",
        "gcs",
        "pain_scale",
        "estimated_resources",
    ]

    X = df[feature_columns]
    y = df["esi_level"]

    # 3. Division Train/Test (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[SPLIT] {len(X_train)} train / {len(X_test)} test")

    # 4. Entraînement du Random Forest
    print("\n[TRAIN] Entrainement du Random Forest (n_estimators=200)...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # 5. Évaluation
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n[OK] ACCURACY GLOBALE : {accuracy * 100:.2f}%")
    print(f"\n[REPORT] Rapport de Classification :")
    print(classification_report(y_test, y_pred, target_names=[
        "ESI 1 (Rouge)", "ESI 2 (Orange)", "ESI 3 (Jaune)",
        "ESI 4 (Vert)", "ESI 5 (Bleu)"
    ]))

    print("[MATRIX] Matrice de Confusion :")
    print(confusion_matrix(y_test, y_pred))

    # 6. Importance des features
    importances = model.feature_importances_
    feature_importance = sorted(zip(feature_columns, importances), key=lambda x: x[1], reverse=True)
    print("\n[FEATURES] Importance des Variables :")
    for feat, imp in feature_importance:
        bar = "#" * int(imp * 50)
        print(f"   {feat:25s} : {imp:.4f} {bar}")

    # 7. Sauvegarde
    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoders, ENCODERS_PATH)
    print(f"\n[SAVE] Modele sauvegarde : {MODEL_PATH}")
    print(f"[SAVE] Encodeurs sauvegardes : {ENCODERS_PATH}")
    print(f"\n{'=' * 60}")
    print(f"  MODELE PRET POUR LA PRODUCTION !")
    print(f"{'=' * 60}")

    return model, encoders


if __name__ == "__main__":
    train_model()
