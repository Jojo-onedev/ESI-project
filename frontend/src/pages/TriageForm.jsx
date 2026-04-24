import { useState, useEffect } from 'react';
import api from '../api';
import { generateTiragePDF } from '../utils/generatePDF';
import { FileDown, UserPlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

export default function TriageForm() {
  const [form, setForm] = useState({
    patient_identifier: '',
    smur_number: '',
    patient_age: '',
    symptoms_description: '',
    caller_name: '',
    caller_surname: '',
    caller_age: '',
    caller_sex: '',
    medical_category: 'Médecine Générale',
    specific_symptom: 'Aucun',
    age_category: 'adult',
    pas: '',
    fc: '',
    spo2: '',
    fr: '',
    gcs: 15,
    pain_scale: 0,
    estimated_resources: 0
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState(null); 
  const [operatorFullName, setOperatorFullName] = useState('Agent SAMU');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = {
    "Médecine Générale": [
      "Arrêt cardiorespiratoire", "Détresse respiratoire extrême avec épuisement", "Coma profond (GCS <= 8) d'origine médicale",
      "Hypotension sévère ou choc", "Douleur thoracique avec ECG anormal (SCA)", "Dyspnée modérée à sévère",
      "Fièvre grave (T>=40°C, hypothermie, purpura, confusion)", "Exposition à maladie contagieuse grave", "Hémorragies digestives abondantes",
      "Intoxications graves", "Douleur thoracique ECG normal mais à risque", "Malaise sans instabilité",
      "Dyspnée modérée bien tolérée", "Douleur abdominale modérée", "Ictère", "Intoxication sans gravité immédiate",
      "Hypertension sans signe de gravité", "Palpitations simples", "AES >= 48 h", "Vomissements simples chez adulte stable",
      "Fièvre simple bien tolérée", "Toux / bronchite simple", "Constipation simple", "Douleur de membre ou sciatique simple"
    ],
    "Chirurgie": [
      "Traumatisme avec amputation", "Traumatisme crânien avec coma (GCS <= 8)", "Hémorragie abondante",
      "Traumatisme thoraco-abdominal pénétrant ou haute vélocité", "Brûlures étendues / visage / main", "Torsion testiculaire suspectée",
      "Rétention aiguë d'urine douloureuse", "Hématurie abondante", "Corps étranger voies aériennes avec détresse",
      "Occlusion intestinale, hernie étranglée", "Plaie complexe ou main", "Traumatisme stable nécessitant imagerie",
      "Brûlure peu étendue avec avis spécialisé", "Douleur lombaire ou colique néphrétique stable", "Corps étranger digestif tranchant sans détresse",
      "Plaie simple hors main", "Hernie simple non douloureuse", "Traumatisme distal modéré", "Excoriations", "Soins locaux simples"
    ],
    "Gynécologie - Obstétrique": [
      "Accouchement imminent ou réalisé", "Eclampsie", "Rupture utérine", "Grossesse Extra utérine rompue",
      "Hémorragie du post-partum abondante", "Grossesse 3e trimestre avec haut risque (métrorragies, douleur, HTA...)",
      "Grossesse 1er-2e trimestre avec douleur/métrorragie", "Méno-métrorragies avec grossesse suspectée",
      "Problèmes de post-partum simples", "Allaitement + fièvre modérée", "Anomalies vulvo-vaginales simples", "Mastite simple"
    ],
    "Pédiatrie": [
      "Arrêt cardio-respiratoire pédiatrique", "Convulsions répétées", "Anémie décompensée", "Détresse respiratoire (SpO2<90%, cyanose)",
      "Fièvre (T>38,5°)", "Dyspnée avec sifflement", "Déshydratation sévère nourrisson", "Hypotension pédiatrique",
      "Paludisme grave", "Convulsions hyperthermiques intermittentes", "Diarrhée / vomissements modérés",
      "Pleurs incoercibles nécessitant bilan", "Troubles alimentaires nourrisson", "Ictère néonatal simple",
      "Bradycardie ou tachycardie bien tolérée", "Consultation bénigne (Très rare)"
    ]
  };

  useEffect(() => {
    const saved = localStorage.getItem('triage_draft');
    if (saved) {
      try { 
        setForm(JSON.parse(saved)); 
        toast.success("Brouillon récupéré automatiquement", { icon: '📝' });
      } catch (e) {}
    }

    // Récupérer le nom de l'agent connecté
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.full_name) {
          setOperatorFullName(decoded.full_name);
        } else {
          setOperatorFullName(decoded.sub || 'Agent SAMU');
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('triage_draft', JSON.stringify(form));
  }, [form]);

  // Auto-calcul de la catégorie d'âge
  useEffect(() => {
    if (form.patient_age !== '' && form.patient_age !== null) {
      const age = parseInt(form.patient_age);
      if (!isNaN(age)) {
        if (age > 12) setForm(prev => ({ ...prev, age_category: 'adult' }));
        else if (age >= 1 && age <= 12) setForm(prev => ({ ...prev, age_category: 'child' }));
        else if (age === 0) setForm(prev => ({ ...prev, age_category: 'infant' }));
      }
    }
  }, [form.patient_age]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!startTime && value.length > 0) setStartTime(Date.now());
    
    setForm(prev => {
      const isNumberField = ['estimated_resources', 'caller_age', 'patient_age', 'pas', 'fc', 'spo2', 'fr', 'gcs', 'pain_scale'].includes(name);
      const val = isNumberField ? (value === '' ? '' : parseInt(value)) : value;
      const newForm = { ...prev, [name]: val };
      if (name === 'medical_category') {
        newForm.specific_symptom = 'Aucun'; // Reset symptom when category changes
      }
      return newForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const dataToSend = { ...form };
    // Convertir les champs numériques vides en null pour Pydantic
    const numericFields = ['caller_age', 'patient_age', 'pas', 'fc', 'spo2', 'fr', 'gcs', 'pain_scale'];
    numericFields.forEach(field => {
      if (dataToSend[field] === '' || dataToSend[field] === undefined) dataToSend[field] = null;
    });
    if (!dataToSend.smur_number) dataToSend.smur_number = null;

    try {
      const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      const response = await api.post('/triage/evaluate', { ...dataToSend, duration_seconds: duration });
      setResult(response.data);
      localStorage.removeItem('triage_draft'); 
      setStartTime(null); 
      toast.success("Évaluation terminée avec succès !");
    } catch (err) {
      const msg = err.response?.data?.detail || "Erreur réseau: impossible de joindre le serveur de décision ESI.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getColorCode = (level) => {
    const map = { 1: 'Rouge', 2: 'Orange', 3: 'Jaune', 4: 'Vert', 5: 'Bleu' };
    return map[level] || 'Bleu';
  };

  const getColorClass = (code) => {
    const colors = {
      'Rouge': 'bg-red-600 border-red-700 text-white',
      'Orange': 'bg-orange-500 border-orange-600 text-white',
      'Jaune': 'bg-yellow-400 border-yellow-500 text-slate-900',
      'Vert': 'bg-emerald-500 border-emerald-600 text-white',
      'Bleu': 'bg-cyan-500 border-cyan-600 text-white'
    };
    return colors[code] || 'bg-slate-200 text-slate-800';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {result && (() => {
        const colorCode = getColorCode(result.esi_level);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl border-4 ${getColorClass(colorCode)} transform transition-all scale-100 animate-in zoom-in-95 duration-300`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-4xl font-black tracking-tight">Niveau ESI : {result.esi_level}</h3>
                <span className="text-3xl font-black uppercase tracking-widest opacity-90">{colorCode}</span>
              </div>
              <p className="text-xl font-medium opacity-95 leading-relaxed">{result.esi_explanation}</p>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => generateTiragePDF({ ...result, color_code: colorCode }, form, operatorFullName)}
                  className="w-full bg-white/90 hover:bg-white text-slate-800 font-bold py-3 px-6 rounded-xl transition-colors border border-white/50 text-base shadow-sm flex items-center justify-center gap-2"
                >
                  <FileDown className="h-5 w-5" />
                  Télécharger la Fiche PDF
                </button>
                <button 
                  onClick={() => {
                    setResult(null); 
                    setForm({
                      patient_identifier:'', smur_number:'', patient_age:'', symptoms_description:'', 
                      caller_name:'', caller_surname:'', caller_age:'', caller_sex:'', 
                      medical_category: 'Médecine Générale', specific_symptom: 'Aucun', 
                      age_category: 'adult', pas: '', fc: '', spo2: '', fr: '', gcs: 15, pain_scale: 0, estimated_resources: 0 
                    });
                    setStartTime(null);
                  }} 
                  className="w-full bg-white/20 hover:bg-white/30 text-current font-bold py-3 px-6 rounded-xl backdrop-blur-sm transition-colors border border-white/30 text-base shadow-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  Nouveau Triage
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <span className="bg-blue-100 text-blue-700 p-2 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5" />
            </span>
            Évaluation Médicale ESI de l'urgence
          </h2>
          <div className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Session : {operatorFullName}
          </div>
        </div>
        
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 border border-red-200 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Colonne GAUCHE : Identification et Contexte */}
          <div className="space-y-6">
            
            {/* Section Informations Appelant */}
            <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Identité de l'Appelant (Optionnel)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nom</label>
                  <input type="text" name="caller_name" value={form.caller_name} onChange={handleChange}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 text-sm" placeholder="..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Prénom</label>
                  <input type="text" name="caller_surname" value={form.caller_surname} onChange={handleChange}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 text-sm" placeholder="..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Âge</label>
                  <input type="number" name="caller_age" value={form.caller_age} onChange={handleChange} min="0" max="120"
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 text-sm" placeholder="Ans" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Sexe</label>
                  <select name="caller_sex" value={form.caller_sex} onChange={handleChange} className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 text-sm">
                    <option value="">Non précisé</option>
                    <option value="H">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section Patient & Situation */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Identifiant Patient *</label>
                  <input type="text" name="patient_identifier" value={form.patient_identifier} onChange={handleChange} required
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" placeholder="Nom, ID, ou Lieu..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Âge du Patient (Ans) *</label>
                  <input type="number" name="patient_age" value={form.patient_age} onChange={handleChange} required min="0" max="120"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" placeholder="Ex: 45 (0 pour Bébé)" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Numéro du SMUR</label>
                <input type="text" name="smur_number" value={form.smur_number} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" placeholder="Ex: Numero SMUR" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Motif de l'appel (Symptômes déclarés) *</label>
                <textarea name="symptoms_description" value={form.symptoms_description} onChange={handleChange} required rows="4"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" placeholder="Décrivez la raison de l'appel de manière concise..."></textarea>
              </div>
            </div>

          </div>

          {/* Colonne DROITE : Évaluation Clinique & Décision */}
          <div className="space-y-6">
            
            {/* Section Domaine Médical & Critères Spécifiques */}
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-4 shadow-sm">
              <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-2 border-b border-blue-100 pb-1">
                Anatomopathologie & Critères Majeurs
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Domaine Médical Concerné</label>
                  <select name="medical_category" value={form.medical_category} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 text-sm font-medium">
                    <option value="Médecine Générale">Médecine Générale</option>
                    <option value="Chirurgie">Chirurgie (Traumato, Uro...)</option>
                    <option value="Gynécologie - Obstétrique">Gynécologie - Obstétrique</option>
                    <option value="Pédiatrie">Pédiatrie</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Critères Majeurs (Auto-ESI)</label>
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrer..."
                      className="text-xs border-b border-blue-200 focus:border-blue-500 outline-hidden bg-transparent px-1 w-24 transition-all"
                    />
                  </div>
                  
                  <div className="max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, specific_symptom: 'Aucun' }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          form.specific_symptom === 'Aucun' 
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        Aucun
                      </button>
                      
                      {categories[form.medical_category === 'Chirurgie (Traumato, Uro...)' ? 'Chirurgie' : form.medical_category]
                        ?.filter(sym => sym.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(sym => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, specific_symptom: sym }));
                            if (!startTime) setStartTime(Date.now());
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border text-left leading-tight ${
                            form.specific_symptom === sym 
                            ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Constantes Vitales (Modulation ESI) */}
            <div className={`transition-all duration-500 ${form.specific_symptom !== 'Aucun' && form.specific_symptom !== '' ? 'opacity-40 grayscale pointer-events-none scale-95 origin-top' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Évaluation des Constantes (Modulation ESI)</h3>
                {form.specific_symptom !== 'Aucun' && form.specific_symptom !== '' && (
                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    ⚡ AUTOMATISÉ
                  </span>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie d'Âge *</label>
                  <select name="age_category" value={form.age_category} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-2 text-sm font-bold">
                    <option value="newborn">Nouveau-né (0-1 mois)</option>
                    <option value="infant">Nourrisson (1 mois - 1 an)</option>
                    <option value="child">Enfant (1 - 12 ans)</option>
                    <option value="adult">Adulte (&gt; 12 ans)</option>
                  </select>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Pouls (FC)</label>
                  <input type="number" name="fc" value={form.fc} onChange={handleChange} placeholder="bpm" className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold" />
                </div>
                
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Resp (FR)</label>
                  <input type="number" name="fr" value={form.fr} onChange={handleChange} placeholder="mvt/min" className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold" />
                </div>
                
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Tension (PAS)</label>
                  <input type="number" name="pas" value={form.pas} onChange={handleChange} placeholder="mmHg" className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold" />
                </div>
                
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">SpO2 (%)</label>
                  <input type="number" name="spo2" value={form.spo2} onChange={handleChange} placeholder="%" className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold" />
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Glasgow</label>
                  <input type="number" name="gcs" value={form.gcs} onChange={handleChange} min="3" max="15" placeholder="/15" className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold" />
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Douleur</label>
                  <input type="number" name="pain_scale" value={form.pain_scale} onChange={handleChange} min="0" max="10" placeholder="/10" className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold" />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Ressources Médicales Estimées *</label>
                  <select name="estimated_resources" value={form.estimated_resources} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-1.5 text-xs font-bold">
                    <option value={0}>Aucune ressource (0)</option>
                    <option value={1}>Une ressource (1)</option>
                    <option value={2}>Deux ressources ou plus (2+)</option>
                  </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white focus:ring-4 focus:ring-slate-300 font-black rounded-xl text-md px-5 py-4 text-center transition-all shadow-xl hover:shadow-2xl disabled:opacity-70 flex justify-center items-center gap-2 uppercase tracking-widest mt-2">
              {loading ? 'Traitement...' : 'Déterminer la Priorité ESI'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
