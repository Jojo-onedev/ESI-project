import { useState, useEffect } from 'react';
import api from '../api';
import { User, Shield, Briefcase, Calendar, Star, Timer, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ full_name: '', specialty: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setForm({ 
        full_name: response.data.full_name || '', 
        specialty: response.data.specialty || '' 
      });
    } catch (err) {
      toast.error("Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/auth/me', form);
      setUser(response.data);
      setEditMode(false);
      toast.success("Profil mis à jour !");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Chargement de votre profil médical...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Profil */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-slate-900 to-blue-900"></div>
        <div className="px-8 pb-8 -mt-12">
          <div className="flex flex-col md:flex-row items-end gap-6 mb-6">
            <div className="h-32 w-32 rounded-3xl bg-white p-2 shadow-xl border-4 border-white">
              <div className="h-full w-full rounded-2xl bg-slate-100 flex items-center justify-center">
                <User className="h-16 w-16 text-slate-400" />
              </div>
            </div>
            <div className="flex-grow pb-2">
              <h1 className="text-3xl font-black text-slate-800">
                {user.full_name || user.username}
              </h1>
              <p className="text-slate-500 font-bold flex items-center gap-2 mt-1 uppercase tracking-wider text-sm">
                <Shield className={`h-4 w-4 ${user.role === 'supervisor' ? 'text-blue-600' : 'text-slate-400'}`} />
                {user.role === 'supervisor' ? 'Médecin Superviseur' : 'Opérateur de Tri'}
                {user.specialty && <span className="text-slate-300">•</span>}
                {user.specialty && <span className="text-blue-600">{user.specialty}</span>}
              </p>
            </div>
            <button 
              onClick={() => setEditMode(!editMode)}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition shadow-sm mb-2"
            >
              {editMode ? 'Annuler' : 'Modifier le profil'}
            </button>
          </div>

          {editMode ? (
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  value={form.full_name} 
                  onChange={e => setForm({...form, full_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  placeholder="Ex: Dr. Moussa Traoré"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Spécialité / Grade</label>
                <input 
                  type="text" 
                  value={form.specialty} 
                  onChange={e => setForm({...form, specialty: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  placeholder="Ex: Infirmier Major, Urgentiste..."
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Sauvegarder les modifications'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Briefcase className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Identifiant</p>
                  <p className="font-bold text-slate-700">{user.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600"><Calendar className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Type de compte</p>
                  <p className="font-bold text-slate-700 capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><CheckCircle className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Statut</p>
                  <p className="font-bold text-emerald-600">Actif & Vérifié</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges & Mérite (Ludique pour le mémoire) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Médailles de Service
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 w-24">
              <div className="text-3xl mb-1">⚡</div>
              <span className="text-[10px] font-black uppercase text-slate-500 text-center">Triage Rapide</span>
            </div>
            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 w-24 grayscale opacity-50">
              <div className="text-3xl mb-1">🏆</div>
              <span className="text-[10px] font-black uppercase text-slate-500 text-center">100 cas</span>
            </div>
            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 w-24">
              <div className="text-3xl mb-1">🛡️</div>
              <span className="text-[10px] font-black uppercase text-slate-500 text-center">Sécurisé</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl text-white">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Performances Personnelles
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/20">
              <span className="font-medium opacity-80">Rôle validé</span>
              <span className="font-bold">{user.role === 'supervisor' ? 'Soutien Médical' : 'Première Ligne'}</span>
            </div>
            <p className="text-sm opacity-80 italic">
              "En tant qu'utilisateur certifié du système ESI, vos actions sont journalisées pour garantir la traçabilité médicale."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
