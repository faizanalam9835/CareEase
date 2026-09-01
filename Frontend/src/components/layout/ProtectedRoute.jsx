import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, LoadingState } from '../ui';
import { ROLE_LABELS } from '../../lib/navigation';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, hasRole, primaryRole } = useAuth();

  if (loading) return <LoadingState label="Checking your access" className="py-24" />;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <span className="rounded-full bg-amber-50 p-4 text-amber-500">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-lg font-semibold text-slate-900">You do not have access here</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          This page is limited to{' '}
          {allowedRoles.map((role) => ROLE_LABELS[role] || role).join(', ')}. You are signed in as{' '}
          <span className="font-medium text-slate-700">
            {ROLE_LABELS[primaryRole] || primaryRole}
          </span>
          .
        </p>
        <Link to="/app/dashboard" className="mt-6">
          <Button variant="outline" icon={ArrowLeft}>
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
