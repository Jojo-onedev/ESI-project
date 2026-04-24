import jsPDF from 'jspdf';

/**
 * Génère un PDF professionnel de la fiche de triage ESI (Charte SAMU).
 * @param {Object} result - Le résultat ESI du backend
 * @param {Object} form - Les données du formulaire soumis
 * @param {String} operatorName - Nom de l'agent SAMU
 */
export async function generateTiragePDF(result, form, operatorName = "Agent SAMU") {
  const doc = new jsPDF();

  // Charger le logo SAMU
  let logoBase64 = null;
  try {
    const response = await fetch('/samu-logo.png');
    const blob = await response.blob();
    logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Logo SAMU non trouvé, PDF généré sans logo.');
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Génération d'un identifiant unique de triage
  const triageId = `TRI-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

  const esiColorMap = {
    'Rouge':   [220, 38, 38],
    'Orange':  [249, 115, 22],
    'Jaune':   [234, 179, 8],
    'Vert':    [16, 185, 129],
    'Bleu':    [14, 165, 233],
  };
  const [esiR, esiG, esiB] = esiColorMap[result.color_code] || [100, 116, 139];

  // Couleurs Charte SAMU
  const samuBlue = [0, 39, 255];    // Bleu marine foncé
  const samuRed = [185, 28, 28];    // Rouge SAMU
  const samuGray = [241, 245, 249]; // Gris clair fond

  // ══════════════════════════════════════════════════════════════════════
  // EN-TÊTE SAMU (Bleu Marine)
  // ══════════════════════════════════════════════════════════════════════
  doc.setFillColor(...samuBlue);
  doc.rect(0, 0, 210, 38, 'F');

  // Barre rouge fine (identité SAMU)
  doc.setFillColor(...samuRed);
  doc.rect(0, 38, 210, 3, 'F');

  // Titre
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SAMU Burkina Faso', 42, 8);
  doc.setFontSize(12);
  doc.text('FICHE DE TRIAGE', 42, 14);
  doc.text('PRÉHOSPITALIER', 42, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Service d'Aide Médicale Urgente - SAMU Burkina Faso`, 42, 29);

  // Logo SAMU (en haut à gauche dans le bandeau)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 8, 4, 28, 28);
    } catch (e) {
      console.warn('Impossible d\'intégrer le logo dans le PDF.');
    }
  }

  // ID + Date en haut à droite
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${triageId}`, 200, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr} à ${timeStr}`, 200, 16, { align: 'right' });
  if (form.smur_number) {
    doc.setFont('helvetica', 'bold');
    doc.text(`SMUR : ${form.smur_number}`, 200, 22, { align: 'right' });
  }

  // Bandeau ESI coloré
  doc.setFillColor(esiR, esiG, esiB);
  doc.rect(0, 41, 210, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const esiText = `NIVEAU ESI ${result.esi_level}  -  ${result.color_code.toUpperCase()}`;
  doc.text(esiText, 105, 50, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════
  // CORPS DU DOCUMENT
  // ══════════════════════════════════════════════════════════════════════
  doc.setTextColor(30, 41, 59);
  let y = 66;

  const section = (title, yPos) => {
    doc.setFillColor(...samuGray);
    doc.rect(10, yPos - 5, 190, 8, 'F');
    // Petit accent rouge à gauche
    doc.setFillColor(...samuRed);
    doc.rect(10, yPos - 5, 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...samuBlue);
    doc.text(title.toUpperCase(), 15, yPos);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    return yPos + 8;
  };

  const field = (label, value, yPos) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${label} :`, 14, yPos);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(value || '—'), 130);
    doc.text(lines, 65, yPos);
    return yPos + 6 * lines.length;
  };

  // — Section 1 : Identification
  y = section('Identification du Triage', y);
  y = field('N° Triage', triageId, y);
  y = field('SMUR / Ambulance', form.smur_number || 'Non renseigné', y);
  y = field('Opérateur', operatorName, y);
  y = field('Date / Heure', `${dateStr} à ${timeStr}`, y) + 3;

  // — Section 2 : Appelant
  y = section('Informations Appelant', y);
  let callerInfo = [];
  if (form.caller_name || form.caller_surname) callerInfo.push(`${form.caller_name || ''} ${form.caller_surname || ''}`.trim());
  if (form.caller_age) callerInfo.push(`${form.caller_age} ans`);
  if (form.caller_sex) callerInfo.push(`Sexe: ${form.caller_sex}`);
  y = field('Appelant', callerInfo.length > 0 ? callerInfo.join(' | ') : 'Non précisé', y) + 3;

  // — Section 3 : Patient
  y = section('Informations Patient', y);
  y = field('Identifiant', form.patient_identifier, y);

  const ageCategoryLabels = { 'newborn': 'Nouveau-né', 'infant': 'Nourrisson', 'child': 'Enfant', 'adult': 'Adulte' };
  const ageDisplay = form.patient_age !== null && form.patient_age !== '' ? `${form.patient_age} ans` : '—';
  y = field('Âge / Catégorie', `${ageDisplay} (${ageCategoryLabels[form.age_category] || form.age_category})`, y);
  y = field('Motif de l\'appel', form.symptoms_description, y) + 3;

  // — Section 4 : Classification
  y = section('Classification Clinique', y);
  y = field('Domaine Médical', form.medical_category, y);
  y = field('Critère Majeur', form.specific_symptom || 'Aucun', y) + 3;

  // — Section 5 : Constantes vitales
  y = section('Constantes Vitales', y);
  const vitalsLine1 = `FC: ${form.fc || '-'} bpm  |  FR: ${form.fr || '—'} mvt/min  |  PAS: ${form.pas || '—'} mmHg`;
  const vitalsLine2 = `SpO2: ${form.spo2 || '-'}%  |  Glasgow: ${form.gcs || '—'}/15  |  Douleur: ${form.pain_scale ?? '—'}/10`;
  doc.setFontSize(9);
  doc.text(vitalsLine1, 14, y);
  y += 6;
  doc.text(vitalsLine2, 14, y);
  y += 4;
  y = field('Ressources estimées', `${form.estimated_resources} ressource(s)`, y) + 3;

  // — Section 6 : Décision
  y = section('Décision ESI - Résultat', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const split = doc.splitTextToSize(result.esi_explanation, 180);
  doc.text(split, 14, y);
  y += 6 * split.length;

  // ══════════════════════════════════════════════════════════════════════
  // PIED DE PAGE (Bleu Marine)
  // ══════════════════════════════════════════════════════════════════════
  doc.setFillColor(...samuBlue);
  doc.rect(0, 278, 210, 19, 'F');
  doc.setFillColor(...samuRed);
  doc.rect(0, 276, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`Opérateur : ${operatorName}  |  N° ${triageId}  |  ${dateStr} ${timeStr}`, 105, 284, { align: 'center' });
  doc.text('SAMU - Système d\'Aide à la Décision Préhospitalière  |  Burkina Faso  |  Document confidentiel', 105, 290, { align: 'center' });

  // ── Sauvegarde ─────────────────────────────────────────────────────
  const filename = `SAMU_${triageId}_ESI${result.esi_level}.pdf`;
  doc.save(filename);
}

