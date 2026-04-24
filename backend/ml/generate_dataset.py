"""
Générateur de Dataset Synthétique ESI pour le SAMU Burkina Faso.
Génère des milliers de patients virtuels avec leurs constantes vitales,
symptômes et le niveau ESI correct basé sur les règles cliniques officielles.
"""
import csv
import random
import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "esi_dataset.csv")
NUM_SAMPLES = 10000

# Normes vitales par catégorie d'âge : (FC_min, FC_max, FR_min, FR_max, PAS_min, PAS_max)
VITALS_NORMS = {
    "adult":   {"fc": (60, 100),  "fr": (12, 20), "pas": (100, 140)},
    "child":   {"fc": (70, 140),  "fr": (20, 30), "pas": (85, 110)},
    "infant":  {"fc": (100, 160), "fr": (30, 50), "pas": (75, 85)},
    "newborn": {"fc": (120, 160), "fr": (40, 60), "pas": (60, 80)},
}

# Seuils de danger (Tri 1 et Tri 2) par catégorie d'âge
DANGER_THRESHOLDS = {
    "adult":   {"fc_tri1": (180, 40), "fc_tri2": (130, 180), "fr_tri1": 40, "fr_tri2": (30, 40), "pas_tri1": 70, "pas_tri2": (70, 90)},
    "child":   {"fc_tri1": (160, 50), "fc_tri2": (130, 160), "fr_tri1": 50, "fr_tri2": (40, 50), "pas_tri1": 70, "pas_tri2": (70, 80)},
    "infant":  {"fc_tri1": (200, 60), "fc_tri2": (160, 200), "fr_tri1": 60, "fr_tri2": (50, 60), "pas_tri1": 60, "pas_tri2": (60, 70)},
    "newborn": {"fc_tri1": (220, 80), "fc_tri2": (180, 220), "fr_tri1": 60, "fr_tri2": (50, 60), "pas_tri1": 50, "pas_tri2": (50, 60)},
}

# Symptômes avec leur niveau ESI de base
SYMPTOMS = {
    1: ["Arrêt cardiorespiratoire", "Coma profond", "Traumatisme avec amputation", "Eclampsie", "Arrêt cardio-respiratoire pédiatrique"],
    2: ["Hypotension sévère", "Douleur thoracique SCA", "Dyspnée sévère", "Hémorragie abondante", "Brûlures étendues", "Paludisme grave", "Fièvre pédiatrique grave"],
    3: ["Douleur thoracique stable", "Malaise", "Dyspnée modérée", "Douleur abdominale", "Plaie complexe", "Colique néphrétique", "Convulsions intermittentes"],
    4: ["Hypertension simple", "Palpitations", "Plaie simple", "Traumatisme modéré", "Troubles alimentaires nourrisson", "Post-partum simple"],
    5: ["Fièvre simple", "Toux bronchite", "Constipation", "Douleur sciatique", "Excoriations", "Mastite simple", "Consultation bénigne"],
}

CATEGORIES = ["Médecine Générale", "Chirurgie", "Gynécologie - Obstétrique", "Pédiatrie"]
AGE_CATEGORIES = ["adult", "child", "infant", "newborn"]


def generate_vitals(age_cat, target_severity="normal"):
    """Génère des constantes vitales réalistes selon l'âge et la sévérité voulue."""
    norms = VITALS_NORMS[age_cat]
    thresholds = DANGER_THRESHOLDS[age_cat]

    if target_severity == "tri1":
        # Constantes en zone critique (Tri 1)
        fc_high, fc_low = thresholds["fc_tri1"]
        fc = random.choice([random.randint(fc_high, fc_high + 30), random.randint(max(20, fc_low - 20), fc_low)])
        fr = random.randint(thresholds["fr_tri1"], thresholds["fr_tri1"] + 15)
        pas = random.randint(max(30, thresholds["pas_tri1"] - 25), thresholds["pas_tri1"])
        spo2 = random.randint(70, 85)
        gcs = random.randint(3, 8)
    elif target_severity == "tri2":
        # Constantes en zone d'alerte (Tri 2)
        fc_lo, fc_hi = thresholds["fc_tri2"]
        fc = random.randint(fc_lo, fc_hi)
        fr_lo, fr_hi = thresholds["fr_tri2"]
        fr = random.randint(fr_lo, fr_hi)
        pas_lo, pas_hi = thresholds["pas_tri2"]
        pas = random.randint(pas_lo, pas_hi)
        spo2 = random.randint(86, 90)
        gcs = random.randint(9, 13)
    else:
        # Constantes normales
        fc = random.randint(*norms["fc"])
        fr = random.randint(*norms["fr"])
        pas = random.randint(*norms["pas"])
        spo2 = random.randint(91, 100)
        gcs = random.randint(14, 15)

    return fc, fr, pas, spo2, gcs


