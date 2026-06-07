import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasOAuthCallbackParams } from '@/lib/auth-callback';

export function OAuthCallbackRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/auth/callback') return;
    if (!hasOAuthCallbackParams(location.search)) return;

    navigate(`/auth/callback${location.search}${location.hash}`, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
