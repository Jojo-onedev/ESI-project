import { useState, useEffect } from 'react';
import api from '../api';
import { generateTiragePDF } from '../utils/generatePDF';
import { FileDown, UserPlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TriageForm() {
  const [form, setForm] = useState({
    patient_identifier: '',
    symptoms_description: '',
    consciousness: 'Conscient',
    breathing: 'Normale',
    bleeding: 'Aucun',
    estimated_resources: 0
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cache local
  useEffect(() => {
    const saved = localStorage.getItem('triage_draft');
    if (saved) {
      try { 
        setForm(JSON.parse(saved)); 
        toast.success("Brouillon récupéré automatiquement", { icon: '📝' });
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('triage_draft', JSON.stringify(form));
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'estimated_resources' ? parseInt(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/triage/evaluate', form);
      setResult(response.data);
      localStorage.removeItem('triage_draft'); 
      toast.success("Évaluation terminée avec succès !");
    } catch (err) {
      const msg = err.response?.data?.detail || "Erreur réseau: impossible de joindre le serveur de décision ESI.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Dérive le code couleur à partir du niveau ESI (le backend ne le renvoie pas)
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
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Résultat - Affichage en mode Popup (Modal) */}
      {result && (() => {
        const colorCode = getColorCode(result.esi_level);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl border-4 ${getColorClass(colorCode)} transform transition-all scale-100 animate-in zoom-in-95 duration-300`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-4xl font-black tracking-tight">Niveau ESI : {result.esi_level}</h3>
                <span className="text-3xl font-black uppercase tracking-widest opacity-90">{colorCode}</span>
              </div>
              <p className="text-xl font-medium opacity-95 leading-relaxed">{result.esi_explanation}</p>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => generateTiragePDF({ ...result, color_code: colorCode }, form)}
                  className="w-full bg-white/90 hover:bg-white text-slate-800 font-bold py-3 px-6 rounded-xl transition-colors border border-white/50 text-base shadow-sm flex items-center justify-center gap-2"
                >
                  <FileDown className="h-5 w-5" />
                  Télécharger la Fiche PDF
                </button>
                <button 
                  onClick={() => {
                    setResult(null); 
                    setForm({...form, patient_identifier:'', symptoms_description:'', consciousness:'Conscient', breathing:'Normale', bleeding:'Aucun', estimated_resources:0 });
                  }} 
                  className="w-full bg-white/20 hover:bg-white/30 text-current font-bold py-3 px-6 rounded-xl backdrop-blur-sm transition-colors border border-white/30 text-base shadow-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  Commencer un nouveau patient
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="bg-blue-100 text-blue-700 p-2 rounded-lg mr-3">
            <AlertTriangle className="h-6 w-6" />
          </span>
          Évaluation Médicale Initiale
        </h2>
        
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Identifiant Patient (Nom/Localisation)</label>
              <input type="text" name="patient_identifier" value={form.patient_identifier} onChange={handleChange} required
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3" placeholder="Ex: Homme 40 ans, Avenue Kwame Nkrumah..." />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Symptômes Déclarés</label>
              <textarea name="symptoms_description" value={form.symptoms_description} onChange={handleChange} required rows="2"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3" placeholder="Décrivez la raison de l'appel brièvement..."></textarea>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">État de conscience</label>
              <select name="consciousness" value={form.consciousness} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                <option>Conscient</option>
                <option className="text-red-600 font-bold">Inconscient</option>
              </select>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Respiration</label>
              <select name="breathing" value={form.breathing} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                <option>Normale</option>
                <option className="text-orange-600 font-bold">Difficile</option>
                <option className="text-red-600 font-bold">Absente</option>
              </select>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Saignement / Hémorragie</label>
              <select name="bleeding" value={form.bleeding} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                <option>Aucun</option>
                <option>Léger</option>
                <option className="text-orange-600 font-bold">Abondant</option>
              </select>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ressources Médicales (Estimation)</label>
              <select name="estimated_resources" value={form.estimated_resources} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                <option value={0}>0: Aucune ressource technique</option>
                <option value={1}>1: Une seule (ex: Radio, ou Sutures)</option>
                <option value={2}>2+: Multiples (ex: Labo + Radio + IV)</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white focus:ring-4 focus:ring-slate-300 font-bold rounded-xl text-lg px-5 py-4 text-center transition-all shadow hover:shadow-lg disabled:opacity-70">
            {loading ? 'Calcul ESI en cours...' : 'CONFIRMER L\'ÉVALUATION'}
          </button>
        </form>
      </div>
    </div>
  );
}
