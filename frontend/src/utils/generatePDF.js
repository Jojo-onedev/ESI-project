import jsPDF from 'jspdf';

/**
 * Génère un PDF professionnel de la fiche de triage ESI.
 * @param {Object} result - Le résultat ESI du backend
 * @param {Object} form - Les données du formulaire soumis
 */
export function generateTiragePDF(result, form) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const colorMap = {
    'Rouge':   [220, 38, 38],
    'Orange':  [249, 115, 22],
    'Jaune':   [234, 179, 8],
    'Vert':    [16, 185, 129],
    'Bleu':    [14, 165, 233],
  };
  const [r, g, b] = colorMap[result.color_code] || [100, 116, 139];

  // ── Bandeau de couleur ESI ──────────────────────────────────────────
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`FICHE DE TRIAGE ESI - NIVEAU ${result.esi_level}`, 10, 14);
  doc.setFontSize(12);
  doc.text(`Code : ${result.color_code.toUpperCase()} | ${dateStr} à ${timeStr}`, 10, 24);

  // ── Corps ───────────────────────────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  let y = 44;

  const section = (title, yPos) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(10, yPos - 6, 190, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(r, g, b);
    doc.text(title.toUpperCase(), 13, yPos);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    return yPos + 8;
  };

  const field = (label, value, yPos) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${label} :`, 14, yPos);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || '-', 150);
    doc.text(lines, 60, yPos);
    return yPos + 7 * lines.length;
  };

  // Identification
  y = section('Identification du Patient', y);
  y = field('Identifiant', form.patient_identifier, y) + 2;
  y = field('Symptômes', form.symptoms_description, y) + 6;

  // Signes vitaux
  y = section('Signes Vitaux Évalués', y);
  y = field('Conscience', form.consciousness, y);
  y = field('Respiration', form.breathing, y);
  y = field('Saignement', form.bleeding, y);
  y = field('Ressources estimées', `${form.estimated_resources} ressource(s)`, y) + 6;

  // Décision
  y = section('Décision ESI (Algorithme Automatique)', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const split = doc.splitTextToSize(result.esi_explanation, 175);
  doc.text(split, 13, y);
  y += 7 * split.length + 10;

  // ── Pied de page ───────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.line(10, 280, 200, 280);
  doc.text('SAMU Triage ESI - Système d\'Aide à la Décision Préhospitalière | Burkina Faso', 10, 286);
  doc.text(`Document généré le ${dateStr} à ${timeStr}`, 10, 291);

  // ── Sauvegarde ─────────────────────────────────────────────────────
  const filename = `ESI${result.esi_level}_${form.patient_identifier.replace(/\s+/g, '_').slice(0,20)}_${dateStr}.pdf`;
  doc.save(filename);
}
