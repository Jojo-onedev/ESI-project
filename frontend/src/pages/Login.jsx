import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, User, Info, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
      
      localStorage.setItem('token', token);
      const decoded = jwtDecode(token);
      localStorage.setItem('role', decoded.role);
      
      toast.success(`Bienvenue, ${username} !`);
      
      if (decoded.role === 'supervisor') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/triage';
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Identifiants invalides.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex items-center justify-center p-4 md:p-6 overflow-hidden font-outfit selection:bg-blue-100">
      <div className="max-w-5xl w-full bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row h-full max-h-[640px] border border-white/50 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Panneau Gauche : Visuel & Slogan (Version Optimisée) */}
        <div className="md:w-[45%] bg-linear-to-br from-blue-600 via-blue-700 to-indigo-950 relative overflow-hidden flex flex-col justify-center p-10 md:p-14 text-white">
          {/* Éléments de fond dynamiques */}
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-80 h-80 bg-white rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[150px]"></div>
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col gap-6">
              <div className="bg-white/10 w-fit p-4 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl hover:scale-105 transition-transform duration-500 group">
                <img src="/samu-logo.png" alt="SAMU Logo" className="h-40 w-40 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] filter contrast-125 hover:brightness-110 transition-all cursor-default" />
              </div>
              
              <div className="inline-flex items-center gap-2 bg-blue-400/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping"></span>
                Système Gouvernemental
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight text-transparent bg-clip-text bg-linear-to-b from-white to-blue-100">
                BIENVENUE <br />
                <span className="text-blue-300 italic font-medium text-2xl md:text-3xl tracking-normal block mt-1">SAMU BURKINA FASO</span>
              </h1>
              
              <div className="h-1 w-20 bg-linear-to-r from-blue-400 to-transparent rounded-full shadow-lg shadow-blue-500/50"></div>
              
              <p className="text-blue-50/80 text-sm md:text-base font-medium max-w-sm leading-relaxed">
                "Urgences Médicales : <span className="text-white font-bold">Chaque seconde compte.</span>" <br />
                La précision du triage au service de la vie.
              </p>
            </div>
            
            <div className="pt-2 flex items-center gap-4 text-[10px] font-black text-blue-300/60 uppercase tracking-widest">
              <div className="h-px grow bg-white/10"></div>
              <span>Portail de Régulation</span>
              <div className="h-px grow bg-white/10"></div>
            </div>
          </div>
        </div>

        {/* Panneau Droit : Formulaire (Version Optimisée) */}
        <div className="md:w-[55%] p-10 md:p-14 flex flex-col justify-center bg-white relative">
          <div className="mb-10 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center md:text-left">Identifiez-vous</h2>
            <p className="text-slate-400 font-medium text-sm text-center md:text-left">Accédez à votre console de triage sécurisée</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nom d'utilisateur</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors duration-300">
                   <User className="h-5 w-5" />
                </div>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  required
                  placeholder="Ex: demo_op"
                  className="w-full bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-2xl focus:ring-0 focus:border-blue-500 block p-4 pl-12 font-bold transition-all placeholder:text-slate-300 shadow-sm outline-none" 
                />
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mt-2 mb-2 block">Mot De Passe</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors duration-300">
                   <Lock className="h-5 w-5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 text-slate-900 rounded-[1.25rem] p-4 pl-14 pr-12 font-bold focus:border-blue-500 focus:bg-white outline-none transition-all duration-300 shadow-sm hover:border-slate-200"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-all duration-300 z-20"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="cursor-pointer w-full mt-4 relative group overflow-hidden bg-slate-900 text-white font-black rounded-2xl text-lg px-5 py-5 text-center transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Connexion en cours...' : 'Accéder au Portail'}
                {!loading && <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
              </span>
              <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>

          {/* Badge Sécurisé */}
          <div className="mt-8 flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 py-2 px-4 rounded-full w-fit mx-auto border border-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            SYSTÈME SÉCURISÉ & CRYPTÉ
          </div>

          {/* Support Info */}
          <div className="mt-2 pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-4">Besoin d'aide ?</p>
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-medium bg-slate-50 p-3 rounded-xl">
              <Info className="h-3 w-3" />
              <span>Contactez l'administrateur du centre pour récupérer vos accès.</span>
            </div>
            
            <div className="mt-6 flex justify-center gap-4">
              <div className="text-[10px] p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">Demo OP: <span className="font-black text-slate-800">samu123</span></div>
              <div className="text-[10px] p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">Admin: <span className="font-black text-slate-800">admin123</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