def determine_esi(symptom_level, fc, fr, pas, spo2, gcs, pain, resources, age_cat):
    """Applique les règles ESI exactes (identiques à esi_logic.py)."""
    base_level = symptom_level

    # Modulation par les ressources (pour les niveaux 3-5)
    if base_level > 2:
        if resources >= 2 and base_level > 3:
            base_level = 3
        elif resources == 1 and base_level > 4:
            base_level = 4

    # Modulation par les constantes vitales
    override = None
    thresholds = DANGER_THRESHOLDS[age_cat]

    # GCS (universel)
    if gcs <= 8:
        override = 1
    elif gcs <= 13:
        override = 2 if override is None else min(override, 2)

    # SpO2 (universel)
    if spo2 < 86:
        override = 1
    elif spo2 <= 90:
        override = 2 if override is None else min(override, 2)

    # FC
    fc_high, fc_low = thresholds["fc_tri1"]
    if fc > fc_high or fc < fc_low:
        override = 1
    else:
        fc_lo2, fc_hi2 = thresholds["fc_tri2"]
        if fc_lo2 <= fc <= fc_hi2:
            override = 2 if override is None else min(override, 2)

    # FR
    if fr > thresholds["fr_tri1"]:
        override = 1
    else:
        fr_lo2, fr_hi2 = thresholds["fr_tri2"]
        if fr_lo2 <= fr <= fr_hi2:
            override = 2 if override is None else min(override, 2)

    # PAS
    if pas < thresholds["pas_tri1"]:
        override = 1
    else:
        pas_lo2, pas_hi2 = thresholds["pas_tri2"]
        if pas_lo2 <= pas <= pas_hi2:
            override = 2 if override is None else min(override, 2)

    # Douleur extrême
    if pain >= 8:
        override = 2 if override is None else min(override, 2)

    if override and override < base_level:
        base_level = override

    return base_level


def generate_dataset():
    """Génère le dataset complet et le sauvegarde en CSV."""
    rows = []

    for _ in range(NUM_SAMPLES):
        age_cat = random.choice(AGE_CATEGORIES)

        # Choisir un niveau de symptôme
        symptom_level = random.choices([1, 2, 3, 4, 5], weights=[5, 15, 30, 25, 25])[0]
        symptom = random.choice(SYMPTOMS[symptom_level])
        category = random.choice(CATEGORIES)

        # Générer des constantes selon la gravité
        if symptom_level == 1:
            vitals_severity = random.choices(["tri1", "tri2", "normal"], weights=[60, 30, 10])[0]
        elif symptom_level == 2:
            vitals_severity = random.choices(["tri1", "tri2", "normal"], weights=[20, 50, 30])[0]
        elif symptom_level == 3:
            vitals_severity = random.choices(["tri1", "tri2", "normal"], weights=[5, 20, 75])[0]
        else:
            vitals_severity = random.choices(["tri1", "tri2", "normal"], weights=[2, 8, 90])[0]

        fc, fr, pas, spo2, gcs = generate_vitals(age_cat, vitals_severity)
        pain = random.choices(range(11), weights=[15, 10, 10, 10, 10, 10, 8, 7, 8, 7, 5])[0]
        resources = random.choices([0, 1, 2], weights=[20, 30, 50])[0]

        # Âge réel du patient (cohérent avec la catégorie)
        if age_cat == "newborn":
            patient_age = 0
        elif age_cat == "infant":
            patient_age = 0
        elif age_cat == "child":
            patient_age = random.randint(1, 12)
        else:
            patient_age = random.randint(13, 90)

        # Calculer le vrai ESI
        esi = determine_esi(symptom_level, fc, fr, pas, spo2, gcs, pain, resources, age_cat)

        rows.append({
            "patient_age": patient_age,
            "age_category": age_cat,
            "medical_category": category,
            "specific_symptom": symptom,
            "symptom_base_level": symptom_level,
            "fc": fc,
            "fr": fr,
            "pas": pas,
            "spo2": spo2,
            "gcs": gcs,
            "pain_scale": pain,
            "estimated_resources": resources,
            "esi_level": esi,
        })

    # Écrire le CSV
    fieldnames = list(rows[0].keys())
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # Statistiques
    from collections import Counter
    dist = Counter(r["esi_level"] for r in rows)
    print(f"[OK] Dataset genere avec succes : {len(rows)} patients -> {OUTPUT_FILE}")
    print(f"   Distribution ESI : {dict(sorted(dist.items()))}")


if __name__ == "__main__":
    generate_dataset()
