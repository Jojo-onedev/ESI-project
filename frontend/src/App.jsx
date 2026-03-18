import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TriageForm from './pages/TriageForm';
import History from './pages/History';
import Dashboard from './pages/Dashboard';

// Composant pour protéger les routes Superviseur
const RequireSupervisor = ({ children }) => {
  const role = localStorage.getItem('role');
  if (role !== 'supervisor') {
    return <Navigate to="/triage" replace />;
  }
  return children;
};

// Sécurité pour vérifier si on est connecté tout court
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {token && (
          <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-10 select-none">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-black tracking-tight text-blue-500">SAMU</span>
                <span className="text-xl font-bold text-slate-200 uppercase tracking-widest border-l-2 border-slate-700 pl-3">Triage</span>
                {role === 'supervisor' ? (
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1 font-bold ml-2 rounded-full uppercase tracking-wide shadow-sm">Médecin Superviseur</span>
                ) : (
                  <span className="bg-slate-700 text-slate-300 text-xs px-3 py-1 font-bold ml-2 rounded-full uppercase tracking-wide">Opérateur</span>
                )}
              </div>
              
              <nav className="flex flex-wrap justify-center gap-2 md:gap-6 text-sm font-semibold items-center">
                <a href="/triage" className="hover:text-blue-400 transition bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg">Faire un Appel</a>
                
                {role === 'supervisor' && (
                  <>
                    <a href="/historique" className="hover:text-blue-400 transition bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg">Historique global</a>
                    <a href="/dashboard" className="hover:text-blue-400 transition bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg">Statistiques</a>
                  </>
                )}
                
                <button 
                  onClick={() => { localStorage.clear(); window.location.href='/login' }} 
                  className="text-red-400 hover:text-white hover:bg-red-500 transition px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 ml-2"
                >
                  Déconnexion
                </button>
              </nav>
            </div>
          </header>
        )}
        
        <main className="flex-grow p-4 md:p-6 pb-20">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/triage" element={
              <RequireAuth><TriageForm /></RequireAuth>
            } />
            
            <Route path="/historique" element={
              <RequireAuth>
                <RequireSupervisor><History /></RequireSupervisor>
              </RequireAuth>
            } />
            
            <Route path="/dashboard" element={
              <RequireAuth>
                <RequireSupervisor><Dashboard /></RequireSupervisor>
              </RequireAuth>
            } />
            
            <Route path="*" element={<Navigate to={token ? "/triage" : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
