from schemas import TriageForm, TriageResult
import os
import numpy as np

# ══════════════════════════════════════════════════════════════════════
# CHARGEMENT DU MODÈLE D'INTELLIGENCE ARTIFICIELLE (Random Forest)
# ══════════════════════════════════════════════════════════════════════
ML_MODEL = None
ML_ENCODERS = None

try:
    import joblib
    ML_DIR = os.path.join(os.path.dirname(__file__), "ml")
    model_path = os.path.join(ML_DIR, "esi_model.joblib")
    encoders_path = os.path.join(ML_DIR, "esi_encoders.joblib")
    if os.path.exists(model_path) and os.path.exists(encoders_path):
        ML_MODEL = joblib.load(model_path)
        ML_ENCODERS = joblib.load(encoders_path)
        print("[ML] Modele Random Forest charge avec succes.")
    else:
        print("[ML] Fichiers modele non trouves. Mode regles uniquement.")
except Exception as e:
    print(f"[ML] Erreur chargement modele : {e}. Mode regles uniquement.")

# Mapping des symptômes spécifiques vers leur niveau ESI respectif
SPECIFIC_SYMPTOMS_MAP = {
    # MÉDECINE GÉNÉRALE
    "Arrêt cardiorespiratoire": 1,
    "Détresse respiratoire extrême avec épuisement": 1,
    "Coma profond (GCS <= 8) d'origine médicale": 1,
    "Hypotension sévère ou choc": 2,
    "Douleur thoracique avec ECG anormal (SCA)": 2,
    "Dyspnée modérée à sévère": 2,
    "Fièvre grave (T>=40°C, hypothermie, purpura, confusion)": 2,
    "Exposition à maladie contagieuse grave": 2,
    "Hémorragies digestives abondantes": 2,
    "Intoxications graves": 2,
    "Douleur thoracique ECG normal mais à risque": 3,
    "Malaise sans instabilité": 3,
    "Dyspnée modérée bien tolérée": 3,
    "Douleur abdominale modérée": 3,
    "Ictère": 3,
    "Intoxication sans gravité immédiate": 3,
    "Hypertension sans signe de gravité": 4,
    "Palpitations simples": 4,
    "AES >= 48 h": 4,
    "Vomissements simples chez adulte stable": 4,
    "Fièvre simple bien tolérée": 5,
    "Toux / bronchite simple": 5,
    "Constipation simple": 5,
    "Douleur de membre ou sciatique simple": 5,

    # CHIRURGIE
    "Traumatisme avec amputation": 1,
    "Traumatisme crânien avec coma (GCS <= 8)": 1,
    "Hémorragie abondante": 1,
    "Traumatisme thoraco-abdominal pénétrant ou haute vélocité": 2,
    "Brûlures étendues / visage / main": 2,
    "Torsion testiculaire suspectée": 2,
    "Rétention aiguë d'urine douloureuse": 2,
    "Hématurie abondante": 2,
    "Corps étranger voies aériennes avec détresse": 2,
    "Occlusion intestinale, hernie étranglée": 2,
    "Plaie complexe ou main": 3,
    "Traumatisme stable nécessitant imagerie": 3,
    "Brûlure peu étendue avec avis spécialisé": 3,
    "Douleur lombaire ou colique néphrétique stable": 3,
    "Corps étranger digestif tranchant sans détresse": 3,
    "Plaie simple hors main": 4,
    "Hernie simple non douloureuse": 4,
    "Traumatisme distal modéré": 4,
    "Excoriations": 5,
    "Soins locaux simples": 5,

    # GYNÉCOLOGIE - OBSTÉTRIQUE
    "Accouchement imminent ou réalisé": 1,
    "Eclampsie": 1,
    "Rupture utérine": 1,
    "Grossesse Extra utérine rompue": 1,
    "Hémorragie du post-partum abondante": 1,
    "Grossesse 3e trimestre avec haut risque (métrorragies, douleur, HTA...)": 2,
    "Grossesse 1er-2e trimestre avec douleur/métrorragie": 3,
    "Méno-métrorragies avec grossesse suspectée": 3,
    "Problèmes de post-partum simples": 4,
    "Allaitement + fièvre modérée": 4,
    "Anomalies vulvo-vaginales simples": 5,
    "Mastite simple": 5,

    # PÉDIATRIE
    "Arrêt cardio-respiratoire pédiatrique": 1,
    "Convulsions répétées": 1,
    "Anémie décompensée": 1,
    "Détresse respiratoire (SpO2<90%, cyanose)": 1,
    "Fièvre (T>38,5°)": 2,
    "Dyspnée avec sifflement": 2,
    "Déshydratation sévère nourrisson": 2,
    "Hypotension pédiatrique": 2,
    "Paludisme grave": 2,
    "Convulsions hyperthermiques intermittentes": 3,
    "Diarrhée / vomissements modérés": 3,
    "Pleurs incoercibles nécessitant bilan": 3,
    "Troubles alimentaires nourrisson": 4,
    "Ictère néonatal simple": 4,
    "Bradycardie ou tachycardie bien tolérée": 4,
    "Consultation bénigne (Très rare)": 5
}

