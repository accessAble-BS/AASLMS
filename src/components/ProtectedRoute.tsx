import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RouteLoading } from '@/components/RouteLoading';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoading />;
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
