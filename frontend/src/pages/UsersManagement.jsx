import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, ShieldCheck, UserCog, Loader2, ShieldPlus, Eye, EyeOff } from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
   const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator', full_name: '', specialty: 'Infirmier Major' });
  const [showPassword, setShowPassword] = useState(false);
  
  const specialties = [
    "Médecin Urgentiste",
    "Médecin Superviseur",
    "Infirmier",
    "Régulateur Médical",
    "Ambulancier / Secouriste",
  ];

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', newUser);
      toast.success('Utilisateur créé avec succès !');
      setShowModal(false);
      setNewUser({ username: '', password: '', role: 'operator', full_name: '', specialty: 'Infirmier Major' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création.');
    }
  };

  const handlePromote = async (userId, currentRole) => {
    const newRole = currentRole === 'supervisor' ? 'operator' : 'supervisor';
    try {
      await api.put(`/auth/users/${userId}`, { role: newRole });
      toast.success(`Utilisateur ${newRole === 'supervisor' ? 'promu' : 'rétrogradé'} !`);
      fetchUsers();
    } catch (err) {
      toast.error('Erreur lors du changement de rôle.');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      toast.success('Utilisateur supprimé.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 font-outfit">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Gestion des Équipes</h2>
          <p className="text-slate-500 font-medium mt-1">Gérez les accès et les privilèges du personnel médical</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition shadow-xl"
        >
          <UserPlus className="h-5 w-5" />
          Ajouter un Opérateur
        </button>
      </div>

      <div className="bg-white rounded-4xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Spécialité</th>
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Privilèges</th>
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/30 transition">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                      {user.username.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{user.full_name || user.username}</div>
                      <div className="text-xs text-slate-400">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-medium text-slate-600">{user.specialty || 'Non assigné'}</span>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'supervisor' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {user.role === 'supervisor' ? <ShieldCheck className="h-3 w-3" /> : <UserCog className="h-3 w-3" />}
                    {user.role === 'supervisor' ? 'Superviseur' : 'Opérateur'}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handlePromote(user.id, user.role)}
                      title={user.role === 'supervisor' ? 'Rétrograder en Opérateur' : 'Promouvoir en Superviseur'}
                      className={`p-2 rounded-lg transition ${
                        user.role === 'supervisor' ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldPlus className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-red-400 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout Utilisateur */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-3xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Nouveau Profil</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Enregistrez un nouvel agent sur le portail SAMU.</p>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifiant Unique</label>
                <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition" placeholder="ex: j.dupont" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Mot de passe provisoire</label>
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={newUser.password} 
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 pr-12 font-bold focus:border-blue-500 outline-none transition" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
                <input type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition" placeholder="Dr. Jean Dupont" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Spécialité Médicale</label>
                <select 
                  value={newUser.specialty} 
                  onChange={e => setNewUser({...newUser, specialty: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition appearance-none cursor-pointer"
                >
                  {specialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition">Annuler</button>
                <button type="submit" className="flex-2 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition">Créer l'accès</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
