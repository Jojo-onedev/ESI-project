import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { generateTiragePDF } from '../utils/generatePDF';
import {
  RefreshCw, Trash2, FileDown, AlertTriangle, ClipboardList,
  Loader2, ArrowDownUp, Filter, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const ESI_COLORS = {
  1: { bar: 'border-red-500',    bg: 'bg-red-50',     badge: 'bg-red-600 text-white',    text: 'text-red-800',     label: 'Rouge' },
  2: { bar: 'border-orange-500', bg: 'bg-orange-50',  badge: 'bg-orange-500 text-white', text: 'text-orange-800',  label: 'Orange' },
  3: { bar: 'border-yellow-400', bg: 'bg-yellow-50',  badge: 'bg-yellow-400 text-slate-900', text: 'text-yellow-800',  label: 'Jaune' },
  4: { bar: 'border-emerald-500',bg: 'bg-emerald-50', badge: 'bg-emerald-500 text-white',text: 'text-emerald-800', label: 'Vert' },
  5: { bar: 'border-cyan-400',   bg: 'bg-cyan-50',    badge: 'bg-cyan-500 text-white',   text: 'text-cyan-800',    label: 'Bleu' },
};

export default function History() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');
  const [filterLevel, setFilterLevel] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | 'all' | <case_id>

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { 
        sort_by: sortBy, 
        order, 
        filter_level: filterLevel,
        search: searchTerm || undefined 
      };
      const response = await api.get('/triage/history', { params });
      setCases(response.data);
    } catch {
      toast.error("Accès refusé ou impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, [sortBy, order, filterLevel, searchTerm]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDeleteCase = async (id) => {
    try {
      await api.delete(`/triage/${id}`);
      setCases(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
      toast.success("Cas supprimé avec succès");
    } catch { toast.error("Erreur lors de la suppression."); }
  };

  const handleDeleteAll = async () => {
    try {
      await api.delete('/triage/all/clear');
      setCases([]);
      setDeleteConfirm(null);
      toast.success("Historique vidé avec succès");
    } catch { toast.error("Erreur lors de la suppression de l'historique."); }
  };

  const handleExportCase = (c) => {
    const colors = ESI_COLORS[c.esi_level];
    generateTiragePDF(
      { esi_level: c.esi_level, esi_explanation: c.esi_explanation, color_code: colors.label },
      { patient_identifier: c.patient_identifier, symptoms_description: c.symptoms_description, consciousness: c.consciousness, breathing: c.breathing, bleeding: c.bleeding, estimated_resources: c.estimated_resources }
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Modale de confirmation suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="flex justify-center mb-4"><AlertTriangle className="h-12 w-12 text-orange-400" /></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Confirmer la suppression</h3>
            <p className="text-slate-600 mb-6 font-medium">
              {deleteConfirm === 'all'
                ? `Vous allez supprimer définitivement tous les ${cases.length} cas de l'historique.`
                : `Vous allez supprimer le cas #${deleteConfirm} de manière irréversible.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition">Annuler</button>
              <button
                onClick={() => deleteConfirm === 'all' ? handleDeleteAll() : handleDeleteCase(deleteConfirm)}
                className="cursor-pointer flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête et contrôles */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Historique des Urgences</h2>
            <p className="text-slate-400 text-sm font-medium mt-0.5">{cases.length} cas enregistrés</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={fetchHistory} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition text-sm">
              <RefreshCw className="cursor-pointer h-4 w-4" /> Actualiser
            </button>
            {cases.length > 0 && (
              <button onClick={() => setDeleteConfirm('all')} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-xl transition text-sm border border-red-200">
                <Trash2 className="cursor-pointer h-4 w-4" /> Vider l'historique
              </button>
            )}
          </div>
        </div>

        {/* Barre de filtres et de tri */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase">Trier par</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 font-medium">
              <option value="date">Date</option>
              <option value="esi_level">Niveau ESI</option>
            </select>
            <select value={order} onChange={e => setOrder(e.target.value)} className="text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 font-medium">
              <option value="desc">↓ Décroissant</option>
              <option value="asc">↑ Croissant</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase">Filtrer</label>
            <select value={filterLevel} onChange={e => setFilterLevel(parseInt(e.target.value))} className="text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 font-medium">
              <option value={0}>Tous les niveaux</option>
              <option value={1}>🔴 ESI 1 - Critique</option>
              <option value={2}>🟠 ESI 2 - Urgent</option>
              <option value={3}>🟡 ESI 3 - Modéré</option>
              <option value={4}>🟢 ESI 4 - Faible</option>
              <option value={5}>🔵 ESI 5 - Minimal</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-grow md:max-w-xs">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Chercher un patient..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-medium">{error}</div>}

      {/* Liste des cas */}
      {loading ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Loader2 className="animate-spin h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-500 font-medium">Chargement de l'historique...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 shadow-sm">
          <ClipboardList className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">Aucun cas enregistré pour ces critères.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map(c => {
            const col = ESI_COLORS[c.esi_level] || ESI_COLORS[5];
            return (
              <div key={c.id} className={`bg-white rounded-2xl shadow-sm border border-l-8 ${col.bar} overflow-hidden transition hover:shadow-md`}>
                <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  
                  {/* Badge ESI */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${col.badge} flex flex-col items-center justify-center shadow-sm`}>
                    <span className="text-xs font-bold opacity-80 uppercase">ESI</span>
                    <span className="text-3xl font-black leading-none">{c.esi_level}</span>
                  </div>

                  {/* Infos patient */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span className="font-black text-slate-800 text-lg truncate">{c.patient_identifier}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{col.label}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(c.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm italic truncate mb-2">"{c.symptoms_description}"</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Conscience', val: c.consciousness },
                        { label: 'Respiration', val: c.breathing },
                        { label: 'Saignement', val: c.bleeding },
                        { label: 'Ressources', val: `${c.estimated_resources}` },
                      ].map(({ label, val }) => (
                        <span key={label} className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                          {label}: <span className="font-bold text-slate-800">{val}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleExportCase(c)}
                      title="Exporter en PDF"
                      className="flex items-center gap-1.5 text-sm font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl transition border border-blue-200"
                    >
                      <FileDown className="cursor-pointer h-4 w-4" /> PDF
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      title="Supprimer ce cas"
                      className="flex items-center gap-1.5 text-sm font-bold bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl transition border border-red-200"
                    >
                      <Trash2 className="cursor-pointer h-4 w-4" /> Suppr.
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
