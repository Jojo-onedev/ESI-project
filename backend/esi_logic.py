from schemas import TriageForm, TriageResult

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

def calculate_esi(form: TriageForm) -> TriageResult:
    # 1. Vérification du symptôme spécifique en priorité
    if form.specific_symptom and form.specific_symptom != "Aucun":
        level = SPECIFIC_SYMPTOMS_MAP.get(form.specific_symptom)
        if level:
            colors = {1: "Rouge", 2: "Orange", 3: "Jaune", 4: "Vert", 5: "Bleu"}
            explanations = {
                1: f"Danger vital immédiat (Catégorie : {form.medical_category}). Critère majeur détecté : {form.specific_symptom}.",
                2: f"Haut risque (Catégorie : {form.medical_category}). Critère spécifique : {form.specific_symptom}. Évaluation médicale rapide exigée.",
                3: f"Urgent - Stable (Catégorie : {form.medical_category}). Critère spécifique : {form.specific_symptom}. Nécessite des explorations.",
                4: f"Moins urgent (Catégorie : {form.medical_category}). Pathologie simple : {form.specific_symptom}.",
                5: f"Non urgent (Catégorie : {form.medical_category}). Pathologie bénigne : {form.specific_symptom}."
            }
            return TriageResult(
                esi_level=level,
                esi_explanation=explanations[level],
                color_code=colors[level]
            )

    # 2. Algorithme de secours (Générique)
    # Danger vital immédiat
    if form.consciousness.lower() == "inconscient" or form.breathing.lower() == "absente":
        return TriageResult(
            esi_level=1,
            esi_explanation="Danger vital immédiat détecté (Patient inconscient ou ne respirant pas). Action de réanimation immédiate requise.",
            color_code="Rouge"
        )
    
    # Haut risque
    if form.breathing.lower() == "difficile" or form.bleeding.lower() == "abondant":
        return TriageResult(
            esi_level=2,
            esi_explanation="Situation à haut risque (Détresse respiratoire ou hémorragie sévère). Évaluation médicale dans les 10 minutes.",
            color_code="Orange"
        )
    
    # Besoin en ressources
    resources = form.estimated_resources
    if resources >= 2:
        return TriageResult(
            esi_level=3,
            esi_explanation="Urgent - Le patient est stable mais nécessite 2 ressources ou plus (ex: radiographie et perfusion).",
            color_code="Jaune"
        )
    elif resources == 1:
        return TriageResult(
            esi_level=4,
            esi_explanation="Moins urgent - Le patient nécessite une seule ressource (ex: simple suture ou imagerie simple).",
            color_code="Vert"
        )
    else: # resources == 0
        return TriageResult(
            esi_level=5,
            esi_explanation="Non urgent - Aucune ressource nécessaire, simple consultation.",
            color_code="Bleu"
        )
