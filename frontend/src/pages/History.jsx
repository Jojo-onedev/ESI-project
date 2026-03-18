import { useState, useEffect } from 'react';
import api from '../api';

export default function History() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      const response = await api.get('/triage/history');
      setCases(response.data);
    } catch (err) {
      setError("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getColorClass = (level) => {
    switch (level) {
        case 1: return 'bg-red-50 border-red-500 text-red-900 border-l-[12px]';
        case 2: return 'bg-orange-50 border-orange-500 text-orange-900 border-l-[12px]';
        case 3: return 'bg-yellow-50 border-yellow-400 text-yellow-900 border-l-[12px]';
        case 4: return 'bg-emerald-50 border-emerald-500 text-emerald-900 border-l-[12px]';
        case 5: return 'bg-cyan-50 border-cyan-400 text-cyan-900 border-l-[12px]';
        default: return 'bg-slate-50 border-slate-500 text-slate-900 border-l-[12px]';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-black text-slate-800">Historique des Urgences</h2>
        <button onClick={fetchHistory} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 rounded-lg transition-colors flex items-center space-x-2">
          <span>Actualiser</span>
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">{error}</div>}
      
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">Chargement des données...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-slate-500 text-xl font-medium">Aucun historique d'appel d'urgence dans ce registre.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {cases.map((c) => (
            <div key={c.id} className={`p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center bg-white transition-all transform hover:-translate-y-1 ${getColorClass(c.esi_level)}`}>
              <div className="flex-1 pr-4">
                <div className="flex items-center space-x-4 mb-2">
                  <span className="font-black text-xl tracking-tight">{c.patient_identifier}</span>
                  <span className="text-sm font-semibold opacity-70 bg-black/5 px-2 py-1 rounded-md">{new Date(c.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p className="font-medium opacity-90 mb-4 bg-white/60 p-3 rounded-lg border border-black/5 italic">"{c.symptoms_description}"</p>
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
                  <span className="px-3 py-1.5 bg-white/70 shadow-sm rounded-md">Conscience: {c.consciousness}</span>
                  <span className="px-3 py-1.5 bg-white/70 shadow-sm rounded-md">Respiration: {c.breathing}</span>
                  <span className="px-3 py-1.5 bg-white/70 shadow-sm rounded-md">Saignement: {c.bleeding}</span>
                  <span className="px-3 py-1.5 bg-white/70 shadow-sm rounded-md border border-black/10">Ressources: {c.estimated_resources}</span>
                </div>
              </div>
              <div className="mt-6 md:mt-0 flex flex-col items-center md:items-end w-full md:w-auto p-4 bg-white/40 rounded-xl">
                <span className="text-sm uppercase font-black tracking-widest opacity-80 mb-1">Score ESI</span>
                <span className="text-6xl font-black drop-shadow-sm">{c.esi_level}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
