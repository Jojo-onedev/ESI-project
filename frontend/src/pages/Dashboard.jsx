import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';
import { ShieldX, Loader2, Users, PieChart as PieIcon, Activity, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/triage/stats');
        setStats(response.data);
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
        <h2 className="text-3xl font-black text-slate-800">Tableau de Bord Superviseur</h2>
        <p className="text-slate-500 font-medium mt-1">Vue consolidée et statistique du centre de tri ESI</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl font-bold flex items-center justify-center gap-3 h-48 shadow-sm">
          <ShieldX className="h-8 w-8 flex-shrink-0" />
          <span className="text-lg">{error}</span>
        </div>
      ) : loading ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Loader2 className="animate-spin h-12 w-12 text-slate-600 mb-4" />
          <p className="font-medium text-slate-500">Analyse des données en cours...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KPI 1: Total Patients */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center transition hover:-translate-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-500 uppercase tracking-wider text-center">Volume Total</h3>
              </div>
              <div className="text-7xl font-black text-blue-600 my-4 drop-shadow-sm">{stats.total_cases}</div>
              <p className="text-slate-400 font-medium bg-slate-50 px-4 py-1 rounded-full whitespace-nowrap text-sm">Depuis le début</p>
            </div>

            {/* KPI 2: Critical 24h */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center transition hover:-translate-y-1 border-b-red-500 border-b-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-red-500" />
                <h3 className="text-xl font-bold text-slate-500 uppercase tracking-wider text-center">Urgences Vitales (24h)</h3>
              </div>
              <div className="text-7xl font-black text-red-600 my-4 drop-shadow-sm">{stats.critical_24h}</div>
              <p className="text-red-600/60 font-medium bg-red-50 px-4 py-1 rounded-full whitespace-nowrap text-sm">Niveaux ESI 1 & 2 cumulés</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-96 flex flex-col transition hover:-translate-y-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PieIcon className="h-5 w-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-500 uppercase tracking-wider">Répartition de la Gravité (ESI)</h3>
            </div>
            <div className="flex-grow w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
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
        </div>
      ) : null}
    </div>
  );
}