def check_vitals_override(form: TriageForm):
    """ Returns 1, 2, or None based on the highest triggered alert from vitals. """
    level = None
    age = form.age_category

    # GCS & SpO2 (Universels)
    if form.gcs is not None:
        if form.gcs <= 8: return 1
        if form.gcs <= 13: level = 2 if level is None else min(level, 2)

    if form.spo2 is not None:
        if form.spo2 < 86: return 1
        if form.spo2 <= 90: level = 2 if level is None else min(level, 2)

    # Modulation par catégorie d'âge
    if age == "adult":
        if form.fc is not None:
            if form.fc > 180 or form.fc < 40: return 1
            if 130 <= form.fc <= 180: level = 2 if level is None else min(level, 2)
        if form.fr is not None:
            if form.fr > 40: return 1
            if 30 <= form.fr <= 40: level = 2 if level is None else min(level, 2)
        if form.pas is not None:
            if form.pas < 70: return 1
            if 70 <= form.pas <= 90: level = 2 if level is None else min(level, 2)
            if 90 <= form.pas <= 100 and form.fc is not None and form.fc > 100: 
                level = 2 if level is None else min(level, 2)
                
    elif age == "child":
        if form.fc is not None:
            if form.fc > 160 or form.fc < 50: return 1
            if 130 <= form.fc <= 160: level = 2 if level is None else min(level, 2)
        if form.fr is not None:
            if form.fr > 50: return 1
            if 40 <= form.fr <= 50: level = 2 if level is None else min(level, 2)
        if form.pas is not None:
            if form.pas < 70: return 1
            if 70 <= form.pas <= 80: level = 2 if level is None else min(level, 2)
            
    elif age == "infant":
        if form.fc is not None:
            if form.fc > 200 or form.fc < 60: return 1
            if 160 <= form.fc <= 200: level = 2 if level is None else min(level, 2)
        if form.fr is not None:
            if form.fr > 60: return 1
            if 50 <= form.fr <= 60: level = 2 if level is None else min(level, 2)
        if form.pas is not None:
            if form.pas < 60: return 1
            if 60 <= form.pas <= 70: level = 2 if level is None else min(level, 2)
            
    elif age == "newborn":
        if form.fc is not None:
            if form.fc > 220 or form.fc < 80: return 1
            if 180 <= form.fc <= 220: level = 2 if level is None else min(level, 2)
        if form.fr is not None:
            if form.fr > 60: return 1
            if 50 <= form.fr <= 60: level = 2 if level is None else min(level, 2)
        if form.pas is not None:
            if form.pas < 50: return 1
            if 50 <= form.pas <= 60: level = 2 if level is None else min(level, 2)

    # Douleur extrême
    if form.pain_scale is not None and form.pain_scale >= 8:
        level = 2 if level is None else min(level, 2)

    return level

