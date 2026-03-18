import { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);
      
      const response = await api.post('/auth/login', form);
      const token = response.data.access_token;
      
      // Stockage local
      localStorage.setItem('token', token);
      
      // Décodage du JWT pour stocker le rôle
      const decoded = jwtDecode(token);
      localStorage.setItem('role', decoded.role);
      
      // Redirection dynamique basée sur le rôle
      if (decoded.role === 'supervisor') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/triage';
      }
    } catch {
      setError('Accès refusé. Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-10 rounded-3xl shadow-2xl bg-white border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">Portail SAMU</h2>
        <p className="text-slate-500 mt-2 font-medium">Authentification Opérateur & Médecin</p>
      </div>
      
      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">{error}</div>}
      
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">Identifiant (Code Opérateur)</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 font-medium transition" 
            placeholder="Ex: demo_op ou admin_samu" />
        </div>
        <div className="pb-3">
          <label className="block text-slate-700 text-sm font-bold mb-2">Mot de passe secret</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 font-medium transition"
            placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="w-full text-white bg-slate-900 hover:bg-black focus:ring-4 focus:ring-slate-300 font-bold rounded-xl text-lg px-5 py-4 text-center transition shadow-lg disabled:opacity-70">
          {loading ? 'Connexion sécurisée en cours...' : 'Accéder au système'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500 text-center">
        Identifiants de présentation :<br/>
        <span className="font-mono bg-slate-100 px-2 py-1 rounded">demo_op / samu123</span> (Opérateur)<br/>
        <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin_samu / admin123</span> (Superviseur)
      </div>
    </div>
  );
}
