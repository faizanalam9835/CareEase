import { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Signed out');
    // React Router navigation - the old header called window.location.reload(),
    // which threw away the whole app to do what a redirect does.
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onToggleSidebar={() => setSidebarOpen((open) => !open)} onLogout={handleLogout} />

        {user?.mustChangePassword && (
          <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:px-6">
            <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>You are still using a temporary password.</span>
            <Link to="/app/profile" className="font-semibold underline underline-offset-2">
              Choose a new one
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
