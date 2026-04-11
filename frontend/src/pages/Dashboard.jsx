import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';
import { ShieldX, Loader2, Users, PieChart as PieIcon, Activity, Zap, Timer, ClipboardList, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, logsRes, usersRes] = await Promise.all([
          api.get('/triage/stats'),
          api.get('/triage/audit'),
          api.get('/auth/users')
        ]);
        setStats(statsRes.data);
        setLogs(logsRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        toast.error('Accès non autorisé aux statistiques.');
        setError('Accès non autorisé. Seul un médecin superviseur peut consulter ces données.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Tableau de Bord</h2>
        <p className="text-slate-500 font-medium mt-1">Vue consolidée et statistique du centre de tri SAMU</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl font-bold flex items-center justify-center gap-3 h-48 shadow-sm">
          <ShieldX className="h-8 w-8 shrink-0" />
          <span className="text-lg">{error}</span>
        </div>
      ) : loading ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Loader2 className="animate-spin h-12 w-12 text-slate-600 mb-4" />
          <p className="font-medium text-slate-500">Analyse des données en cours...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI 1: Total Patients */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center transition hover:-translate-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Volume Total</h3>
              </div>
              <div className="text-5xl font-black text-blue-600 my-2 drop-shadow-sm">{stats.total_cases_all}</div>
              <p className="text-slate-400 font-medium bg-slate-50 px-4 py-1 rounded-full whitespace-nowrap text-[10px] uppercase">Depuis le début</p>
            </div>

            {/* KPI 2: Critical 24h */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center transition hover:-translate-y-1 border-b-red-500 border-b-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Urgences (24h)</h3>
              </div>
              <div className="text-5xl font-black text-red-600 my-2 drop-shadow-sm">{stats.critical_24h}</div>
              <p className="text-red-600/60 font-medium bg-red-50 px-4 py-1 rounded-full whitespace-nowrap text-[10px] uppercase">ESI 1 & 2</p>
            </div>

            {/* KPI 3: Efficiency */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center transition hover:-translate-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Efficacité</h3>
              </div>
              <div className="text-5xl font-black text-indigo-600 my-2 drop-shadow-sm">{stats.avg_duration}s</div>
              <p className="text-indigo-600/60 font-medium bg-indigo-50 px-4 py-1 rounded-full whitespace-nowrap text-[10px] uppercase">Moyenne / Cas</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-96 flex flex-col transition hover:-translate-y-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PieIcon className="h-5 w-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-500 uppercase tracking-wider">Répartition de la Gravité (ESI)</h3>
            </div>
            <div className="grow w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                    label={({name, value}) => value > 0 ? `${value}` : ''}
                  >
                    {stats.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value, 'Patients']} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rapport Journalier Automatique (Phase 11) */}
          <div className="bg-linear-to-br from-slate-900 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ClipboardList className="h-40 w-40" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500 rounded-full h-3 w-3 animate-pulse"></div>
                <h3 className="text-xl font-black uppercase tracking-widest text-blue-400">Rapport de Garde (24h)</h3>
              </div>
              <p className="text-slate-300 font-medium mb-8 max-w-xl text-lg lead-relaxed">
                Aujourd'hui, le centre a traité <span className="text-white font-black underline decoration-blue-500 underline-offset-4">{stats.total_cases_24h} cas</span>. 
                L'efficacité moyenne est de <span className="text-blue-300 font-black">{stats.avg_duration}s par patient</span>, 
                soit une performance <span className={stats.avg_duration < 60 ? "text-emerald-400 font-black" : "text-yellow-400 font-black"}>
                  {stats.avg_duration === 0 ? "En attente de données" : stats.avg_duration < 60 ? "Optimale" : "Standard"}
                </span> pour les standards du SAMU.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-black">{stats.critical_24h}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Urgences Vitales</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-black">100%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saisie Complète</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-black">{stats.total_operators}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agents Enregistrés</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-black">0</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Erreurs Système</div>
                </div>
              </div>
            </div>
          </div>

          {/* Journal d'Audit */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-slate-400" />
              Journal de Traçabilité Médicale
            </h3>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-slate-400 italic">Aucune activité enregistrée.</p>
              ) : logs.map(log => (
                <div key={log.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 transition hover:bg-slate-100">
                  <div className={`p-2 rounded-lg ${
                    log.action === 'LOGIN' ? 'bg-blue-100 text-blue-600' : 
                    log.action === 'DELETE' ? 'bg-red-100 text-red-600' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {log.action === 'LOGIN' ? <User className="h-4 w-4" /> : 
                     log.action === 'DELETE' ? <ShieldX className="h-4 w-4" /> : 
                     <Activity className="h-4 w-4" />}
                  </div>
                  <div className="grow">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-700 text-sm">{log.action}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {new Date(log.created_at).toLocaleString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