def predict_ml(form: TriageForm):
    """Utilise le modèle Random Forest pour prédire le niveau ESI."""
    if ML_MODEL is None or ML_ENCODERS is None:
        return None

    try:
        # Encoder les variables catégorielles
        age_enc = ML_ENCODERS["age_category"].transform([form.age_category])[0]
        
        # Gérer la catégorie médicale
        cat = form.medical_category or "Médecine Générale"
        try:
            cat_enc = ML_ENCODERS["medical_category"].transform([cat])[0]
        except ValueError:
            cat_enc = 0

        # Déterminer le symptom_base_level
        symptom_level = 5  # Par défaut
        if form.specific_symptom and form.specific_symptom != "Aucun":
            symptom_level = SPECIFIC_SYMPTOMS_MAP.get(form.specific_symptom, 5)

        # Construire le vecteur de features (même ordre que l'entraînement)
        features = np.array([[
            form.patient_age if hasattr(form, 'patient_age') and form.patient_age is not None else 30,
            age_enc,
            cat_enc,
            symptom_level,
            form.fc if form.fc is not None else 80,
            form.fr if form.fr is not None else 16,
            form.pas if form.pas is not None else 120,
            form.spo2 if form.spo2 is not None else 98,
            form.gcs if form.gcs is not None else 15,
            form.pain_scale if form.pain_scale is not None else 0,
            form.estimated_resources,
        ]])

        prediction = ML_MODEL.predict(features)[0]
        return int(prediction)
    except Exception as e:
        print(f"[ML] Erreur prediction : {e}")
        return None


def calculate_esi(form: TriageForm) -> TriageResult:
    base_level = 5
    explanation = "Non urgent. Aucune ressource estimee, simple consultation."
    
    # 1. Analyse des symptômes spécifiques
    if form.specific_symptom and form.specific_symptom != "Aucun":
        level = SPECIFIC_SYMPTOMS_MAP.get(form.specific_symptom)
        if level:
            base_level = level
            explanations = {
                1: f"Danger vital immédiat. Critère majeur : {form.specific_symptom}.",
                2: f"Haut risque. Critère : {form.specific_symptom}.",
                3: f"Urgent - Stable. Critère : {form.specific_symptom}.",
                4: f"Moins urgent. Critère : {form.specific_symptom}.",
                5: f"Non urgent. Critère : {form.specific_symptom}."
            }
            explanation = explanations[level]
            
    # 2. Analyse des Ressources ESI (Règle standard)
    if base_level > 2:
        resources = form.estimated_resources
        if resources >= 2 and base_level > 3:
            base_level = 3
            explanation = "Urgent. Le patient nécessite 2 ressources ou plus."
        elif resources == 1 and base_level > 4:
            base_level = 4
            explanation = "Moins urgent. Le patient nécessite une seule ressource."

    # 3. Modulation par les Constantes (Le tableau du jury)
    override = check_vitals_override(form)
    if override and override < base_level:
        base_level = override
        # Remplacer l'explication car le surclassement change tout le diagnostic
        severity_labels = {1: "Danger vital immediat", 2: "Haut risque"}
        explanation = f"{severity_labels.get(override, 'Urgence')} - Constantes vitales hors limites pour l'age '{form.age_category}' (Tri {override})."

    # 4. Prédiction du Modèle d'Intelligence Artificielle (Random Forest)
    ml_prediction = predict_ml(form)
    if ml_prediction is not None:
        if ml_prediction == base_level:
            explanation += f" | [IA] Le modele d'apprentissage automatique confirme : ESI {ml_prediction}."
        elif ml_prediction < base_level:
            explanation += f" | [IA] Alerte IA : le modele predit un niveau plus critique (ESI {ml_prediction}). Verification recommandee."
            # On prend le plus critique entre les deux
            base_level = ml_prediction
        else:
            explanation += f" | [IA] Le modele predit ESI {ml_prediction}, mais les regles cliniques maintiennent ESI {base_level} (priorite aux regles)."

    colors = {1: "Rouge", 2: "Orange", 3: "Jaune", 4: "Vert", 5: "Bleu"}
    return TriageResult(
        esi_level=base_level,
        esi_explanation=explanation,
        color_code=colors[base_level]
    )

