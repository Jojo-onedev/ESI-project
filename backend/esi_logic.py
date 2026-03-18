from schemas import TriageForm, TriageResult

def calculate_esi(form: TriageForm) -> TriageResult:
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
