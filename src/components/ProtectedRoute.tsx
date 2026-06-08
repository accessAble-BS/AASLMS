import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  hasFromPortalHandoff,
  redirectToPortalLogin,
  stripFromPortalParam,
  waitForSharedSession,
  wasSignedOutElsewhere,
} from '@aas/shared-core';
import { RouteLoading } from '@/components/RouteLoading';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [resolvingHandoff, setResolvingHandoff] = useState(false);
  const fromPortal = hasFromPortalHandoff(location.search);

  useEffect(() => {
    if (!session || !fromPortal) return;
    const nextSearch = stripFromPortalParam(location.search);
    if (nextSearch === location.search) return;
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [session, fromPortal, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (loading || session || !fromPortal || resolvingHandoff) return;

    setResolvingHandoff(true);
    void waitForSharedSession(() => supabase.auth.getSession()).then((recovered) => {
      setResolvingHandoff(false);
      if (!recovered) {
        redirectToPortalLogin(window.location.href);
      }
    });
  }, [loading, session, fromPortal, resolvingHandoff]);

  if (loading || resolvingHandoff) {
    return <RouteLoading label={fromPortal ? 'Opening your session…' : undefined} />;
  }

  if (!session) {
    if (fromPortal) {
      return <RouteLoading label="Opening your session…" />;
    }

    if (wasSignedOutElsewhere()) {
      return <Navigate to="/?signedOut=1" replace />;
    }

    redirectToPortalLogin(window.location.href);
    return <RouteLoading label="Redirecting to staff portal…" />;
  }

  return <>{children}</>;
}
